/**
 * O PAYLOAD DA NFC-e — do retrato do banco para o JSON da Focus.
 *
 * Função pura, sem rede e sem banco: entra o que `fiscal_document_payload()`
 * devolveu, sai o corpo do POST. É o pedaço mais fácil de errar de toda a
 * emissão e o único que dá para conferir lendo — por isso vive separado da
 * função que faz a chamada.
 *
 * O QUE ELE NÃO FAZ: escolher código fiscal. NCM, CFOP e CSOSN já chegam
 * resolvidos do banco, com a herança do padrão do negócio aplicada lá
 * (`fiscal_document_payload`). Repetir a regra aqui criaria uma segunda
 * implementação dela, e no dia em que divergissem a tela mostraria um NCM e a
 * nota sairia com outro.
 */

export interface PayloadItem {
  number: number;
  code: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  ncm: string | null;
  cest: string | null;
  cfop: string | null;
  icms_code: string | null;
  origin: number | null;
  unit: string;
  tax_unit: string;
  gtin: string | null;
}

export interface DocumentPayload {
  document: { id: string; reference: string; model: string; environment: string; series: number; attempts: number };
  emitter: { tax_id: string | null; legal_name: string | null; state_code: string | null; tax_regime: number | null };
  sale: {
    id: string;
    sold_at: string;
    total: number;
    payment_method: string | null;
    customer_document: string | null;
    customer_name: string | null;
  };
  items: PayloadItem[];
}

/**
 * A forma de pagamento no vocabulário da SEFAZ (o campo `tPag`).
 *
 * `17` é o Pix dinâmico. Ele não existia quando a NFC-e nasceu, e uma venda
 * por Pix declarada como "dinheiro" é divergência entre a nota e o extrato —
 * exatamente o que o contador cruza no fim do mês.
 */
const PAYMENT: Record<string, string> = {
  cash: "01",
  credit: "03",
  debit: "04",
  pix: "17",
};

/** Forma desconhecida cai em "outros" em vez de derrubar a emissão. */
const PAYMENT_FALLBACK = "99";

export class PayloadError extends Error {}

/**
 * Monta o corpo. Lança `PayloadError` no que a SEFAZ recusaria de qualquer
 * jeito — falhar aqui é barato e o motivo fica legível na tela; falhar lá é
 * uma rejeição com código numérico que ninguém no balcão entende.
 */
export function buildNfce(p: DocumentPayload): Record<string, unknown> {
  if (!p.emitter.tax_id) {
    throw new PayloadError("O negócio ainda não tem CNPJ no cadastro fiscal.");
  }
  if (!p.items.length) {
    throw new PayloadError("A venda não tem nenhuma mercadoria — serviço sai em NFS-e.");
  }

  const semNcm = p.items.filter((i) => !i.ncm).map((i) => i.description);
  if (semNcm.length) {
    throw new PayloadError(
      `Sem NCM: ${semNcm.slice(0, 3).join(", ")}. Defina no produto ou no padrão do negócio.`,
    );
  }

  const semCfop = p.items.filter((i) => !i.cfop);
  if (semCfop.length) {
    throw new PayloadError("Sem CFOP padrão no cadastro fiscal do negócio.");
  }

  const semIcms = p.items.filter((i) => !i.icms_code);
  if (semIcms.length) {
    throw new PayloadError(
      "Sem situação tributária (CSOSN/CST). Seu contador define esse código.",
    );
  }

  /**
   * A NFC-e não pode ser emitida contra CNPJ desde 04/05/2026 (Ajuste SINIEF
   * 43/2025) — venda para pessoa jurídica exige NF-e modelo 55. A SEFAZ
   * rejeitaria; recusar aqui explica o que fazer em vez de devolver um código.
   */
  const doc = p.sale.customer_document ?? "";
  if (doc.length === 14) {
    throw new PayloadError(
      "Venda para CNPJ não sai em NFC-e desde maio de 2026 — precisa de NF-e modelo 55.",
    );
  }

  const body: Record<string, unknown> = {
    cnpj_emitente: p.emitter.tax_id,
    data_emissao: new Date(p.sale.sold_at).toISOString(),

    // "1" — operação presencial. É o balcão; qualquer outro valor descreveria
    // uma venda que este portal não faz (telefone, internet, entrega).
    presenca_comprador: "1",
    // "9" — sem frete. O cliente leva.
    modalidade_frete: "9",
    // "1" — operação interna, dentro do estado. NFC-e é sempre presencial.
    local_destino: "1",
    natureza_operacao: "VENDA AO CONSUMIDOR",
    // "9" — destinatário não contribuinte do ICMS, que é o consumidor final.
    indicador_inscricao_estadual_destinatario: "9",

    serie: String(p.document.series),

    items: p.items.map((i) => ({
      numero_item: String(i.number),
      codigo_produto: i.code,
      codigo_ncm: i.ncm,
      ...(i.cest ? { cest: i.cest } : {}),
      descricao: i.description,
      cfop: i.cfop,
      unidade_comercial: i.unit,
      unidade_tributavel: i.tax_unit,
      quantidade_comercial: i.quantity,
      quantidade_tributavel: i.quantity,
      valor_unitario_comercial: round2(i.unit_price),
      valor_unitario_tributavel: round2(i.unit_price),
      valor_bruto: round2(i.total),
      icms_origem: String(i.origin ?? 0),
      // O MESMO CAMPO recebe CSOSN (Simples) ou CST de ICMS (Normal) — é a
      // razão de `icms_code` ser uma coluna só no nosso banco.
      icms_situacao_tributaria: i.icms_code,
      // GTIN só vai quando é um de verdade. Mandar o código interno da
      // balança aqui reprova a nota inteira no dígito verificador.
      ...(i.gtin && i.gtin !== "SEM GTIN" ? { codigo_barras_comercial: i.gtin } : {}),
    })),

    formas_pagamento: [
      {
        forma_pagamento: PAYMENT[p.sale.payment_method ?? ""] ?? PAYMENT_FALLBACK,
        valor_pagamento: round2(itemsTotal(p.items)),
      },
    ],
  };

  // O "CPF na nota". Ausente é o caso normal — consumidor não identificado é
  // perfeitamente válido numa NFC-e, e mandar o campo vazio é que dá erro.
  if (doc.length === 11) body.cpf_destinatario = doc;
  if (p.sale.customer_name) body.nome_destinatario = p.sale.customer_name;

  return body;
}

/**
 * O total vem dos ITENS, não de `sales.total`.
 *
 * Os dois divergem quando a venda tem serviço: `sales.total` inclui o banho,
 * a NFC-e não. Somar o campo pronto faria o valor dos pagamentos não bater com
 * o dos produtos, e a SEFAZ rejeita por isso.
 */
function itemsTotal(items: PayloadItem[]): number {
  return items.reduce((a, i) => a + Number(i.total), 0);
}

function round2(n: number): number {
  return Math.round(Number(n) * 100) / 100;
}
