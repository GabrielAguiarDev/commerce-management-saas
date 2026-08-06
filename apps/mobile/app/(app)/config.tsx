import { useState } from 'react';

import {
  Avatar,
  Botao,
  Box,
  Campo,
  Cartao,
  Divisor,
  Interruptor,
  Screen,
  Text,
  Toque,
} from '@components';
import { ROTAS } from '@domain/navigation/rotas';
import {
  rotularModulos,
  useAtividades,
  useEquipe,
  useSalvarDadosDoNegocio,
  useTenantAtual,
} from '@domain/tenant';
import { TOASTS } from '@i18n';
import { router } from 'expo-router';
import { FORMAS_DE_PAGAMENTO, usePreferenciasStore } from '@store/preferenciasStore';
import { useUIStore } from '@store/uiStore';

type Aba = 'negocio' | 'prefs' | 'equipe' | 'plano';

const ABAS: { chave: Aba; rotulo: string }[] = [
  { chave: 'negocio', rotulo: 'Negócio' },
  { chave: 'prefs', rotulo: 'Preferências' },
  { chave: 'equipe', rotulo: 'Equipe' },
  { chave: 'plano', rotulo: 'Conta e plano' },
];

export default function TelaConfiguracoes() {
  const [aba, setAba] = useState<Aba>('negocio');

  return (
    <Screen titulo="Configurações" subtitulo="Seu negócio do seu jeito">
      <Box
        flexDirection="row"
        gap="s6"
        backgroundColor="surface2"
        borderRadius="r14"
        padding="s4"
        accessibilityRole="tablist"
      >
        {ABAS.map((a) => {
          const ativa = a.chave === aba;
          return (
            <Toque
              key={a.chave}
              accessibilityLabel={a.rotulo}
              accessibilityRole="tab"
              accessibilityState={{ selected: ativa }}
              onPress={() => setAba(a.chave)}
              flex={1}
              height={38}
              borderRadius="r11"
              backgroundColor={ativa ? 'surface' : 'transparent'}
              alignItems="center"
              justifyContent="center"
            >
              <Text
                variant="chipLabel"
                color={ativa ? 'textPrimary' : 'textMuted'}
                numberOfLines={1}
                // As quatro abas não cabem lado a lado em tela pequena; o
                // protótipo rolava na horizontal. Encolher a fonte mantém as
                // quatro visíveis, que é melhor para uma tela de ajustes.
                adjustsFontSizeToFit
              >
                {a.rotulo}
              </Text>
            </Toque>
          );
        })}
      </Box>

      {aba === 'negocio' ? <AbaNegocio /> : null}
      {aba === 'prefs' ? <AbaPreferencias /> : null}
      {aba === 'equipe' ? <AbaEquipe /> : null}
      {aba === 'plano' ? <AbaPlano /> : null}
    </Screen>
  );
}

function AbaNegocio() {
  const { data: tenant } = useTenantAtual();
  const { mutate: salvar, isPending } = useSalvarDadosDoNegocio();
  const mostrarToast = useUIStore((s) => s.mostrarToast);

  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [preenchidoCom, setPreenchidoCom] = useState<string | null>(null);

  /**
   * O tenant chega DEPOIS do primeiro render (react-query), então
   * `useState(tenant?.nome)` nasceria vazio para sempre.
   *
   * O ajuste é feito DURANTE O RENDER e guardado por id, não num `useEffect`:
   * é o padrão que a documentação do React recomenda para "estado derivado de
   * prop que mudou" e evita o render extra com o campo em branco. Com effect,
   * o usuário vê o formulário vazio por um frame — e se estiver digitando
   * quando a query revalidar, perde o que digitou.
   */
  if (tenant && preenchidoCom !== tenant.id) {
    setPreenchidoCom(tenant.id);
    setNome(tenant.nome);
    setTelefone(tenant.telefone ?? '');
  }

  return (
    <Cartao padding="s18" gap="s14">
      <Campo rotulo="Nome do negócio" valor={nome} aoMudar={setNome} altura={48} raio={13} />
      <Campo
        rotulo="Telefone / WhatsApp"
        valor={telefone}
        aoMudar={setTelefone}
        altura={48}
        raio={13}
        keyboardType="phone-pad"
      />
      <Botao
        titulo="Salvar"
        aoTocar={() =>
          salvar(
            { nome, telefone },
            { onSuccess: () => mostrarToast(TOASTS.negocioSalvo) },
          )
        }
        altura={50}
        raio={14}
        variantTexto="buttonSm"
        carregando={isPending}
      />
    </Cartao>
  );
}

function AbaPreferencias() {
  const formasAceitas = usePreferenciasStore((s) => s.formasAceitas);
  const alternarForma = usePreferenciasStore((s) => s.alternarForma);
  const temaEscuro = usePreferenciasStore((s) => s.temaEscuro);
  const alternarTema = usePreferenciasStore((s) => s.alternarTema);

  return (
    <>
      <Cartao paddingVertical="s6" paddingHorizontal="s16">
        <Text variant="sectionTitle" paddingTop="s13" paddingBottom="s6">
          Formas de pagamento aceitas
        </Text>
        {FORMAS_DE_PAGAMENTO.map((forma) => (
          <Box key={forma}>
            <Divisor />
            <Box flexDirection="row" alignItems="center" gap="s10" paddingVertical="s11">
              <Box flex={1}>
                <Text variant="rowLabel">{forma}</Text>
              </Box>
              <Interruptor
                ligado={formasAceitas[forma]}
                aoAlternar={() => alternarForma(forma)}
                rotulo={`Aceitar ${forma}`}
              />
            </Box>
          </Box>
        ))}
      </Cartao>

      <Cartao padding="s16" flexDirection="row" alignItems="center" gap="s12">
        <Box flex={1}>
          <Text variant="rowLabel">Tema escuro</Text>
        </Box>
        <Interruptor ligado={temaEscuro} aoAlternar={alternarTema} rotulo="Tema escuro" />
      </Cartao>
    </>
  );
}

function AbaEquipe() {
  const { data: equipe = [] } = useEquipe();
  const { data: atividades = [] } = useAtividades();

  return (
    <>
      {equipe.map((membro) => (
        <Box
          key={membro.id}
          backgroundColor="surface"
          borderColor="line"
          borderWidth={1}
          borderRadius="r18"
          padding="s14"
          flexDirection="row"
          alignItems="center"
          gap="s12"
        >
          <Avatar iniciais={membro.iniciais} />
          <Box flex={1}>
            <Text variant="titleXs">{membro.nome}</Text>
            <Text variant="captionSm" color="textMuted" marginTop="s2">
              {membro.papel}
            </Text>
          </Box>
          <Text variant="hint" color="textMuted">
            {membro.acesso}
          </Text>
        </Box>
      ))}

      <Cartao paddingVertical="s6" paddingHorizontal="s16">
        <Text variant="sectionTitle" paddingTop="s13" paddingBottom="s6">
          Quem fez o quê
        </Text>
        {atividades.map((a) => (
          <Box key={a.id}>
            <Divisor />
            <Box paddingVertical="s11">
              <Text variant="rowText">{a.texto}</Text>
              <Text variant="hint" color="textMuted" marginTop="s3">
                {a.quando}
              </Text>
            </Box>
          </Box>
        ))}
      </Cartao>
    </>
  );
}

function AbaPlano() {
  const { data: tenant } = useTenantAtual();

  return (
    <>
      <Cartao padding="s18">
        <Text variant="moneyMd">{tenant?.plano.nome ?? '—'}</Text>
        <Text variant="caption" color="textMuted" marginTop="s6" lineHeight={19}>
          Módulos ativos: {rotularModulos(tenant?.modulos ?? [])}
        </Text>
        <Text variant="caption" color="textMuted" marginTop="s4">
          {tenant?.plano.renovaEm
            ? `Renova em ${tenant.plano.renovaEm.toLocaleDateString('pt-BR')}`
            : 'Sem data de renovação'}
        </Text>
      </Cartao>

      <Botao
        titulo="Quero mudar meu plano"
        aoTocar={() => router.push(ROTAS.suporte as never)}
        variante="contorno"
        altura={52}
        raio={16}
        variantTexto="buttonSm"
      />
    </>
  );
}
