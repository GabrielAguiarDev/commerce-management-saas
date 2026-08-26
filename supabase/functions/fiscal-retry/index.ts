import { FocusNfe, type FocusEnvironment } from "../_shared/focus.ts";
import { json, serviceClient } from "../_shared/db.ts";

/**
 * O QUE FICOU NO MEIO DO CAMINHO.
 *
 * Roda por agendamento (cron do Supabase). Pega os documentos que não chegaram
 * a um estado final e resolve cada um pelo caminho certo:
 *
 *   `processing` → CONSULTA. A nota foi aceita para processamento e a SEFAZ
 *                  ainda não respondeu. Emitir de novo criaria uma segunda.
 *   `pending`    → EMITE. Nunca chegou ao provedor — a chamada do portal
 *                  falhou, ou o balcão estava sem internet quando a venda foi
 *                  registrada.
 *
 * `rejected` NÃO entra: rejeição é falta de cadastro (NCM ausente, CSOSN
 * errado) e insistir sozinho nunca conserta. Quem reenvia é a pessoa, na tela
 * de Notas, depois de corrigir.
 *
 * O TETO DE TENTATIVAS existe pelo mesmo motivo: sem ele, um documento
 * impossível seria reenviado a cada execução, para sempre, gastando cota do
 * provedor e enchendo o log — e escondendo os que realmente precisam de
 * atenção.
 */

const MAX_ATTEMPTS = 8;

/** Quantos documentos por execução. Evita estourar o tempo da função. */
const BATCH = 25;

Deno.serve(async () => {
  const db = serviceClient();

  const { data: docs, error } = await db
    .from("fiscal_documents")
    .select("id, status, reference, environment, attempts")
    .in("status", ["pending", "processing"])
    .lt("attempts", MAX_ATTEMPTS)
    .order("created_at", { ascending: true })
    .limit(BATCH);

  if (error) return json({ error: error.message }, 500);

  const done: Record<string, string> = {};

  for (const doc of docs ?? []) {
    try {
      if (doc.status === "processing") {
        // CONSULTA, nunca reemissão: o documento já está com a SEFAZ.
        const focus = new FocusNfe(doc.environment as FocusEnvironment);
        const r = await focus.query(doc.reference);

        await db.rpc("mark_fiscal_document", {
          p_document_id: doc.id,
          p_status: r.status,
          p_protocol: r.protocol,
          p_access_key: r.accessKey,
          p_number: r.number,
          p_series: r.series,
          p_xml_url: r.xmlUrl,
          p_danfe_url: r.danfeUrl,
          p_rejection_reason: r.rejectionReason,
          p_provider: "focus_nfe",
        });

        done[doc.id] = r.status;
        continue;
      }

      // `pending`: delega à `fiscal-emit` em vez de repetir a lógica dela.
      // Duas cópias do caminho de emissão divergiriam na primeira correção.
      const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/fiscal-emit`;
      const r = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({ document_id: doc.id }),
      });

      done[doc.id] = r.ok ? "reenviado" : `falhou (${r.status})`;
    } catch (e) {
      // Um documento que estoura não pode levar o lote junto: os outros da
      // fila não têm culpa, e a próxima execução tenta este de novo.
      done[doc.id] = `erro: ${e instanceof Error ? e.message : String(e)}`;
    }
  }

  return json({ processed: Object.keys(done).length, results: done });
});
