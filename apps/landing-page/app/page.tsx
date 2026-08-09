import { Audiences } from "@/components/Audiences";
import { FinalCta } from "@/components/FinalCta";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";
import { Modules } from "@/components/Modules";
import { Plans } from "@/components/Plans";
import { Testimonial } from "@/components/Testimonial";

/**
 * A página de entrada do Aguiar One.
 *
 * A ordem das dobras é o argumento, e é por isso que ela mora inteira aqui, num
 * arquivo que se lê de uma vez: promete (Hero), diz para quem serve
 * (Audiences), mostra o que tem (Modules), tira o medo de começar (HowItWorks),
 * dá o preço (Plans), traz alguém que já usa (Testimonial) e pede a decisão
 * (FinalCta).
 *
 * As dobras alternam claro e escuro. Nenhuma tem estado, nenhuma precisa do
 * navegador: a página inteira é um componente de servidor, e o que chega ao
 * cliente é HTML e CSS, sem JavaScript de aplicação.
 */
export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Audiences />
        <Modules />
        <HowItWorks />
        <Plans />
        <Testimonial />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
