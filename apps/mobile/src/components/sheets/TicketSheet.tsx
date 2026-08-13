import { useState } from 'react';

import { BottomSheet } from '@components/patterns/BottomSheet';
import { Button } from '@components/ui/Button';
import { Box } from '@components/ui/Box';
import { Field } from '@components/ui/Field';
import { Select } from '@components/ui/Select';
import { Text } from '@components/ui/Text';
import { TICKET_CATEGORIES, useOpenTicket } from '@domain/support';
import { SupportError, type TicketCategory } from '@domain/support/supportTypes';
import { useTranslation } from '@i18n';
import { useUIStore } from '@store/uiStore';

/** "Abrir chamado": assunto, categoria, descrição e anexo. */
export function TicketSheet() {
  const t = useTranslation();
  const closeSheet = useUIStore((s) => s.closeSheet);
  const showToast = useUIStore((s) => s.showToast);
  const { mutate: open, isPending } = useOpenTicket();

  const [assunto, setAssunto] = useState('');
  const [category, setCategory] = useState<TicketCategory>('duvida');
  const [description, setDescription] = useState('');

  function send() {
    open(
      { assunto, category, description },
      {
        onSuccess: () => {
          closeSheet();
          showToast(t.toasts.ticketOpened, { tone: 'sucesso' });
        },
        onError: (error) => {
          const code = error instanceof SupportError ? error.code : 'network';
          showToast(t.errors.support[code], { tone: 'erro' });
        },
      },
    );
  }

  return (
    <BottomSheet title="Abrir chamado" onClose={closeSheet}>
      <Box gap="s13">
        <Field
          label="Assunto"
          value={assunto}
          onChangeText={setAssunto}
          placeholder="Do que você precisa?"
          autoFocus
        />

        <Box>
          <Text variant="fieldLabel" color="textMuted" marginBottom="s6">
            Categoria
          </Text>
          <Select
            value={category}
            options={TICKET_CATEGORIES.map((c) => ({ value: c.key, label: c.label }))}
            onSelect={(v) => setCategory(v as TicketCategory)}
            accessibilityLabel="Categoria do chamado"
            height={50}
          />
        </Box>

        <Field
          label="Descrição"
          value={description}
          onChangeText={setDescription}
          placeholder="Conte com suas palavras o que aconteceu"
          multiline
        />

        <Button
          title="Anexar foto"
          // Fora de escopo nesta fase: o seletor de imagem exige
          // expo-image-picker e permissão declarada no app.config. O botão
          // existe para não sumir do desenho, e diz o que faria.
          onPress={() => showToast(t.toasts.attachmentUnavailable)}
          variant="tracejado"
          height={48}
          radius={14}
          textVariant="buttonXs"
        />

        <Button
          title="Enviar chamado"
          onPress={send}
          height={54}
          textVariant="buttonMd"
          loading={isPending}
        />
      </Box>
    </BottomSheet>
  );
}
