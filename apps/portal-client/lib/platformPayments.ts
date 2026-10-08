/** Liberação explícita; credenciais do Mercado Pago, sozinhas, não ativam pagamentos. */
export function platformPaymentsEnabled(): boolean {
  return process.env.NEXT_PUBLIC_PLATFORM_PAYMENTS_ENABLED === "true";
}
