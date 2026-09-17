// Testes da lógica pura da fila offline de vendas.
//
// O portal não tem framework de testes; este arquivo usa só o `node:test` e a
// remoção de tipos nativa do Node (>= 23.6). Rodar a partir de apps/portal-client:
//
//   node --test lib/offline/salesQueue.test.mjs

import assert from "node:assert/strict";
import { test } from "node:test";

import {
  applyAttempt,
  classifyAttempt,
  createQueuedSale,
  describeError,
  dueForSync,
  inScope,
  isUuid,
  newClientId,
  nextWakeMs,
  queuedQtyByProduct,
  resetForRetry,
  retryDelayMs,
  summarize,
} from "./salesQueue.ts";

const scope = { tenantId: "t1", userId: "u1" };
const t0 = new Date("2026-09-17T12:00:00.000Z");

function sale(overrides = {}) {
  return {
    ...createQueuedSale({
      clientId: newClientId(),
      scope,
      items: [
        { productId: "p1", name: "Café", qtd: 2, price: 5.5 },
        { productId: null, name: "Avulso", qtd: 1, price: 3 },
      ],
      payment: "cash",
      customerDocument: "",
      now: t0,
    }),
    ...overrides,
  };
}

test("newClientId gera uuid v4, com e sem randomUUID", () => {
  assert.ok(isUuid(newClientId()));
  const fallback = newClientId({ getRandomValues: (a) => globalThis.crypto.getRandomValues(a) });
  assert.ok(isUuid(fallback));
  assert.match(fallback, /^[0-9a-f]{8}-[0-9a-f]{4}-4/);
  assert.equal(isUuid("nao-e-uuid"), false);
});

test("createQueuedSale nasce pendente, com a hora do clique e itens copiados", () => {
  const items = [{ productId: "p1", name: "Café", qtd: 1, price: 2 }];
  const s = createQueuedSale({ clientId: "x", scope, items, payment: "pix", customerDocument: "1", now: t0 });
  items[0].qtd = 99;
  assert.equal(s.status, "pending");
  assert.equal(s.attempts, 0);
  assert.equal(s.soldAt, t0.toISOString());
  assert.equal(s.items[0].qtd, 1);
});

test("classifyAttempt: sucesso e duplicata saem da fila", () => {
  assert.equal(classifyAttempt(null), "done");
  assert.equal(classifyAttempt({ code: "23505", message: "duplicate key" }), "done");
});

test("classifyAttempt: rede, sessão e erros de infraestrutura continuam pendentes", () => {
  for (const code of ["network", "session", "08006", "57014", "53300", "40001", "40P01", "PGRST001"]) {
    assert.equal(classifyAttempt({ code, message: "x" }), "retry", code);
  }
  assert.equal(classifyAttempt({ code: null, message: "TypeError: fetch failed" }), "retry");
  assert.equal(classifyAttempt({ code: "", message: "Failed to fetch" }), "retry");
});

test("classifyAttempt: permissão, validação, produto inexistente e desconhecido param", () => {
  for (const code of ["42501", "22023", "23503", "22P02", "P0001", "PGRST202"]) {
    assert.equal(classifyAttempt({ code, message: "x" }), "failed", code);
  }
  assert.equal(classifyAttempt({ code: null, message: "algo estranho" }), "failed");
});

test("applyAttempt: done remove; retry mantém pendente; failed para", () => {
  const s = sale();
  assert.equal(applyAttempt(s, null, t0), null);

  const later = new Date(t0.getTime() + 1000);
  const retry = applyAttempt(s, { code: "network", message: "sem rede" }, later);
  assert.equal(retry.status, "pending");
  assert.equal(retry.attempts, 1);
  assert.equal(retry.updatedAt, later.toISOString());
  assert.equal(retry.soldAt, s.soldAt, "a hora da venda nunca muda");
  assert.equal(retry.clientId, s.clientId, "o id da venda nunca muda");

  const failed = applyAttempt(s, { code: "23503", message: "produto não encontrado" }, later);
  assert.equal(failed.status, "failed");
});

test("falha definitiva não é reenviada automaticamente, nem com force", () => {
  const failed = sale({ status: "failed", attempts: 3 });
  assert.deepEqual(dueForSync([failed], scope, t0, true), []);
  assert.equal(nextWakeMs([failed], scope, t0), null);

  const reset = resetForRetry(failed, t0);
  assert.equal(reset.status, "pending");
  assert.equal(reset.attempts, 0);
  assert.equal(dueForSync([reset], scope, t0, false).length, 1);
});

test("retryDelayMs cresce e tem teto", () => {
  assert.equal(retryDelayMs(0), 5_000);
  assert.equal(retryDelayMs(1), 5_000);
  assert.equal(retryDelayMs(2), 10_000);
  assert.equal(retryDelayMs(3), 20_000);
  assert.equal(retryDelayMs(50), 300_000);
});

test("dueForSync respeita a espera, exceto com force", () => {
  const waiting = sale({ attempts: 2, updatedAt: t0.toISOString() });
  const soon = new Date(t0.getTime() + 5_000);
  const after = new Date(t0.getTime() + 10_000);
  assert.equal(dueForSync([waiting], scope, soon, false).length, 0);
  assert.equal(dueForSync([waiting], scope, soon, true).length, 1);
  assert.equal(dueForSync([waiting], scope, after, false).length, 1);
  assert.equal(nextWakeMs([waiting], scope, soon), 5_000);
});

test("escopo: outra conta ou outro negócio não vê nem envia a venda", () => {
  const mine = sale({ soldAt: "2026-09-17T12:00:02.000Z" });
  const older = sale({ soldAt: "2026-09-17T12:00:01.000Z" });
  const otherUser = sale({ userId: "u2" });
  const otherTenant = sale({ tenantId: "t2" });
  const all = [mine, otherUser, older, otherTenant];

  assert.deepEqual(
    inScope(all, scope).map((s) => s.clientId),
    [older.clientId, mine.clientId],
    "ordem de venda, da mais antiga para a mais nova",
  );
  assert.equal(dueForSync(all, scope, t0, true).length, 2);
  assert.deepEqual(inScope(all, { tenantId: "", userId: "" }), []);
});

test("summarize e queuedQtyByProduct", () => {
  const a = sale();
  const b = sale({ status: "failed" });
  assert.deepEqual(summarize([a, b]), { pending: 1, failed: 1, totalValue: 28 });
  const qty = queuedQtyByProduct([a, b]);
  assert.equal(qty.get("p1"), 4);
  assert.equal(qty.size, 1, "item avulso não entra");
});

test("describeError orienta a ação", () => {
  assert.match(describeError(null, "pending"), /conexão voltar/);
  assert.match(describeError({ code: "session", message: "x" }, "pending"), /Entre novamente/);
  assert.match(describeError({ code: "network", message: "x" }, "pending"), /automaticamente/);
  assert.match(describeError({ code: "42501", message: "sem permissão" }, "failed"), /permissão/);
  assert.match(describeError({ code: "23503", message: "x" }, "failed"), /não existe mais/);
});
