/** Sem liberação explícita, nenhuma chamada cria pagamentos no provedor. */
export function platformPaymentsEnabled(): boolean {
  return Deno.env.get("PLATFORM_PAYMENTS_ENABLED") === "true";
}
