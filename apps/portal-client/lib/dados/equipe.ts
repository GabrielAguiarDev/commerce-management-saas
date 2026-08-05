import { PERMISSION_MODULES } from "@/lib/dados/perfis";
import type { ModuleKey } from "@/types/types";

/**
 * `roles.permissions` é um jsonb livre. O portal trata como uma lista de
 * chaves de módulo do BANCO (`sales`, `stock`…), no formato
 * `{ "modules": ["sales", "products"] }`.
 *
 * A leitura aceita também um array puro, porque é o formato mais provável de
 * alguém escrever à mão no painel do Supabase — melhor entender os dois do que
 * quebrar por causa de um envelope.
 */
export function roleModules(
  permissions: unknown,
  dbParaPortal: (k: string) => ModuleKey | undefined,
): ModuleKey[] {
  const gross = Array.isArray(permissions)
    ? permissions
    : typeof permissions === "object" && permissions !== null
      ? ((permissions as { modules?: unknown }).modules ?? [])
      : [];

  if (!Array.isArray(gross)) return [];

  const out: ModuleKey[] = [];
  for (const k of gross) {
    const m = typeof k === "string" ? dbParaPortal(k) : undefined;
    if (m && !out.includes(m)) out.push(m);
  }
  return PERMISSION_MODULES.filter((m) => out.includes(m));
}

/** O formato que o portal grava de volta em `roles.permissions`. */
export function permissionsToDb(modules: ModuleKey[], portalParaDb: Partial<Record<ModuleKey, string>>) {
  return { modules: modules.map((m) => portalParaDb[m]).filter(Boolean) };
}
