import { VitrineView } from "@/components/views/VitrineView";
import { listShowcase } from "@/lib/vitrine";

/**
 * A vitrine de planos do site.
 *
 * ┌─ POR QUE A LEITURA É AQUI, E NÃO NO `layout.tsx` ──────────────────────┐
 * │ O layout carrega sete consultas em paralelo porque aquelas listas      │
 * │ alimentam quatro telas de uma vez e precisam concordar entre si. A     │
 * │ vitrine não alimenta nenhuma outra tela: somar duas consultas ao       │
 * │ bloco do layout faria TODA navegação do console esperar por um dado    │
 * │ que só esta página usa.                                                │
 * └────────────────────────────────────────────────────────────────────────┘
 *
 * O idioma passado é `pt` porque é no servidor que o preço é formatado e o
 * servidor não conhece a preferência de idioma do console — ela vive no
 * estado do cliente. O que muda entre os dois é só o rótulo de "sob consulta";
 * o número em si é o mesmo.
 */
export default async function Page() {
  const { cards, error } = await listShowcase("pt");
  return <VitrineView cards={cards} error={error} />;
}
