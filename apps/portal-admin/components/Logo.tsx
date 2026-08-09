import Image from "next/image";

/**
 * A marca do Aguiar One — o "A" do arquivo, não um desenho parecido com ele.
 *
 * Antes daqui o console tinha um `MarcaIcone`: um triângulo com uma barrinha,
 * traçado à mão em `lib/icons.tsx`, pintado de `currentColor` e assentado sobre
 * um quadrado da cor de destaque. Era uma letra "A" genérica, e mudava de cor
 * junto com o tema — ou seja, não era a marca.
 *
 * O que este componente mostra é `public/images/icon.png`, o MESMO ladrilho que
 * o app mobile instala como ícone do aplicativo: o "A" azul da marca sobre o
 * petrol quase preto (`#030f19`, o secundário da marca). É por isso que ele NÃO
 * recebe cor nem fundo — os dois já vêm dentro da imagem, e é justamente isso
 * que faz o console, o celular e o ícone na barra do navegador mostrarem a
 * mesma coisa.
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
   * Acompanha o tamanho, e por isso é dado de fora: no topo da barra lateral o
   * ladrilho tem 36px e raio 10, na tela de entrada tem 42px e raio 12.
   */
  radius?: number;
  /** Só na primeira dobra: evita o quadro vazio no primeiro frame do console. */
  priority?: boolean;
}

export function Logo({ size = 36, radius = 10, priority = false }: LogoProps) {
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
