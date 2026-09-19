import Image from "next/image";

/**
 * A marca do Aguiar One — o "AO" do arquivo, não um desenho parecido com ele.
 *
 * Antes daqui o portal desenhava um ladrilho com as letras "A1" em
 * monoespaçada, pintado de `--petrol`. Era um texto, não a marca: mudava de cor
 * junto com o tema e não se parecia com o ícone que a mesma pessoa tinha na
 * tela de início do celular.
 *
 * O que este componente mostra é `public/images/icon.png`: o "AO" azul da marca
 * (`#387a9f`) SOBRE FUNDO TRANSPARENTE — o mesmo arquivo que o console usa no
 * topo da barra lateral. A versão com o ladrilho petrol (`#020e18`, o
 * secundário da marca) continua ao lado, em `public/images/icon-bg.png`, para
 * onde um quadrado escuro e opaco for mesmo o certo. Os ícones do PWA em
 * `public/icons/` são um terceiro tipo: o ladrilho BRANCO do ícone do app.
 *
 * Por ser transparente, a marca pousa direto no fundo de quem a hospeda, claro
 * ou escuro. Daí ela NÃO receber cor, fundo nem canto arredondado aqui —
 * arredondar um PNG sem fundo não recorta nada, só finge uma borda que não
 * existe.
 *
 * O arquivo é quadrado e a marca é larga (1,7 : 1): ela ocupa 76% da largura e
 * cerca de 45% da altura — a mesma altura óptica que o antigo "A" tinha —, e o
 * resto é folga. Por isso a caixa não muda de tamanho com a troca da marca.
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
