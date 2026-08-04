import { MODULOS_PERM } from "@/lib/dados/perfis";
import type { ModuloKey } from "@/types/types";

/**
 * `roles.permissions` é um jsonb livre. O portal trata como uma lista de
 * chaves de módulo do BANCO (`sales`, `stock`…), no formato
 * `{ "modules": ["sales", "products"] }`.
 *
 * A leitura aceita também um array puro, porque é o formato mais provável de
 * alguém escrever à mão no painel do Supabase — melhor entender os dois do que
 * quebrar por causa de um envelope.
 */
export function modulosDoPapel(
  permissions: unknown,
  dbParaPortal: (k: string) => ModuloKey | undefined,
): ModuloKey[] {
  const bruto = Array.isArray(permissions)
    ? permissions
    : typeof permissions === "object" && permissions !== null
      ? ((permissions as { modules?: unknown }).modules ?? [])
      : [];

  if (!Array.isArray(bruto)) return [];

  const out: ModuloKey[] = [];
  for (const k of bruto) {
    const m = typeof k === "string" ? dbParaPortal(k) : undefined;
    if (m && !out.includes(m)) out.push(m);
  }
  return MODULOS_PERM.filter((m) => out.includes(m));
}

/** O formato que o portal grava de volta em `roles.permissions`. */
export function permissoesParaBanco(modulos: ModuloKey[], portalParaDb: Partial<Record<ModuloKey, string>>) {
  return { modules: modulos.map((m) => portalParaDb[m]).filter(Boolean) };
}
