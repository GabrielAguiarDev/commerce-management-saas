import { router } from 'expo-router';

import { Box, Cartao, Divisor, Icone, Pilula, Screen, Text, Toque } from '@components';
import { produtosEmAlerta, useCatalogo } from '@domain/catalog';
import { useTurnoAberto } from '@domain/cash';
import { ROTAS } from '@domain/navigation/rotas';
import { useResumoDoDia, useUltimasVendas } from '@domain/sales';
import { useCapacidades, useTenantAtual } from '@domain/tenant';
import { useSessaoStore } from '@store/sessaoStore';
import { formatarBRL } from '@utils/dinheiro';
import { pluralizar } from '@utils/texto';

/**
 * Início.
 *
 * Quais cards aparecem é decisão do PLANO: o atalho de caixa só existe com o
 * módulo `cash`, o alerta de estoque só com `stock`. É a mesma capacidade que
 * governa a tab bar e a grade de "Mais" — nada aqui pergunta pela chave do
 * módulo diretamente.
 */
export default function TelaInicio() {
  const usuario = useSessaoStore((s) => s.usuario);
  const { data: tenant } = useTenantAtual();
  const { capacidades } = useCapacidades();
  const { data: resumo } = useResumoDoDia();
  const { data: vendas = [] } = useUltimasVendas();
  const { data: turno } = useTurnoAberto();
  const { data: produtos = [] } = useCatalogo();

  const alertas = capacidades.temEstoque ? produtosEmAlerta(produtos) : [];

  return (
    <Screen
      titulo={`Bom dia, ${primeiroNome(usuario?.nome)}`}
      subtitulo={`${tenant?.nome ?? '—'} · ${dataPorExtenso()}`}
      mostrarVoltar={false}
    >
      <Box backgroundColor="petrol" borderRadius="r22" padding="s20">
        <Text variant="chipLabel" color="onPetrol" opacity={0.65}>
          Vendas de hoje
        </Text>
        <Text variant="heroValue" color="onPetrol" marginTop="s6" marginBottom="s12">
          {formatarBRL(resumo?.totalCentavos ?? 0)}
        </Text>
        <Box flexDirection="row" flexWrap="wrap" gap="s8">
          <Pilula
            texto={pluralizar(resumo?.quantidadeDeVendas ?? 0, 'venda', 'vendas')}
            corDeFundo="pillOnPetrol"
            corDoTexto="onPetrol"
            variante="tinyBold"
            paddingH={11}
            paddingV={6}
          />
          <Pilula
            texto={pluralizar(resumo?.itensVendidos ?? 0, 'item', 'itens')}
            corDeFundo="pillOnPetrol"
            corDoTexto="onPetrol"
            variante="tinyBold"
            paddingH={11}
            paddingV={6}
          />
          <Pilula
            texto={`ticket ${formatarBRL(resumo?.ticketMedioCentavos ?? 0)}`}
            corDeFundo="pillOnPetrol"
            corDoTexto="onPetrol"
            variante="tinyBold"
            paddingH={11}
            paddingV={6}
          />
        </Box>
      </Box>

      <Box flexDirection="row" gap="s12">
        <Cartao flex={1}>
          <Text variant="label" color="textMuted">
            Sobrou hoje
          </Text>
          <Text variant="cardValue" color="success" marginTop="s6">
            {formatarBRL(resumo?.lucroCentavos ?? 0)}
          </Text>
          <Text variant="hint" color="textMuted" marginTop="s4">
            depois dos custos
          </Text>
        </Cartao>

        <Cartao flex={1}>
          <Text variant="label" color="textMuted">
            Mais vendido
          </Text>
          <Text variant="titleSm" marginTop="s6">
            {resumo?.maisVendido?.nome ?? '—'}
          </Text>
          <Text variant="hint" color="textMuted" marginTop="s4">
            {resumo?.maisVendido?.detalhe ?? 'ainda sem vendas hoje'}
          </Text>
        </Cartao>
      </Box>

      {capacidades.temCaixa ? (
        <Toque
          accessibilityLabel={turno ? 'Ver caixa aberto' : 'Abrir o caixa'}
          onPress={() => router.push(ROTAS.caixa as never)}
          backgroundColor="surface"
          borderColor="line"
          borderWidth={1}
          borderRadius="r20"
          padding="s16"
          flexDirection="row"
          alignItems="center"
          gap="s13"
        >
          <Box
            width={42}
            height={42}
            borderRadius="r14"
            backgroundColor="primarySoft"
            alignItems="center"
            justifyContent="center"
          >
            <Icone nome="caixa" tamanho={20} cor="primary" />
          </Box>
          <Box flex={1}>
            <Text variant="titleSm">{turno ? 'Caixa aberto' : 'Caixa fechado'}</Text>
            <Text variant="caption" color="textMuted" marginTop="s3">
              {turno
                ? `Na gaveta agora: ${formatarBRL(turno.gavetaCentavos)}`
                : 'Abra para começar o turno'}
            </Text>
          </Box>
          <Text variant="sectionLabel" color="primary">
            Ver
          </Text>
        </Toque>
      ) : null}

      {alertas.length > 0 ? (
        <Toque
          accessibilityLabel={`${alertas.length} produtos precisando de atenção`}
          onPress={() => router.push(ROTAS.estoque as never)}
          backgroundColor="warningSoft"
          borderColor="warningBorder"
          borderWidth={1}
          borderRadius="r20"
          padding="s16"
          flexDirection="row"
          alignItems="center"
          gap="s13"
        >
          <Box
            width={42}
            height={42}
            borderRadius="r14"
            backgroundColor="warningIconBg"
            alignItems="center"
            justifyContent="center"
          >
            <Icone nome="alerta" tamanho={20} cor="warning" />
          </Box>
          <Box flex={1}>
            <Text variant="titleSm" color="warning">
              {pluralizar(alertas.length, 'produto precisando', 'produtos precisando')} de atenção
            </Text>
            <Text variant="caption" color="warning" opacity={0.8} marginTop="s3">
              {resumirAlertas(alertas)}
            </Text>
          </Box>
        </Toque>
      ) : null}

      <Cartao paddingVertical="s6" paddingHorizontal="s16">
        <Text variant="sectionTitle" paddingTop="s12" paddingBottom="s4">
          Últimas vendas
        </Text>
        {vendas.map((venda) => (
          <Box key={venda.id}>
            <Divisor />
            <Box flexDirection="row" alignItems="center" gap="s12" paddingVertical="s11">
              <Box
                width={34}
                height={34}
                borderRadius="r11"
                backgroundColor="surface2"
                alignItems="center"
                justifyContent="center"
              >
                <Text variant="tinyBold" color="textMuted">
                  {venda.hora}
                </Text>
              </Box>
              <Box flex={1} minWidth={0}>
                <Text variant="rowText" numberOfLines={1}>
                  {venda.resumoItens}
                </Text>
                <Text variant="hint" color="textMuted" marginTop="s2">
                  {venda.formaPagamento}
                </Text>
              </Box>
              <Text variant="titleXs">{formatarBRL(venda.totalCentavos)}</Text>
            </Box>
          </Box>
        ))}
      </Cartao>
    </Screen>
  );
}

function primeiroNome(nome: string | undefined): string {
  return (nome ?? 'você').trim().split(/\s+/)[0] ?? 'você';
}

/** "domingo, 26 de julho" — como o subtítulo do protótipo. */
function dataPorExtenso(): string {
  const hoje = new Date();
  const dia = hoje.toLocaleDateString('pt-BR', { weekday: 'long' });
  const mes = hoje.toLocaleDateString('pt-BR', { month: 'long' });
  return `${dia}, ${hoje.getDate()} de ${mes}`;
}

function resumirAlertas(alertas: { nome: string; estoque: { situacao: string } | null }[]): string {
  return alertas
    .slice(0, 2)
    .map((p) => `${p.nome} ${p.estoque?.situacao === 'zerado' ? 'zerou' : 'está baixo'}`)
    .join(' · ');
}
