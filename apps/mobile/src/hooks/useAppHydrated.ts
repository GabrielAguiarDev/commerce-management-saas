import { usePreferenciasStore } from '@store/preferenciasStore';
import { useSessaoStore } from '@store/sessaoStore';

/**
 * `true` quando TODOS os stores persistidos já leram o disco.
 *
 * A lista abaixo é EXPLÍCITA de propósito. Store persistido novo que não for
 * adicionado aqui causa um bug que não aparece em instalação limpa: o portão
 * decide a rota antes daquele store hidratar, a tela monta com o valor padrão
 * e depois "pula" para o valor gravado. Quem instala do zero nunca reproduz —
 * só quem já usava o app.
 *
 * @see app/index.tsx (o portão) e DEVELOPMENT.md › Notas
 */
export function useAppHydrated(): boolean {
  const sessao = useSessaoStore((s) => s.hidratado);
  const preferencias = usePreferenciasStore((s) => s.hidratado);

  return sessao && preferencias;
}
