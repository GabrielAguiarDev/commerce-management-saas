import { useState } from 'react';

import { BottomSheet } from '@components/patterns/BottomSheet';
import { Button } from '@components/ui/Button';
import { Box } from '@components/ui/Box';
import { Field } from '@components/ui/Field';
import { Select } from '@components/ui/Select';
import { Text } from '@components/ui/Text';
import { TICKET_CATEGORIES, attachmentName, pickAndUploadAttachment, useOpenTicket } from '@domain/support';
import { SupportError, type TicketCategory } from '@domain/support/supportTypes';
import { useTranslation } from '@i18n';
import { useSessionStore } from '@store/sessionStore';
import { useUIStore } from '@store/uiStore';

/** "Abrir chamado": assunto, categoria, descrição e anexo. */
export function TicketSheet() {
  const t = useTranslation();
  const closeSheet = useUIStore((s) => s.closeSheet);
  const showToast = useUIStore((s) => s.showToast);
  const { mutate: open, isPending } = useOpenTicket();

  const tenantId = useSessionStore((s) => s.tenantId);

  const [assunto, setAssunto] = useState('');
  const [category, setCategory] = useState<TicketCategory>('duvida');
  const [description, setDescription] = useState('');
  const [anexo, setAnexo] = useState('');
  const [anexando, setAnexando] = useState(false);

  /**
   * O arquivo sobe AGORA, na escolha, e não junto com o chamado.
   *
   * Um print de celular leva segundos para subir, e cobrá-los do botão
   * "Enviar chamado" faria a pessoa achar que ele travou e tocar de novo. O
   * formulário guarda só o caminho do que já está no Storage.
   */
  async function anexar() {
    if (!tenantId) return;

    setAnexando(true);
    const r = await pickAndUploadAttachment(tenantId);
    setAnexando(false);

    if (r.ok) {
      setAnexo(r.path);
      return;
    }
    // Desistir de escolher não é erro, e um aviso aqui puniria quem só mudou
    // de ideia.
    if (r.reason === 'cancelled') return;
    showToast(r.reason === 'denied' ? t.toasts.photosDenied : t.toasts.attachmentFailed, {
      tone: 'erro',
    });
  }

  function send() {
    open(
      { assunto, category, description, attachmentPath: anexo || null },
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
          title={anexo ? `Anexado: ${attachmentName(anexo)}` : 'Anexar foto'}
          onPress={anexo ? () => setAnexo('') : anexar}
          loading={anexando}
          variant="tracejado"
          height={48}
          radius={14}
          textVariant="buttonXs"
        />

        {anexo !== '' && (
          <Text variant="hint" color="textMuted" textAlign="center">
            Toque no anexo para tirá-lo do chamado.
          </Text>
        )}

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
