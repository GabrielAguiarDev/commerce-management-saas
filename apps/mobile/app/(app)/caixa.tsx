import { Botao, Box, Cartao, Divisor, Icone, Pilula, Screen, Text } from '@components';
import {
  rotularDiferenca,
  useAbrirCaixa,
  useHistoricoDeCaixa,
  useTurnoAberto,
} from '@domain/cash';
import { TOASTS } from '@i18n';
import { useUIStore } from '@store/uiStore';
import { formatarBRL } from '@utils/dinheiro';

/**
 * Caixa: dois estados numa rota só, como no protótipo.
 *
 * Fechado → convite para abrir + histórico de turnos.
 * Aberto  → card petrol com a gaveta, recebido por forma e as três ações.
 *
 * Manter numa rota só (e não `/caixa` + `/caixa/aberto`) é fiel ao produto: o
 * dono pensa "o caixa", não "duas telas". Abrir o caixa não deve empurrar
 * ninguém para outra rota nem colocar um botão voltar no meio do turno.
 */
export default function TelaCaixa() {
  const { data: turno, isPending } = useTurnoAberto();
  const { data: historico = [] } = useHistoricoDeCaixa();
  const { mutate: abrirCaixa, isPending: abrindo } = useAbrirCaixa();
  const abrirSheet = useUIStore((s) => s.abrirSheet);
  const mostrarToast = useUIStore((s) => s.mostrarToast);

  const subtitulo = turno ? 'Turno aberto hoje' : 'Nenhum turno aberto';

  // Enquanto não se sabe se o caixa está aberto, mostra a moldura da tela sem
  // conteúdo: alternar de "fechado" para "aberto" depois de renderizar seria
  // um salto visual feio bem no meio do turno.
  if (isPending) {
    return (
      <Screen titulo="Caixa" subtitulo={subtitulo}>
        {null}
      </Screen>
    );
  }

  if (!turno) {
    return (
      <Screen titulo="Caixa" subtitulo={subtitulo}>
        <Cartao borderRadius="r22" padding="s22" alignItems="center">
          <Box
            width={62}
            height={62}
            borderRadius="r20"
            backgroundColor="surface2"
            alignItems="center"
            justifyContent="center"
            marginBottom="s14"
          >
            <Icone nome="caixa" tamanho={26} cor="textMuted" />
          </Box>
          <Text variant="titleMd">O caixa está fechado</Text>
          <Text
            variant="bodySm"
            color="textMuted"
            textAlign="center"
            marginTop="s8"
            marginBottom="s18"
          >
            Abra o caixa para começar o dia e acompanhar o dinheiro que entra e sai.
          </Text>
          <Botao
            titulo="Abrir caixa"
            aoTocar={() =>
              abrirCaixa(undefined, { onSuccess: () => mostrarToast(TOASTS.caixaAberto) })
            }
            carregando={abrindo}
            altura={52}
          />
        </Cartao>

        <Text variant="sectionLabel" color="textMuted" marginTop="s6">
          Turnos anteriores
        </Text>

        {historico.map((t) => {
          const diferenca = rotularDiferenca(t.diferencaCentavos, formatarBRL);
          return (
            <Box
              key={t.id}
              backgroundColor="surface"
              borderColor="line"
              borderWidth={1}
              borderRadius="r18"
              padding="s14"
              flexDirection="row"
              alignItems="center"
              gap="s12"
            >
              <Box flex={1}>
                <Text variant="titleXs">{t.dataRotulo}</Text>
                <Text variant="captionSm" color="textMuted" marginTop="s3">
                  {t.periodoRotulo}
                </Text>
              </Box>
              <Box alignItems="flex-end">
                <Text variant="titleXs">{formatarBRL(t.totalCentavos)}</Text>
                <Text
                  variant="hint"
                  color={diferenca.tom === 'neutro' ? 'success' : 'warning'}
                  marginTop="s3"
                >
                  {diferenca.texto}
                </Text>
              </Box>
            </Box>
          );
        })}
      </Screen>
    );
  }

  return (
    <Screen titulo="Caixa" subtitulo={subtitulo}>
      <Box backgroundColor="petrol" borderRadius="r22" padding="s20">
        <Box flexDirection="row" justifyContent="space-between" alignItems="center">
          <Text variant="chipLabel" color="onPetrol" opacity={0.7}>
            Na gaveta agora
          </Text>
          <Pilula
            texto={`Aberto às ${turno.abertoEm}`}
            corDeFundo="shiftPillBg"
            corDoTexto="shiftPillFg"
            paddingH={10}
            paddingV={5}
          />
        </Box>
        <Text variant="displayValue" color="onPetrol" marginTop="s8" marginBottom="s4">
          {formatarBRL(turno.gavetaCentavos)}
        </Text>
        <Text variant="chipLabel" color="onPetrol" opacity={0.65}>
          Abertura {formatarBRL(turno.aberturaCentavos)} · vendas em dinheiro{' '}
          {formatarBRL(turno.vendasEmDinheiroCentavos)}
        </Text>
      </Box>

      <Cartao paddingVertical="s6" paddingHorizontal="s16">
        <Text variant="sectionTitle" paddingTop="s13" paddingBottom="s4">
          Recebido no turno
        </Text>
        {turno.recebimentos.map((r) => (
          <Box key={r.forma}>
            <Divisor />
            <Box flexDirection="row" alignItems="center" gap="s10" paddingVertical="s11">
              <Box flex={1}>
                <Text variant="rowLabel">{r.forma}</Text>
              </Box>
              <Text variant="titleXs">{formatarBRL(r.valorCentavos)}</Text>
            </Box>
          </Box>
        ))}
      </Cartao>

      <Box flexDirection="row" gap="s10">
        <Box flex={1}>
          <Botao
            titulo="Sangria"
            aoTocar={() => abrirSheet({ tipo: 'sangria' })}
            variante="secundario"
            altura={52}
            variantTexto="buttonXs"
          />
        </Box>
        <Box flex={1}>
          <Botao
            titulo="Reforço"
            aoTocar={() => abrirSheet({ tipo: 'reforco' })}
            variante="secundario"
            altura={52}
            variantTexto="buttonXs"
          />
        </Box>
      </Box>

      <Botao
        titulo="Fechar caixa"
        aoTocar={() => abrirSheet({ tipo: 'fechamento' })}
        altura={54}
        variantTexto="buttonMd"
      />
    </Screen>
  );
}
