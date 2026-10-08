import { css, SANS, ScreenHeader } from "@aguiar/ui";

export function BillingComingSoon() {
  return (
    <div>
      <ScreenHeader title="Assinatura" subtitle="Uma novidade para facilitar o pagamento do seu plano Aguiar One." />
      <section style={css("padding:32px 24px;border:1px solid var(--border);border-radius:16px;background:var(--surface)")}>
        <span style={css(`display:inline-block;padding:5px 10px;border-radius:999px;background:var(--accent-soft);color:var(--accent-text);font:600 12px ${SANS}`)}>
          Em breve
        </span>
        <h2 style={css(`margin:16px 0 10px;font:700 21px/1.3 ${SANS}`)}>
          Pague sua mensalidade direto na plataforma
        </h2>
        <p style={css(`margin:0;max-width:600px;font:400 14px/1.6 ${SANS};color:var(--text2)`)}>
          Em breve, você poderá pagar seu plano por Pix ou cartão e acompanhar os pagamentos por aqui.
          Avisaremos quando estiver disponível.
        </p>
        <p style={css(`margin:16px 0 0;font:400 13px/1.6 ${SANS};color:var(--muted)`)}>
          Por enquanto, continue pagando da forma combinada com nossa equipe.
        </p>
      </section>
    </div>
  );
}
