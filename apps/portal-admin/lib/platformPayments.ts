/** Liberação explícita do painel de recebimentos integrado. */
export function platformPaymentsEnabled(): boolean {
  return process.env.NEXT_PUBLIC_PLATFORM_PAYMENTS_ENABLED === "true";
}
