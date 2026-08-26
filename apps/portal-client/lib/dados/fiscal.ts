import type { FiscalData, Product, ProductFiscal, TaxRegime } from "@/types/types";

/**
 * O vocabulário fiscal — códigos, rótulos e validadores.
 *
 * POR QUE ISTO É UM ARQUIVO SÓ: nenhum destes códigos é decisão nossa. NCM,
 * CFOP, CSOSN e CST são tabelas oficiais, e o que o portal faz é apenas
 * OFERECER os valores comuns do balcão e RECUSAR o que a SEFAZ recusaria — de
 * preferência aqui, enquanto a pessoa digita, e não três semanas depois numa
 * nota rejeitada.
 *
 * O QUE ESTE ARQUIVO NÃO FAZ: escolher o código certo. Isso é do contador do
 * cliente. O portal valida a FORMA (oito dígitos, dígito verificador batendo) e
 * guarda o que mandarem — validar o mérito fiscal seria fingir uma competência
 * que o sistema não tem e que, errada, custa multa ao cliente.
 */

/* -------------------------------------------------------------------------- */
/* Regime tributário (CRT)                                                     */
/* -------------------------------------------------------------------------- */

/**
 * O CRT é a chave que abre todo o resto: é ele que decide se o item da nota
 * leva CSOSN (Simples) ou CST de ICMS (Normal). Enquanto ele estiver vazio, o
 * portal não tem como sugerir nada — e é por isso que a tela o pede primeiro.
 */
export const REGIMES: { value: TaxRegime; label: string; note: string }[] = [
  { value: 1, label: "Simples Nacional", note: "O caso da maioria dos comércios de bairro." },
  { value: 2, label: "Simples Nacional — excesso de sublimite", note: "Faturamento passou do sublimite do estado." },
  { value: 3, label: "Regime Normal", note: "Lucro Presumido ou Lucro Real." },
  { value: 4, label: "MEI", note: "Microempreendedor individual." },
];

export const REGIME_LABEL: Record<TaxRegime, string> = {
  1: "Simples Nacional",
  2: "Simples Nacional — excesso de sublimite",
  3: "Regime Normal",
  4: "MEI",
};

/** Simples e MEI usam CSOSN; o Normal usa CST de ICMS. */
export function usesCsosn(regime: TaxRegime | null): boolean {
  return regime === 1 || regime === 2 || regime === 4;
}

/* -------------------------------------------------------------------------- */
/* Tabelas de códigos                                                          */
/* -------------------------------------------------------------------------- */

export interface CodeOption {
  code: string;
  label: string;
}

/** Origem da mercadoria. 0 cobre quase todo o balcão brasileiro. */
export const ORIGINS: CodeOption[] = [
  { code: "0", label: "0 — Nacional" },
  { code: "1", label: "1 — Estrangeira, importação direta" },
  { code: "2", label: "2 — Estrangeira, adquirida no mercado interno" },
  { code: "3", label: "3 — Nacional, conteúdo de importação acima de 40%" },
  { code: "4", label: "4 — Nacional, processos produtivos básicos" },
  { code: "5", label: "5 — Nacional, conteúdo de importação até 40%" },
  { code: "6", label: "6 — Estrangeira, importação direta, sem similar nacional" },
  { code: "7", label: "7 — Estrangeira, mercado interno, sem similar nacional" },
  { code: "8", label: "8 — Nacional, conteúdo de importação acima de 70%" },
];

/** CSOSN — o código do Simples Nacional. */
export const CSOSN: CodeOption[] = [
  { code: "101", label: "101 — Tributada com permissão de crédito" },
  { code: "102", label: "102 — Tributada sem permissão de crédito" },
  { code: "103", label: "103 — Isenção do ICMS para faixa de receita bruta" },
  { code: "201", label: "201 — Com permissão de crédito e com ICMS-ST" },
  { code: "202", label: "202 — Sem permissão de crédito e com ICMS-ST" },
  { code: "203", label: "203 — Isenção para faixa de receita e com ICMS-ST" },
  { code: "300", label: "300 — Imune" },
  { code: "400", label: "400 — Não tributada" },
  { code: "500", label: "500 — ICMS cobrado antes por substituição tributária" },
  { code: "900", label: "900 — Outros" },
];

/** CST de ICMS — o código do Regime Normal. */
export const ICMS_CST: CodeOption[] = [
  { code: "00", label: "00 — Tributada integralmente" },
  { code: "10", label: "10 — Tributada e com cobrança por substituição" },
  { code: "20", label: "20 — Com redução de base de cálculo" },
  { code: "30", label: "30 — Isenta ou não tributada, com cobrança por substituição" },
  { code: "40", label: "40 — Isenta" },
  { code: "41", label: "41 — Não tributada" },
  { code: "50", label: "50 — Suspensão" },
  { code: "51", label: "51 — Diferimento" },
  { code: "60", label: "60 — ICMS cobrado antes por substituição tributária" },
  { code: "70", label: "70 — Com redução de base e cobrança por substituição" },
  { code: "90", label: "90 — Outras" },
];

/**
 * PIS e COFINS usam a MESMA tabela de CST. São listadas as situações que
 * aparecem num comércio; a lista oficial é bem maior e o campo aceita
 * digitação livre para o resto.
 */
export const PIS_COFINS_CST: CodeOption[] = [
  { code: "01", label: "01 — Tributável, alíquota básica" },
  { code: "04", label: "04 — Monofásica, alíquota zero" },
  { code: "06", label: "06 — Alíquota zero" },
  { code: "07", label: "07 — Isenta" },
  { code: "08", label: "08 — Sem incidência" },
  { code: "09", label: "09 — Com suspensão" },
  { code: "49", label: "49 — Outras operações de saída" },
  { code: "99", label: "99 — Outras operações" },
];

/** Os CFOP de saída que um balcão usa. O campo aceita qualquer um. */
export const CFOP_COMMON: CodeOption[] = [
  { code: "5102", label: "5102 — Venda de mercadoria de terceiros, no estado" },
  { code: "5101", label: "5101 — Venda de produção do estabelecimento, no estado" },
  { code: "5405", label: "5405 — Venda de mercadoria com ICMS já retido por ST" },
  { code: "5933", label: "5933 — Prestação de serviço tributada pelo ISS" },
  { code: "6102", label: "6102 — Venda de mercadoria de terceiros, para outro estado" },
  { code: "6101", label: "6101 — Venda de produção do estabelecimento, para outro estado" },
];

export const UFS = [
  "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT",
  "PA", "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO",
];

/**
 * Unidades tributáveis. Não é a mesma lista de `UNITS` (a comercial): vende-se
 * "fardo" e tributa-se "KG", e a SEFAZ só entende a segunda.
 */
export const TAX_UNITS = ["UN", "KG", "L", "M", "M2", "M3", "CX", "PC", "PAR", "DZ"];

/* -------------------------------------------------------------------------- */
/* Validadores                                                                 */
/* -------------------------------------------------------------------------- */

export function onlyDigits(v: string): string {
  return (v ?? "").replace(/\D/g, "");
}

/**
 * O dígito verificador de CPF e CNPJ.
 *
 * Vale checar aqui, e não só no banco: um CNPJ digitado errado só apareceria
 * como rejeição da SEFAZ na PRIMEIRA venda do dia, com fila no balcão. Aqui
 * ele aparece enquanto a pessoa ainda está na tela de configuração.
 */
export function isValidCpf(v: string): boolean {
  const n = onlyDigits(v);
  if (n.length !== 11 || /^(\d)\1{10}$/.test(n)) return false;

  const dv = (upTo: number): number => {
    let sum = 0;
    for (let i = 0; i < upTo; i++) sum += Number(n[i]) * (upTo + 1 - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };

  return dv(9) === Number(n[9]) && dv(10) === Number(n[10]);
}

export function isValidCnpj(v: string): boolean {
  const n = onlyDigits(v);
  if (n.length !== 14 || /^(\d)\1{13}$/.test(n)) return false;

  // Os pesos correm de 2 a 9 e reiniciam — é a regra da Receita, não um
  // arranjo nosso.
  const dv = (upTo: number): number => {
    let sum = 0;
    let weight = upTo - 7;
    for (let i = 0; i < upTo; i++) {
      sum += Number(n[i]) * weight;
      weight = weight === 2 ? 9 : weight - 1;
    }
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };

  return dv(12) === Number(n[12]) && dv(13) === Number(n[13]);
}

/** O emitente pode ser CNPJ (a regra) ou CPF (o MEI pessoa física). */
export function isValidTaxId(v: string): boolean {
  const n = onlyDigits(v);
  if (n.length === 14) return isValidCnpj(n);
  if (n.length === 11) return isValidCpf(n);
  return false;
}

export function isValidNcm(v: string): boolean {
  return /^\d{8}$/.test(onlyDigits(v));
}

export function isValidCest(v: string): boolean {
  return /^\d{7}$/.test(onlyDigits(v));
}

export function isValidCfop(v: string): boolean {
  return /^\d{4}$/.test(onlyDigits(v));
}

export function isValidZip(v: string): boolean {
  return /^\d{8}$/.test(onlyDigits(v));
}

export function isValidIbgeCode(v: string): boolean {
  return /^\d{7}$/.test(onlyDigits(v));
}

/** O que a SEFAZ espera de quem não tem código de barras. Literal, em maiúsculas. */
export const NO_GTIN = "SEM GTIN";

/**
 * GTIN — o dígito verificador que reprova a nota inteira.
 *
 * É a armadilha mais cara do cadastro de produto: o código interno da balança
 * ("2100034") passa por qualquer campo de texto e é recusado pela SEFAZ. Por
 * isso o GTIN é um campo SEPARADO do código de barras do PDV — ver o comentário
 * da coluna na migration.
 */
export function isValidGtin(v: string): boolean {
  const n = onlyDigits(v);
  if (![8, 12, 13, 14].includes(n.length)) return false;

  // Módulo 10: pesos 3 e 1 alternados, da direita para a esquerda.
  let sum = 0;
  for (let i = n.length - 2; i >= 0; i--) {
    const weight = (n.length - i) % 2 === 0 ? 3 : 1;
    sum += Number(n[i]) * weight;
  }
  const check = (10 - (sum % 10)) % 10;
  return check === Number(n[n.length - 1]);
}

/** Vazio é válido — o produto herda o padrão do negócio. */
export function gtinAccepted(v: string): boolean {
  const t = (v ?? "").trim();
  return t === "" || t === NO_GTIN || isValidGtin(t);
}

/* -------------------------------------------------------------------------- */
/* Máscaras de exibição                                                        */
/* -------------------------------------------------------------------------- */

/** "12.345.678/0001-95" ou "123.456.789-09", conforme o tamanho. */
export function formatTaxId(v: string): string {
  const n = onlyDigits(v);
  if (n.length === 14) {
    return n.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
  }
  if (n.length === 11) {
    return n.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
  }
  return v;
}

export function formatZip(v: string): string {
  const n = onlyDigits(v);
  return n.length === 8 ? n.replace(/^(\d{5})(\d{3})$/, "$1-$2") : v;
}

/* -------------------------------------------------------------------------- */
/* O estado do cadastro                                                        */
/* -------------------------------------------------------------------------- */

export interface ChecklistStep {
  key: string;
  title: string;
  /** O que a pessoa faz para resolver. Um passo sem isto é um beco sem saída. */
  hint: string;
  done: boolean;
  /** Passo que não depende do portal — certificado, credenciamento na SEFAZ. */
  external?: boolean;
}

/**
 * O que ainda falta para este negócio emitir a primeira nota.
 *
 * POR QUE UMA LISTA E NÃO UM BOOLEANO: habilitar emissão fiscal leva SEMANAS
 * num cliente que nunca emitiu — certificado digital, credenciamento na SEFAZ,
 * CSC, contador. Um "ainda não configurado" seco faria a pessoa abrir chamado
 * para perguntar o que falta. A lista responde antes da pergunta.
 *
 * Os passos `external` são os que ninguém aqui consegue resolver por ela; estão
 * na lista mesmo assim, porque omiti-los faria o cadastro parecer completo
 * quando ainda não é.
 */
export function fiscalChecklist(f: FiscalData, products: Product[]): ChecklistStep[] {
  const withoutNcm = products.filter(
    (p) => !p.service && p.active && !(p.fiscal.ncm || f.defaultNcm),
  ).length;

  return [
    {
      key: "identification",
      title: "Identificação do emitente",
      hint: "Razão social, CNPJ e regime tributário.",
      done: !!f.legalName.trim() && isValidTaxId(f.taxId) && f.regime != null,
    },
    {
      key: "address",
      title: "Endereço do estabelecimento",
      hint: "Com CEP, UF e código IBGE do município — é o código que vai no arquivo, não o nome da cidade.",
      done:
        !!f.street.trim() &&
        !!f.streetNumber.trim() &&
        !!f.district.trim() &&
        isValidZip(f.zipCode) &&
        !!f.stateCode &&
        isValidIbgeCode(f.cityIbgeCode),
    },
    {
      key: "defaults",
      title: "Padrões fiscais do catálogo",
      hint: "NCM, CFOP e a situação tributária que vale para a maioria dos seus produtos. Quem define é o seu contador.",
      done: isValidNcm(f.defaultNcm) && isValidCfop(f.defaultCfop) && !!f.defaultIcmsCode.trim(),
    },
    {
      key: "products",
      title: "Produtos com NCM",
      hint:
        withoutNcm > 0
          ? `${withoutNcm} ${withoutNcm === 1 ? "produto está" : "produtos estão"} sem NCM e sem padrão do negócio.`
          : "Todo produto à venda tem NCM, próprio ou herdado do padrão.",
      done: withoutNcm === 0,
    },
    {
      key: "certificate",
      title: "Certificado digital A1",
      hint: "e-CNPJ A1, emitido por uma certificadora. Vale 12 meses. Sem ele nenhuma nota é assinada.",
      done: f.certificateSet,
      external: true,
    },
    {
      key: "csc",
      title: "Credenciamento na SEFAZ e CSC",
      hint: "Gerado no portal da SEFAZ do seu estado, com o certificado. É o que assina o QR Code da nota.",
      done: !!f.cscId.trim() && f.cscTokenSet,
      external: true,
    },
  ];
}

/** Quantos passos faltam. Zero é o único número que libera a emissão. */
export function pendingSteps(steps: ChecklistStep[]): number {
  return steps.filter((s) => !s.done).length;
}

/* -------------------------------------------------------------------------- */
/* O cadastro vazio                                                            */
/* -------------------------------------------------------------------------- */

/**
 * O que um negócio que nunca abriu a tela fiscal tem.
 *
 * Serve a três chamadores: o retrato vazio de `lib/estado.ts`, o rascunho
 * inicial do provider, e a leitura de quem não tem o módulo `fiscal` — que
 * devolve isto sem nem consultar o banco.
 *
 * `environment: "homologation"` não é um placeholder: é o estado real de todo
 * emitente antes de a SEFAZ liberar produção.
 */
export const EMPTY_FISCAL: FiscalData = {
  legalName: "",
  taxId: "",
  stateRegistration: "",
  stateRegistrationExempt: false,
  cityRegistration: "",
  regime: null,

  street: "",
  streetNumber: "",
  complement: "",
  district: "",
  zipCode: "",
  cityName: "",
  stateCode: "",
  cityIbgeCode: "",

  environment: "homologation",
  nfceSeries: 1,

  defaultNcm: "",
  defaultCfop: "",
  defaultIcmsCode: "",
  defaultPisCst: "",
  defaultCofinsCst: "",
  defaultOrigin: "0",

  cscId: "",
  cscTokenSet: false,
  certificateSet: false,
  certificateExpiresAt: "",
};

/** O padrão do negócio entra quando o produto não tem o campo próprio. */
export function effectiveFiscal(p: Product, f: FiscalData): ProductFiscal {
  return {
    ncm: p.fiscal.ncm || f.defaultNcm,
    cest: p.fiscal.cest,
    origin: p.fiscal.origin || f.defaultOrigin,
    gtin: p.fiscal.gtin,
    taxUnit: p.fiscal.taxUnit || p.unit.toUpperCase(),
    cfop: p.fiscal.cfop || f.defaultCfop,
    icmsCode: p.fiscal.icmsCode || f.defaultIcmsCode,
    pisCst: p.fiscal.pisCst || f.defaultPisCst,
    cofinsCst: p.fiscal.cofinsCst || f.defaultCofinsCst,
  };
}
