import { useState } from 'react';

import { Button, Card, Field, TabPane } from '@components';
import { TenantError, useCurrentTenant, useSaveBusinessDetails } from '@domain/tenant';
import { useTranslation } from '@i18n';
import { useUIStore } from '@store/uiStore';

/** Configurações › Negócio — a aba de partida. */
export default function BusinessTab() {
  const t = useTranslation();
  const { data: tenant } = useCurrentTenant();
  const { mutate: save, isPending } = useSaveBusinessDetails();
  const showToast = useUIStore((s) => s.showToast);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [filledWith, setFilledWith] = useState<string | null>(null);

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
  if (tenant && filledWith !== tenant.id) {
    setFilledWith(tenant.id);
    setName(tenant.name);
    setPhone(tenant.phone ?? '');
  }

  return (
    <TabPane>
      <Card padding="s18" gap="s14">
        <Field label="Nome do negócio" value={name} onChangeText={setName} height={48} radius={13} />
        <Field
          label="Telefone / WhatsApp"
          value={phone}
          onChangeText={setPhone}
          height={48}
          radius={13}
          keyboardType="phone-pad"
        />
        <Button
          title="Salvar"
          onPress={() =>
            save(
              { name, phone },
              {
                onSuccess: () => showToast(t.toasts.businessSaved),
                // Sem este ramo, uma recusa do banco não daria retorno NENHUM na
                // tela — o botão pararia de girar e o nome voltaria ao antigo na
                // próxima carga. Hoje isto dispara de verdade: falta a política
                // de UPDATE em `tenants`. Ver tenantApi.updateTenant.
                onError: (error) => {
                  const code = error instanceof TenantError ? error.code : 'unknown';
                  showToast(t.errors.tenant[code], { tone: 'erro' });
                },
              },
            )
          }
          height={50}
          radius={14}
          textVariant="buttonSm"
          loading={isPending}
        />
      </Card>
    </TabPane>
  );
}
