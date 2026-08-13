import { useState } from 'react';

import { BottomSheet } from '@components/patterns/BottomSheet';
import { Button } from '@components/ui/Button';
import { Box } from '@components/ui/Box';
import { Field } from '@components/ui/Field';
import { Skeleton } from '@components/ui/Skeleton';
import { Text } from '@components/ui/Text';
import { useCatalog, useCreateProduct, useUpdateProduct } from '@domain/catalog';
import type { Product } from '@domain/catalog';
import { CatalogError } from '@domain/catalog/catalogTypes';
import { useCapabilities } from '@domain/tenant';
import { useTranslation } from '@i18n';
import { useUIStore } from '@store/uiStore';
import { formatAmount, parseCents } from '@utils/money';

interface ProductSheetProps {
  /** Ausente é cadastro; presente é edição do produto com este id. */
  productId?: string;
}

/**
 * "Cadastro rápido" e "Editar produto" — o MESMO formulário.
 *
 * São o mesmo sheet de propósito: os campos são os mesmos, e o que muda entre
 * cadastrar e corrigir um preço é só de onde vêm os valores iniciais e para
 * onde vai o `salvar`. Duas telas separadas se desencontrariam na primeira vez
 * que um campo novo entrasse só numa delas.
 *
 * Os campos de estoque e de custo SÓ EXISTEM se o plano incluir os módulos
 * correspondentes — é o entitlement chegando até o formulário. Pedir "quanto
 * tem" a quem não contratou estoque seria coletar um dado que o app não vai
 * mostrar em lugar nenhum.
 */
export function ProductSheet({ productId }: ProductSheetProps) {
  const closeSheet = useUIStore((s) => s.closeSheet);
  const { data: products = [], isPending } = useCatalog();

  const product = productId ? (products.find((p) => p.id === productId) ?? null) : null;

  // Editar exige ter o produto em mãos: sem ele, os campos nasceriam vazios e
  // o `salvar` apagaria nome e preço de quem só abriu o sheet. O caso normal
  // nem passa por aqui — quem abriu veio TOCANDO na linha de uma lista já
  // carregada; isto cobre o catálogo que ainda está chegando (ou que sumiu
  // porque outra pessoa desativou o produto no portal).
  if (productId && !product) {
    return (
      <BottomSheet title="Editar produto" onClose={closeSheet}>
        <Box gap="s13">
          {isPending ? (
            <>
              <Skeleton height={70} borderRadius="r14" />
              <Skeleton height={70} borderRadius="r14" />
            </>
          ) : (
            <Text variant="captionSm" color="textMuted">
              Este produto não está mais no catálogo. Feche e puxe a lista de novo.
            </Text>
          )}
        </Box>
      </BottomSheet>
    );
  }

  // `key` remonta o formulário quando o sheet troca de produto, e é o que
  // garante que os campos iniciais abaixo sejam relidos.
  return <ProductForm key={product?.id ?? 'novo'} product={product} />;
}

function ProductForm({ product }: { product: Product | null }) {
  const t = useTranslation();
  const { capabilities } = useCapabilities();
  const closeSheet = useUIStore((s) => s.closeSheet);
  const showToast = useUIStore((s) => s.showToast);
  const { mutate: cadastrar, isPending: cadastrando } = useCreateProduct();
  const { mutate: atualizar, isPending: atualizando } = useUpdateProduct();

  const editando = product !== null;

  const [name, setName] = useState(product?.name ?? '');
  const [code, setCode] = useState(product?.code ?? '');
  const [price, setPreco] = useState(product ? formatAmount(product.priceCents) : '');
  const [stock, setStock] = useState('');
  const [minimo, setMinimo] = useState(product?.stock ? String(product.stock.minimo) : '');
  const [cost, setCost] = useState(
    product?.costCents != null ? formatAmount(product.costCents) : '',
  );

  // Um só tratamento de resposta para os dois caminhos: o que muda é a frase
  // do toast.
  function aoSalvar(mensagem: (nome: string) => string) {
    return {
      onSuccess: (salvo: Product) => {
        closeSheet();
        showToast(mensagem(salvo.name), { tone: 'sucesso' });
      },
      onError: (error: unknown) => {
        const code = error instanceof CatalogError ? error.code : 'unknown';
        showToast(t.errors.catalog[code], { tone: 'erro' });
      },
    };
  }

  function save() {
    if (product) {
      atualizar(
        {
          productId: product.id,
          name,
          code,
          priceCents: parseCents(price) ?? 0,
          costCents: capabilities.hasCosts ? parseCents(cost) : null,
          // `null` aqui é "não mexe no mínimo" (produto sem controle de
          // estoque, ou plano sem o módulo). Campo em branco num produto que
          // CONTROLA estoque é 0 mesmo: o dono apagou para não ser avisado.
          minimumStock:
            capabilities.hasStock && product.stock ? (parseInteger(minimo) ?? 0) : null,
        },
        aoSalvar(t.toasts.productUpdated),
      );
      return;
    }

    cadastrar(
      {
        name,
        code,
        priceCents: parseCents(price) ?? 0,
        costCents: capabilities.hasCosts ? parseCents(cost) : null,
        // Campo em branco vira `null`, não 0: null é "não controla estoque",
        // zero seria "cadastrei já sem nenhum". Ver catalogAdapter.
        initialStock: capabilities.hasStock ? parseInteger(stock) : null,
        minimumStock: capabilities.hasStock ? (parseInteger(minimo) ?? 0) : null,
      },
      aoSalvar(t.toasts.productCreated),
    );
  }

  return (
    <BottomSheet title={editando ? 'Editar produto' : 'Cadastro rápido'} onClose={closeSheet}>
      <Box gap="s13">
        <Field
          label="Nome"
          value={name}
          onChangeText={setName}
          placeholder="Ex: Coleira antipulgas"
          autoFocus
        />

        <Field
          label="Código (opcional)"
          value={code}
          onChangeText={setCode}
          placeholder="Ex: 7891000100011"
          keyboardType="number-pad"
          autoCorrect={false}
        />

        <Field
          label="Preço de venda"
          value={price}
          onChangeText={setPreco}
          placeholder="R$ 0,00"
          keyboardType="decimal-pad"
        />

        {capabilities.hasStock ? (
          <Box flexDirection="row" gap="s10">
            {/* Quantidade só no CADASTRO. Depois que o produto existe, saldo se
                move por movimentação (com motivo, na tela de Estoque) — um
                campo aqui sobrescreveria o saldo por cima do livro. */}
            {editando ? null : (
              <Box flex={1}>
                <Field
                  label="Quanto tem"
                  value={stock}
                  onChangeText={setStock}
                  placeholder="0"
                  keyboardType="number-pad"
                />
              </Box>
            )}
            {editando && !product.stock ? null : (
              <Box flex={1}>
                <Field
                  label="Avisar abaixo de"
                  value={minimo}
                  onChangeText={setMinimo}
                  placeholder="0"
                  keyboardType="number-pad"
                />
              </Box>
            )}
          </Box>
        ) : null}

        {capabilities.hasCosts ? (
          <Field
            label="Quanto te custa (opcional)"
            value={cost}
            onChangeText={setCost}
            placeholder="R$ 0,00"
            keyboardType="decimal-pad"
          />
        ) : null}

        {editando && capabilities.hasStock && product.stock ? (
          <Text variant="captionSm" color="textMuted">
            {`Em estoque: ${product.stock.quantity}. Para mudar a quantidade, use Estoque.`}
          </Text>
        ) : null}

        <Button
          title={editando ? 'Salvar alterações' : 'Salvar produto'}
          onPress={save}
          height={54}
          textVariant="buttonMd"
          loading={editando ? atualizando : cadastrando}
        />
      </Box>
    </BottomSheet>
  );
}

function parseInteger(text: string): number | null {
  const limpo = text.replace(/\D/g, '');
  return limpo === '' ? null : Number(limpo);
}
