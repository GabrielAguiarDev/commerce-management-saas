import Image from "next/image";

/**
 * A marca do Aguiar One — o "A" do arquivo, não um desenho parecido com ele.
 *
 * Antes daqui o portal desenhava um ladrilho com as letras "A1" em
 * monoespaçada, pintado de `--petrol`. Era um texto, não a marca: mudava de cor
 * junto com o tema e não se parecia com o ícone que a mesma pessoa tinha na
 * tela de início do celular.
 *
 * O que este componente mostra é `public/images/icon.png`: o "A" azul da marca
 * (`#1b9abd`) SOBRE FUNDO TRANSPARENTE — o mesmo arquivo que o console usa no
 * topo da barra lateral. A versão com o ladrilho petrol (`#020e18`, o
 * secundário da marca) continua ao lado, em `public/images/icon-bg.png`, para
 * onde um quadrado opaco for mesmo o certo; os ícones do PWA em
 * `public/icons/` são desse segundo tipo e seguem como estavam.
 *
 * Por ser transparente, a marca pousa direto no fundo de quem a hospeda, claro
 * ou escuro. Daí ela NÃO receber cor, fundo nem canto arredondado aqui —
 * arredondar um PNG sem fundo não recorta nada, só finge uma borda que não
 * existe.
 *
 * O arquivo é quadrado e tem a folga própria de ícone de app nas bordas; por
 * isso o desenho ocupa cerca de 44% do lado, e não o lado inteiro.
 */

interface LogoProps {
  /** O LADO da caixa da marca, em pixels. A imagem é quadrada. */
  size?: number;
  /** Só na primeira dobra: evita o quadro vazio no primeiro frame do portal. */
  priority?: boolean;
}

export function Logo({ size = 44, priority = false }: LogoProps) {
  return (
    <Image
      src="/images/icon.png"
      alt="Aguiar One"
      width={size}
      height={size}
      priority={priority}
      style={{ flex: "none", display: "block" }}
    />
  );
}
