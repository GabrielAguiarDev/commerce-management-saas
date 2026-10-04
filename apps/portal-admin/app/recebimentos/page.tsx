import { RecebimentosView } from "@/components/views/RecebimentosView";
import { loadMercadoPago } from "@/lib/mercadoPago";
import { parsePeriod } from "@/lib/recebimentos";

/**
 * A conta do Mercado Pago.
 *
 * A leitura é AQUI, e não no `layout.tsx`, pelo mesmo motivo da vitrine: só
 * esta tela usa o dado, e ele custa uma ida à API do Mercado Pago — colocá-lo
 * no bloco do layout faria toda navegação do console esperar por ele.
 *
 * O período vive na URL (`?dias=7|30|90`) para o "voltar" do navegador e o
 * recarregar manterem o que a pessoa escolheu.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ dias?: string | string[] }>;
}) {
  const days = parsePeriod((await searchParams).dias);
  const result = await loadMercadoPago(days);
  return <RecebimentosView result={result} days={days} />;
}
