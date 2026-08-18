import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

/**
 * A moldura das três páginas do rodapé.
 *
 * `(institucional)` entre parênteses é um GRUPO DE ROTA: ele não aparece na
 * URL — as páginas continuam sendo `/sobre`, `/contato` e `/termos` —, serve
 * só para as três compartilharem este layout sem que a home o herde. A home
 * monta o próprio cabeçalho e rodapé em `app/page.tsx`, e é bom que continue
 * assim: ela tem `<main>` com sete dobras e uma ordem que é o argumento dela.
 *
 * O CABEÇALHO É O MESMO DA VITRINE, de propósito. Os links dele apontam para
 * `/#modulos` e `/#planos` (ver `lib/links.ts`), então de dentro de qualquer
 * uma destas páginas eles voltam para a home e pousam na dobra certa.
 *
 * O fundo é `--bg` e não `--surface`: estas páginas são uma coluna de texto, e
 * o cinza claríssimo da página é o que faz os cards de dentro terem borda.
 */
export default function InstitucionalLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main style={{ background: "var(--bg)", padding: "clamp(36px,5vw,64px) 20px clamp(64px,8vw,96px)" }}>
        {children}
      </main>
      <Footer />
    </>
  );
}
