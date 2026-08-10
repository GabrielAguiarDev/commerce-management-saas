import Image from "next/image";

/**
 * A marca do Aguiar One — o "A" do arquivo, não um desenho parecido com ele.
 *
 * Antes daqui o portal desenhava um ladrilho com as letras "A1" em
 * monoespaçada, pintado de `--petrol`. Era um texto, não a marca: mudava de cor
 * junto com o tema e não se parecia com o ícone que a mesma pessoa tinha na
 * tela de início do celular.
 *
 * O que este componente mostra é `public/images/icon.png` — o MESMO ladrilho
 * que o app mobile instala como ícone, que o console usa na barra lateral e que
 * o site de entrada usa no cabeçalho: o "A" azul da marca (`#1b9abd`) sobre o
 * petrol quase preto (`#020e18`, o secundário da marca). É por isso que ele NÃO
 * recebe cor nem fundo — os dois já vêm dentro da imagem, e é justamente isso
 * que faz o portal, o console, o site e o celular mostrarem a mesma coisa.
 *
 * O arquivo é quadrado e tem folga própria nas bordas, como todo ícone de app;
 * por isso o desenho ocupa cerca de 44% do lado, e não o lado inteiro.
 */

interface LogoProps {
  /** O LADO do ladrilho, em pixels. A imagem é quadrada. */
  size?: number;
  /**
   * O arredondamento do canto, em pixels.
   *
   * Acompanha o tamanho, e por isso é dado de fora: na tela de entrada do
   * portal o ladrilho tem 44px e raio 12, no login do celular tem 52px e
   * raio 14.
   */
  radius?: number;
  /** Só na primeira dobra: evita o quadro vazio no primeiro frame do portal. */
  priority?: boolean;
}

export function Logo({ size = 44, radius = 12, priority = false }: LogoProps) {
  return (
    <Image
      src="/images/icon.png"
      alt="Aguiar One"
      width={size}
      height={size}
      priority={priority}
      style={{ flex: "none", borderRadius: radius + "px", display: "block" }}
    />
  );
}
