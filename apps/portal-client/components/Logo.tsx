import Image from "next/image";

/**
 * A marca do Aguiar One — o "AO" do arquivo, não um desenho parecido com ele.
 *
 * Antes daqui o portal desenhava um ladrilho com as letras "A1" em
 * monoespaçada, pintado de `--petrol`. Era um texto, não a marca: mudava de cor
 * junto com o tema e não se parecia com o ícone que a mesma pessoa tinha na
 * tela de início do celular.
 *
 * O que este componente mostra é `public/images/logo-ao.png`: o "AO" azul da
 * marca (`#387a9f`) SOBRE FUNDO TRANSPARENTE e RECORTADO rente ao desenho, sem
 * folga. É a mesma arte nos três apps web, traçada de `MARK` em `@aguiar/brand`.
 *
 * Por ser transparente, a marca pousa direto no fundo de quem a hospeda, claro
 * ou escuro. Daí ela NÃO receber cor, fundo nem canto arredondado aqui —
 * arredondar um PNG sem fundo não recorta nada, só finge uma borda que não
 * existe.
 *
 * `size` é a ALTURA. A marca é larga (≈1,7 : 1), e a largura acompanha: numa
 * caixa quadrada ela ficaria com 45% da altura disponível e sumiria no
 * cabeçalho — foi o que aconteceu na primeira versão do rebrand.
 *
 * ┌─ POR QUE `logo-ao.png`, E NÃO O NOME ANTIGO ────────────────────────────┐
 * │ O arquivo anterior (`icon.png` nos portais, `logo.png` no site) era o   │
 * │ "A". Trocar só o conteúdo mantendo o caminho deixa toda cópia já        │
 * │ baixada — a do navegador, a do otimizador de imagem do Next — servindo  │
 * │ a marca velha de uma URL que agora promete outra. Nome novo, URL nova.  │
 * └──────────────────────────────────────────────────────────────────────────┘
 */

/** A proporção do desenho recortado — a mesma de `MARK` (927 × 545). */
const PROPORCAO = 927 / 545;

interface LogoProps {
  /** A ALTURA da marca, em pixels. A largura sai da proporção do desenho. */
  size?: number;
  /** Só na primeira dobra: evita o quadro vazio no primeiro frame. */
  priority?: boolean;
}

export function Logo({ size = 26, priority = false }: LogoProps) {
  return (
    <Image
      src="/images/logo-ao.png"
      alt="Aguiar One"
      width={Math.round(size * PROPORCAO)}
      height={size}
      priority={priority}
      style={{ flex: "none", display: "block" }}
    />
  );
}
