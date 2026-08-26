/**
 * A FRONTEIRA COM A FOCUS NFE — o único arquivo que sabe que ela existe.
 *
 * Mesmo princípio do `salesApi` do app mobile: um arquivo por fronteira
 * externa. Quem chama daqui para cima fala de "emitir" e "consultar", nunca de
 * `caminho_danfe` ou `erro_autorizacao`. Trocar de provedor — ou usar dois — é
 * escrever outro arquivo com estas mesmas quatro funções.
 *
 * CONTRATO (doc.focusnfe.com.br, conferido em 17/08/2026):
 *   base homologação  https://homologacao.focusnfe.com.br
 *   base produção     https://api.focusnfe.com.br
 *   prefixo           /v2
 *   autenticação      HTTP Basic — usuário = token, senha vazia
 *   emitir            POST   /v2/nfce?ref={ref}
 *   consultar         GET    /v2/nfce/{ref}?completa=1
 *   cancelar          DELETE /v2/nfce/{ref}   body { justificativa }
 *
 * A NFC-e É SÍNCRONA. Ao contrário da NF-e modelo 55, o POST já volta com o
 * status final — `autorizado` ou `erro_autorizacao` — porque os webservices
 * estaduais de NFC-e respondem na hora. É por isso que não existe uma
 * `fiscal-callback` aqui: webhook da Focus só faria sentido para a NF-e e para
 * a contingência, e uma função que nunca é chamada é código morto esperando
 * apodrecer. Ela entra junto com o modelo 55.
 *
 * `processando_autorizacao` ainda acontece (a SEFAZ pode demorar), e é para
 * esse resto que existe a `fiscal-retry`.
 */

export type FocusEnvironment = "homologation" | "production";

const BASE: Record<FocusEnvironment, string> = {
  homologation: "https://homologacao.focusnfe.com.br",
  production: "https://api.focusnfe.com.br",
};

/**
 * O token é POR AMBIENTE — o de homologação não emite em produção e
 * vice-versa. São duas variáveis para tornar impossível o acidente de apontar
 * o ambiente de teste para a chave de produção.
 */
const TOKEN_ENV: Record<FocusEnvironment, string> = {
  homologation: "FOCUS_NFE_TOKEN_HOMOLOGATION",
  production: "FOCUS_NFE_TOKEN_PRODUCTION",
};

/** O status do documento no nosso banco. */
export type DocumentStatus =
  | "pending"
  | "processing"
  | "authorized"
  | "rejected"
  | "cancelled"
  | "denied";

/**
 * O vocabulário da Focus traduzido para o nosso.
 *
 * A tradução mora aqui, e não numa coluna do banco, pela mesma razão de
 * `paymentFromDb` no portal: o banco não deve falar o idioma de um fornecedor.
 */
const STATUS: Record<string, DocumentStatus> = {
  autorizado: "authorized",
  processando_autorizacao: "processing",
  erro_autorizacao: "rejected",
  cancelado: "cancelled",
  denegado: "denied",
};

export interface FocusResponse {
  status?: string;
  status_sefaz?: string;
  mensagem_sefaz?: string;
  chave_nfe?: string;
  numero?: string;
  serie?: string;
  caminho_xml_nota_fiscal?: string;
  caminho_danfe?: string;
  qrcode_url?: string;
  erros?: { campo?: string; mensagem?: string }[];
  /** A Focus devolve `codigo`/`mensagem` nos erros de requisição (4xx). */
  codigo?: string;
  mensagem?: string;
}

/** O que o resto do sistema entende, já sem vocabulário de fornecedor. */
export interface EmissionResult {
  status: DocumentStatus;
  protocol: string | null;
  accessKey: string | null;
  number: number | null;
  series: number | null;
  xmlUrl: string | null;
  danfeUrl: string | null;
  rejectionReason: string | null;
  /** O corpo cru, para o log — é o que salva a investigação de uma rejeição. */
  raw: FocusResponse;
}

export class FocusNfe {
  readonly environment: FocusEnvironment;
  private readonly token: string;

  constructor(environment: FocusEnvironment) {
    this.environment = environment;
    const token = Deno.env.get(TOKEN_ENV[environment]);
    if (!token) {
      throw new Error(
        `Falta a variável ${TOKEN_ENV[environment]} nas configurações da função.`,
      );
    }
    this.token = token;
  }

  private headers(): HeadersInit {
    // Basic com o token como usuário e senha VAZIA — os dois-pontos finais são
    // obrigatórios e é o erro mais comum de quem integra na primeira vez.
    return {
      Authorization: `Basic ${btoa(`${this.token}:`)}`,
      "Content-Type": "application/json",
    };
  }

  private url(path: string): string {
    return `${BASE[this.environment]}/v2${path}`;
  }

  /** Emite. A `ref` é NOSSA e reenviá-la é o que impede nota duplicada. */
  async emit(ref: string, payload: unknown): Promise<EmissionResult> {
    const r = await fetch(this.url(`/nfce?ref=${encodeURIComponent(ref)}`), {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(payload),
    });

    return interpret(await readBody(r), r.status, BASE[this.environment]);
  }

  /** Consulta. É o caminho da retentativa e o do documento que ficou no meio. */
  async query(ref: string): Promise<EmissionResult> {
    const r = await fetch(this.url(`/nfce/${encodeURIComponent(ref)}?completa=1`), {
      method: "GET",
      headers: this.headers(),
    });

    return interpret(await readBody(r), r.status, BASE[this.environment]);
  }

  /**
   * Cancela. A justificativa tem de 15 a 255 caracteres — exigência da SEFAZ,
   * e o prazo da NFC-e costuma ser de 30 minutos após a autorização.
   *
   * Ainda não é chamada por ninguém: o cancelamento entra junto com a
   * ramificação de estorno do portal, que é entrega própria. Está aqui porque
   * o contrato é do adapter, e descobri-lo agora custou a mesma leitura.
   */
  async cancel(ref: string, justification: string): Promise<EmissionResult> {
    const r = await fetch(this.url(`/nfce/${encodeURIComponent(ref)}`), {
      method: "DELETE",
      headers: this.headers(),
      body: JSON.stringify({ justificativa: justification }),
    });

    return interpret(await readBody(r), r.status, BASE[this.environment]);
  }
}

async function readBody(r: Response): Promise<FocusResponse> {
  const text = await r.text();
  try {
    return text ? (JSON.parse(text) as FocusResponse) : {};
  } catch {
    // Um 502 do provedor volta em HTML. Guardar o texto cru é o que permite
    // distinguir "a SEFAZ recusou" de "a Focus caiu" no dia seguinte.
    return { mensagem: text.slice(0, 500) };
  }
}

/**
 * A resposta da Focus virando o nosso resultado.
 *
 * O caso que exige cuidado é o HTTP 4xx SEM `status`: é erro de REQUISIÇÃO
 * (campo faltando, JSON inválido), não recusa da SEFAZ. Tratá-lo como
 * `processing` faria a retentativa insistir para sempre num payload que nunca
 * vai passar; por isso ele vira `rejected`, que é terminal e mostra o motivo
 * na tela.
 */
function interpret(body: FocusResponse, httpStatus: number, base: string): EmissionResult {
  const mapped = body.status ? STATUS[body.status] : undefined;

  const status: DocumentStatus =
    mapped ?? (httpStatus >= 200 && httpStatus < 300 ? "processing" : "rejected");

  const reason =
    status === "rejected" || status === "denied"
      ? [
          body.mensagem_sefaz,
          body.mensagem,
          ...(body.erros ?? []).map((e) => [e.campo, e.mensagem].filter(Boolean).join(": ")),
        ]
          .filter(Boolean)
          .join(" | ") || `Erro HTTP ${httpStatus}`
      : null;

  return {
    status,
    protocol: body.status_sefaz ?? null,
    // A Focus devolve a chave prefixada com "NFe"; o que vale para consulta
    // pública são os 44 dígitos.
    accessKey: body.chave_nfe ? body.chave_nfe.replace(/\D/g, "").slice(-44) || null : null,
    number: body.numero ? Number(body.numero) : null,
    series: body.serie ? Number(body.serie) : null,
    xmlUrl: absolute(body.caminho_xml_nota_fiscal, base),
    danfeUrl: absolute(body.caminho_danfe, base),
    rejectionReason: reason,
    raw: body,
  };
}

/**
 * Os caminhos do XML e do DANFE voltam RELATIVOS ("/arquivos_development/…").
 * Guardá-los assim deixaria o link quebrado na tela.
 *
 * A base é a do ambiente que emitiu, e amarrar o registro a ela é o correto:
 * um documento de homologação não existe em produção, e um link que
 * "acompanhasse" a troca de ambiente apontaria para o nada.
 */
function absolute(path: string | undefined, base: string): string | null {
  if (!path) return null;
  return path.startsWith("http") ? path : base + path;
}
