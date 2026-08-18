import { FocusNfe, type FocusEnvironment } from "../_shared/focus.ts";
import { buildNfce, PayloadError, type DocumentPayload } from "../_shared/nfce.ts";
import { isServiceCall, json, serviceClient, userClient } from "../_shared/db.ts";

/**
 * EMITE UM DOCUMENTO FISCAL.
 *
 * Recebe `{ document_id }`, monta o payload, chama o provedor e grava o
 * resultado. Chamada logo depois de a venda ser registrada — mas SEM que a
 * venda espere por ela (ver `app/vendas/actions.ts`).
 *
 * A REGRA QUE ORGANIZA TUDO: **a venda nunca falha por causa da nota.** Se a
 * SEFAZ está fora, se a Focus caiu, se faltou NCM — a venda já está gravada e o
 * documento fica com o motivo escrito, para a tela de Notas mostrar e a
 * `fiscal-retry` tentar de novo. Travar o balcão esperando o fisco é
 * inaceitável num PDV.
 *
 * QUEM PODE CHAMAR: a chave de serviço (a `fiscal-retry`, um cron) ou um
 * usuário logado — e, neste segundo caso, só para um documento do PRÓPRIO
 * tenant. A prova de posse é feita relendo o documento com o JWT de quem
 * chamou: a policy de select de `fiscal_documents` já filtra por tenant, e
 * perguntar a ela é melhor do que reescrever a regra aqui.
 *
 * Sem essa checagem, um `document_id` adivinhado mandaria emitir a nota de
 * outro comércio — e o `document_id` é a única coisa que esta função recebe.
 * Nada mais é aceito por argumento: emitente, ambiente e série vêm do banco.
 */
Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "método não permitido" }, 405);

  let documentId: string | undefined;
  try {
    ({ document_id: documentId } = await req.json());
  } catch {
    return json({ error: "corpo inválido" }, 400);
  }

  if (!documentId) return json({ error: "document_id é obrigatório" }, 400);

  const auth = req.headers.get("Authorization") ?? "";

  if (!isServiceCall(auth)) {
    const { data: owned } = await userClient(auth)
      .from("fiscal_documents")
      .select("id")
      .eq("id", documentId)
      .maybeSingle();

    // Mensagem igual à de um id inexistente, de propósito: quem tentou não
    // descobre se o documento existe em outro tenant.
    if (!owned) return json({ error: "documento não encontrado" }, 404);
  }

  const db = serviceClient();

  // O retrato completo do documento, com a herança dos padrões fiscais já
  // resolvida pelo banco.
  const { data, error } = await db.rpc("fiscal_document_payload", {
    p_document_id: documentId,
  });

  if (error) return json({ error: error.message }, 400);

  const payload = data as DocumentPayload;

  /**
   * Só documento em aberto é emitido. Um já autorizado que chegasse aqui de
   * novo — retentativa atrasada, clique duplo — geraria uma SEGUNDA nota para
   * a mesma venda, que é o erro mais caro desta área.
   *
   * A `ref` reenviada já protegeria do lado da Focus, mas depender só disso
   * seria confiar a integridade do nosso banco ao comportamento de um
   * fornecedor.
   */
  const { data: current } = await db
    .from("fiscal_documents")
    .select("status")
    .eq("id", documentId)
    .single();

  if (current && !["pending", "processing", "rejected"].includes(current.status)) {
    return json({ skipped: current.status });
  }

  let body: Record<string, unknown>;
  try {
    body = buildNfce(payload);
  } catch (e) {
    // Erro de CADASTRO, não de comunicação: insistir não resolve. Marca como
    // rejeitado com o motivo em português, que é o que a tela mostra.
    if (e instanceof PayloadError) {
      await db.rpc("mark_fiscal_document", {
        p_document_id: documentId,
        p_status: "rejected",
        p_rejection_reason: e.message,
        p_provider: "focus_nfe",
      });
      return json({ status: "rejected", reason: e.message });
    }
    throw e;
  }

  const focus = new FocusNfe(payload.document.environment as FocusEnvironment);
  const result = await focus.emit(payload.document.reference, body);

  await db.rpc("mark_fiscal_document", {
    p_document_id: documentId,
    p_status: result.status,
    p_protocol: result.protocol,
    p_access_key: result.accessKey,
    p_number: result.number,
    p_series: result.series,
    p_xml_url: result.xmlUrl,
    p_danfe_url: result.danfeUrl,
    p_rejection_reason: result.rejectionReason,
    p_provider: "focus_nfe",
    p_provider_ref: payload.document.reference,
  });

  return json({ status: result.status, reason: result.rejectionReason });
});
