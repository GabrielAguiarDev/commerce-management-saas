import { useState } from 'react';

import { BottomSheet } from '@components/patterns/BottomSheet';
import { Button } from '@components/ui/Button';
import { Box } from '@components/ui/Box';
import { Field } from '@components/ui/Field';
import { useCreateProduct } from '@domain/catalog';
import { CatalogError } from '@domain/catalog/catalogTypes';
import { useCapabilities } from '@domain/tenant';
import { useTranslation } from '@i18n';
import { useUIStore } from '@store/uiStore';
import { parseCents } from '@utils/money';

/**
 * "Cadastro rápido".
 *
 * Os campos de estoque e de custo SÓ EXISTEM se o plano incluir os módulos
 * correspondentes — é o entitlement chegando até o formulário. Pedir "quanto
 * tem" a quem não contratou estoque seria coletar um dado que o app não vai
 * mostrar em lugar nenhum.
 */
export function ProductSheet() {
  const t = useTranslation();
  const { capabilities } = useCapabilities();
  const closeSheet = useUIStore((s) => s.closeSheet);
  const showToast = useUIStore((s) => s.showToast);
  const { mutate: cadastrar, isPending } = useCreateProduct();

  const [name, setName] = useState('');
  const [price, setPreco] = useState('');
  const [stock, setStock] = useState('');
  const [minimo, setMinimo] = useState('');
  const [cost, setCost] = useState('');

  function save() {
    cadastrar(
      {
        name,
        priceCents: parseCents(price) ?? 0,
        costCents: capabilities.hasCosts ? parseCents(cost) : null,
        // Campo em branco vira `null`, não 0: null é "não controla estoque",
        // zero seria "cadastrei já sem nenhum". Ver catalogAdapter.
        initialStock: capabilities.hasStock ? parseInteger(stock) : null,
        minimumStock: capabilities.hasStock ? (parseInteger(minimo) ?? 0) : null,
      },
      {
        onSuccess: (product) => {
          closeSheet();
          showToast(t.toasts.productCreated(product.name));
        },
        onError: (error) => {
          const code = error instanceof CatalogError ? error.code : 'unknown';
          showToast(t.errors.catalog[code], { tone: 'erro' });
        },
      },
    );
  }

  return (
    <BottomSheet title="Cadastro rápido" onClose={closeSheet}>
      <Box gap="s13">
        <Field
          label="Nome"
          value={name}
          onChangeText={setName}
          placeholder="Ex: Coleira antipulgas"
          autoFocus
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
            <Box flex={1}>
              <Field
                label="Quanto tem"
                value={stock}
                onChangeText={setStock}
                placeholder="0"
                keyboardType="number-pad"
              />
            </Box>
            <Box flex={1}>
              <Field
                label="Avisar abaixo de"
                value={minimo}
                onChangeText={setMinimo}
                placeholder="0"
                keyboardType="number-pad"
              />
            </Box>
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

        <Button
          title="Salvar produto"
          onPress={save}
          height={54}
          textVariant="buttonMd"
          loading={isPending}
        />
      </Box>
    </BottomSheet>
  );
}

function parseInteger(text: string): number | null {
  const limpo = text.replace(/\D/g, '');
  return limpo === '' ? null : Number(limpo);
}
