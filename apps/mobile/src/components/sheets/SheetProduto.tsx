import { useState } from 'react';

import { BottomSheet } from '@components/patterns/BottomSheet';
import { Botao } from '@components/ui/Botao';
import { Box } from '@components/ui/Box';
import { Campo } from '@components/ui/Campo';
import { useCadastrarProduto } from '@domain/catalog';
import { CatalogoError } from '@domain/catalog/catalogTypes';
import { useCapacidades } from '@domain/tenant';
import { ERROS_CATALOGO, TOASTS } from '@i18n';
import { useUIStore } from '@store/uiStore';
import { lerCentavos } from '@utils/dinheiro';

/**
 * "Cadastro rápido".
 *
 * Os campos de estoque e de custo SÓ EXISTEM se o plano incluir os módulos
 * correspondentes — é o entitlement chegando até o formulário. Pedir "quanto
 * tem" a quem não contratou estoque seria coletar um dado que o app não vai
 * mostrar em lugar nenhum.
 */
export function SheetProduto() {
  const { capacidades } = useCapacidades();
  const fecharSheet = useUIStore((s) => s.fecharSheet);
  const mostrarToast = useUIStore((s) => s.mostrarToast);
  const { mutate: cadastrar, isPending } = useCadastrarProduto();

  const [nome, setNome] = useState('');
  const [preco, setPreco] = useState('');
  const [estoque, setEstoque] = useState('');
  const [minimo, setMinimo] = useState('');
  const [custo, setCusto] = useState('');

  function salvar() {
    cadastrar(
      {
        nome,
        precoCentavos: lerCentavos(preco) ?? 0,
        custoCentavos: capacidades.temCustos ? lerCentavos(custo) : null,
        // Campo em branco vira `null`, não 0: null é "não controla estoque",
        // zero seria "cadastrei já sem nenhum". Ver catalogAdapter.
        estoqueInicial: capacidades.temEstoque ? lerInteiro(estoque) : null,
        estoqueMinimo: capacidades.temEstoque ? (lerInteiro(minimo) ?? 0) : null,
      },
      {
        onSuccess: (produto) => {
          fecharSheet();
          mostrarToast(TOASTS.produtoCadastrado(produto.nome));
        },
        onError: (erro) => {
          const codigo = erro instanceof CatalogoError ? erro.codigo : 'desconhecido';
          mostrarToast(ERROS_CATALOGO[codigo], { tom: 'erro' });
        },
      },
    );
  }

  return (
    <BottomSheet titulo="Cadastro rápido" aoFechar={fecharSheet}>
      <Box gap="s13">
        <Campo
          rotulo="Nome"
          valor={nome}
          aoMudar={setNome}
          placeholder="Ex: Coleira antipulgas"
          autoFocus
        />

        <Campo
          rotulo="Preço de venda"
          valor={preco}
          aoMudar={setPreco}
          placeholder="R$ 0,00"
          keyboardType="decimal-pad"
        />

        {capacidades.temEstoque ? (
          <Box flexDirection="row" gap="s10">
            <Box flex={1}>
              <Campo
                rotulo="Quanto tem"
                valor={estoque}
                aoMudar={setEstoque}
                placeholder="0"
                keyboardType="number-pad"
              />
            </Box>
            <Box flex={1}>
              <Campo
                rotulo="Avisar abaixo de"
                valor={minimo}
                aoMudar={setMinimo}
                placeholder="0"
                keyboardType="number-pad"
              />
            </Box>
          </Box>
        ) : null}

        {capacidades.temCustos ? (
          <Campo
            rotulo="Quanto te custa (opcional)"
            valor={custo}
            aoMudar={setCusto}
            placeholder="R$ 0,00"
            keyboardType="decimal-pad"
          />
        ) : null}

        <Botao
          titulo="Salvar produto"
          aoTocar={salvar}
          altura={54}
          variantTexto="buttonMd"
          carregando={isPending}
        />
      </Box>
    </BottomSheet>
  );
}

function lerInteiro(texto: string): number | null {
  const limpo = texto.replace(/\D/g, '');
  return limpo === '' ? null : Number(limpo);
}
