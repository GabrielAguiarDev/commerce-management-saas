import { Audiences } from "@/components/Audiences";
import { FinalCta } from "@/components/FinalCta";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { Modules } from "@/components/Modules";
import { Numbers } from "@/components/Numbers";
import { Plans } from "@/components/Plans";
import { Testimonial } from "@/components/Testimonial";

/**
 * A página de entrada do Aguiar One.
 *
 * A ordem das dobras é o argumento, e é por isso que ela mora inteira aqui, num
 * arquivo que se lê de uma vez: promete (Hero), diz para quem serve
 * (Audiences), mostra o que tem (Modules), tira o medo de começar (Numbers),
 * dá o preço (Plans), traz alguém que já usa (Testimonial) e pede a decisão
 * (FinalCta).
 *
 * `<Numbers>` está no lugar que era de `<HowItWorks>`, e faz o mesmo trabalho
 * na argumentação por outro caminho: em vez de dizer que começar é fácil em
 * três passos, mostra o preço, o tempo e o que vem junto. O componente antigo
 * continua no repositório, com uma nota no topo — trazê-lo de volta é trocar
 * esta linha.
 *
 * As dobras alternam claro e escuro. `<Numbers>` é a única com JavaScript de
 * aplicação — o contador —, e mesmo ela manda o número final no HTML: o resto
 * da página continua sendo HTML e CSS e nada mais.
 */
/**
 * A REDE DE SEGURANÇA DO CACHE — uma hora.
 *
 * A página é gerada uma vez e servida como HTML pronto; nenhuma visita
 * consulta o banco. Quem normalmente traz uma mudança da vitrine para cá é o
 * console, que chama `/api/revalidate` no instante em que alguém salva — este
 * número é só o que acontece se aquela chamada não chegar (deploy sem a
 * variável, landing fora do ar no momento do save, rede).
 *
 * Uma hora porque é o maior atraso que ainda é aceitável para um PREÇO: se o
 * aviso se perder, o valor errado fica no ar por no máximo uma hora, e o custo
 * é uma consulta por hora por região. Um dia seria barato demais para o
 * estrago; cinco minutos, caro sem motivo, já que o caminho normal é
 * instantâneo.
 */
export const revalidate = 3600;

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Audiences />
        <Modules />
        <Numbers />
        <Plans />
        <Testimonial />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
