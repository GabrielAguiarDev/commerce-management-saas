import { Botao } from './Botao';
import { Box } from './Box';
import { Text } from './Text';

interface EstadoVazioProps {
  titulo: string;
  texto: string;
  rotuloAcao?: string;
  aoTocarAcao?: () => void;
}

/**
 * "Nada encontrado" com saída.
 *
 * A CTA não é enfeite: o estado vazio da busca em Vender oferece cadastrar o
 * produto na hora, para que uma busca frustrada não interrompa a venda.
 */
export function EstadoVazio({ titulo, texto, rotuloAcao, aoTocarAcao }: EstadoVazioProps) {
  return (
    <Box alignItems="center" paddingVertical="s38" paddingHorizontal="s20">
      <Text variant="titleSm" marginBottom="s6" textAlign="center">
        {titulo}
      </Text>
      <Text variant="bodySm" color="textMuted" textAlign="center">
        {texto}
      </Text>
      {rotuloAcao && aoTocarAcao ? (
        <Box marginTop="s14">
          <Botao
            titulo={rotuloAcao}
            aoTocar={aoTocarAcao}
            altura={44}
            raio={14}
            larguraTotal={false}
            variantTexto="buttonXs"
          />
        </Box>
      ) : null}
    </Box>
  );
}
