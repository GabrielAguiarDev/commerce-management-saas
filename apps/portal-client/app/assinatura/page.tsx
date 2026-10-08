import { AssinaturaView } from "@/components/views/AssinaturaView";
import { BillingComingSoon } from "@/components/assinatura/BillingComingSoon";
import { platformPaymentsEnabled } from "@/lib/platformPayments";

export default function Page() {
  return platformPaymentsEnabled() ? <AssinaturaView /> : <BillingComingSoon />;
}
