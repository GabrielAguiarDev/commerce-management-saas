/**
 * Normaliza para comparação: minúsculas, sem acento, sem espaço nas pontas.
 *
 * A busca do app precisa achar "acaraje" quando o produto é "Acarajé". Sem
 * isso, metade do catálogo brasileiro fica inalcançável pelo teclado.
 */
export function normalizar(texto: string): string {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/** `true` quando `agulha` está vazia (busca neutra) ou aparece em `palheiro`. */
export function contem(palheiro: string, agulha: string): boolean {
  const a = normalizar(agulha);
  if (!a) return true;
  return normalizar(palheiro).includes(a);
}

/**
 * Iniciais para o avatar. Uma letra para nome simples, duas para nome composto.
 * O protótipo mostra só "M"/"R", mas nomes compostos aparecem na lista de
 * equipe — a mesma função serve os dois lugares.
 */
export function iniciais(nome: string, maximo = 1): string {
  const partes = String(nome ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (partes.length === 0) return '?';
  return partes
    .slice(0, maximo)
    .map((p) => (p[0] ?? '').toUpperCase())
    .join('');
}

/** Pluralização simples de contadores: `pluralizar(1,'item','itens')`. */
export function pluralizar(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`;
}
