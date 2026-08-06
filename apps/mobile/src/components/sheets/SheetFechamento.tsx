import { useState } from 'react';

import { BottomSheet } from '@components/patterns/BottomSheet';
import { Botao } from '@components/ui/Botao';
import { Box } from '@components/ui/Box';
import { Campo } from '@components/ui/Campo';
import { Divisor } from '@components/ui/Divisor';
import { Text } from '@components/ui/Text';
import { calcularDiferenca, linhasDeConferencia, useFecharCaixa, useTurnoAberto } from '@domain/cash';
import { CONFIRMACOES, ERROS_CAIXA, TOASTS } from '@i18n';
import { CaixaError } from '@domain/cash/cashTypes';
import { useUIStore } from '@store/uiStore';
import { formatarBRL, formatarBRLAssinado } from '@utils/dinheiro';

/**
 * "Fechar o caixa": a conferência.
 *
 * A diferença é recalculada A CADA TECLA, e é isso que faz o dono entender o
 * que está fazendo. Linha em branco não conta — ver `calcularDiferenca`, que é
 * função pura e tem teste dedicado justamente porque é o número que decide se
 * alguém vai ser acusado de furo de caixa.
 */
export function SheetFechamento() {
  const { data: turno } = useTurnoAberto();
  const fecharSheet = useUIStore((s) => s.fecharSheet);
  const mostrarToast = useUIStore((s) => s.mostrarToast);
  const pedirConfirmacao = useUIStore((s) => s.pedirConfirmacao);
  const { mutate: fecharCaixa, isPending } = useFecharCaixa();

  const [conferido, setConferido] = useState<Record<string, string>>({});

  const linhas = turno ? linhasDeConferencia(turno) : [];
  const diferenca = calcularDiferenca(linhas, conferido);

  function pedirFechamento() {
    pedirConfirmacao({
      titulo: CONFIRMACOES.fecharCaixa.titulo,
      texto: CONFIRMACOES.fecharCaixa.texto,
      rotuloBotao: CONFIRMACOES.fecharCaixa.botao,
      destrutivo: false,
      aoConfirmar: () =>
        fecharCaixa(diferenca.diferencaCentavos, {
          onSuccess: () => {
            fecharSheet();
            mostrarToast(TOASTS.caixaFechado);
          },
          onError: (erro) => {
            const codigo = erro instanceof CaixaError ? erro.codigo : 'desconhecido';
            mostrarToast(ERROS_CAIXA[codigo], { tom: 'erro' });
          },
        }),
    });
  }

  return (
    <BottomSheet titulo="Fechar o caixa" aoFechar={fecharSheet}>
      <Text variant="bodySm" color="textMuted" marginBottom="s14">
        Confira quanto realmente tem em cada forma. A gente calcula a diferença pra você.
      </Text>

      {linhas.map((linha) => (
        <Box key={linha.forma}>
          <Box flexDirection="row" alignItems="center" gap="s10" paddingVertical="s10">
            <Box flex={1}>
              <Text variant="sectionTitle">{linha.forma}</Text>
              <Text variant="hint" color="textMuted" marginTop="s2">
                sistema {formatarBRL(linha.esperadoCentavos)}
              </Text>
            </Box>
            <Box width={104}>
              <Campo
                valor={conferido[linha.forma] ?? ''}
                aoMudar={(t) => setConferido((atual) => ({ ...atual, [linha.forma]: t }))}
                placeholder="0,00"
                keyboardType="decimal-pad"
                altura={44}
                raio={12}
                alinharADireita
                accessibilityLabel={`Valor conferido em ${linha.forma}`}
              />
            </Box>
          </Box>
          <Divisor />
        </Box>
      ))}

      <Box
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
        paddingVertical="s16"
      >
        <Text variant="sectionTitle" color="textMuted">
          Diferença
        </Text>
        <Text variant="statValue">
          {diferenca.informado
            ? formatarBRLAssinado(diferenca.diferencaCentavos)
            : formatarBRL(0)}
        </Text>
      </Box>

      <Botao
        titulo="Conferir e fechar"
        aoTocar={pedirFechamento}
        altura={54}
        variantTexto="buttonMd"
        carregando={isPending}
        desabilitado={!turno}
      />
    </BottomSheet>
  );
}
