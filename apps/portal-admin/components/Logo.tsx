import Image from "next/image";

/**
 * A marca do Aguiar One — o "AO" do arquivo, não um desenho parecido com ele.
 *
 * Antes daqui o console tinha um `MarcaIcone`: um triângulo com uma barrinha,
 * traçado à mão em `lib/icons.tsx`, pintado de `currentColor` e assentado sobre
 * um quadrado da cor de destaque. Era uma letra "A" genérica, e mudava de cor
 * junto com o tema — ou seja, não era a marca.
 *
 * O que este componente mostra é `public/images/icon.png`: o "AO" azul da marca
 * (`#387a9f`) SOBRE FUNDO TRANSPARENTE. É a mesma arte que o app mobile instala
 * como ícone, só que sem o ladrilho branco — a versão sobre o petrol da marca
 * continua em `public/images/icon-bg.png`, para onde um quadrado escuro e
 * opaco for mesmo o certo.
 *
 * Por ser transparente, a marca pousa direto no fundo de quem a hospeda: o
 * `--side` da barra lateral no console, a superfície clara na tela de entrada.
 * Daí ela NÃO ter cor, fundo nem canto arredondado aqui — arredondar um PNG sem
 * fundo não recorta nada, só finge uma borda que não existe.
 *
 * O arquivo é quadrado e a marca é larga (1,7 : 1): ela ocupa 76% da largura e
 * cerca de 45% da altura — a mesma altura óptica que o antigo "A" tinha —, e o
 * resto é folga. Por isso a caixa não muda de tamanho com a troca da marca.
 */

interface LogoProps {
  /** O LADO da caixa da marca, em pixels. A imagem é quadrada. */
  size?: number;
  /** Só na primeira dobra: evita o quadro vazio no primeiro frame do console. */
  priority?: boolean;
}

export function Logo({ size = 36, priority = false }: LogoProps) {
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
