"use client";

import {
  primaryButton,
  Button,
  field,
  css,
  Switch,
  MONO,
  Panel,
  FIELD_LABEL,
  SANS,
  Select,
  LabeledField,
} from "@aguiar/ui";
import { usePortal } from "@/components/PortalProvider";
import {
  CFOP_COMMON,
  CSOSN,
  fiscalChecklist,
  formatTaxId,
  formatZip,
  ICMS_CST,
  isValidCfop,
  isValidIbgeCode,
  isValidNcm,
  isValidTaxId,
  isValidZip,
  ORIGINS,
  PIS_COFINS_CST,
  pendingSteps,
  REGIMES,
  UFS,
  usesCsosn,
  type ChecklistStep,
  type CodeOption,
} from "@/lib/dados/fiscal";
import { fiscalDirty } from "@/lib/estado";
import type { FiscalForm } from "@/types/estado";
import type { TaxRegime } from "@/types/types";

/**
 * Configurações › Dados fiscais.
 *
 * A aba que habilita a emissão de nota. Ela existe só para quem tem o módulo
 * `fiscal` — ver `TABS` em `ConfigView`.
 *
 * A ORDEM DAS SEÇÕES NÃO É ARBITRÁRIA. Primeiro o que falta (a lista de
 * pendências), porque habilitar emissão leva SEMANAS num cliente que nunca
 * emitiu e a pergunta que ele chega fazendo é "o que falta?". Depois
 * identificação, endereço e padrões — a ordem em que o contador dele entrega as
 * respostas. A emissão em produção fica por último, atrás de uma trava, porque
 * é o único interruptor desta tela que produz consequência legal.
 *
 * O QUE ESTA TELA NÃO FAZ: escolher código fiscal por ninguém. NCM, CFOP e
 * CSOSN são decisão do contador do cliente. O portal oferece os valores comuns
 * do balcão, recusa o que a SEFAZ recusaria, e guarda o resto como veio.
 */
export function FiscalTab() {
  const { s, a, isMobile, d } = usePortal();
  const f = s.draftFiscal;
  const dirty = fiscalDirty(s, d.fiscal);
  const steps = fiscalChecklist(f, d.products);
  const pending = pendingSteps(steps);
  const cols = isMobile ? "1fr" : "1fr 1fr";

  const set = (p: Partial<FiscalForm>) => a.set({ draftFiscal: { ...f, ...p } });

  return (
    <div style={css("display:flex;flex-direction:column;gap:14px")}>
      <Pending steps={steps} pending={pending} production={f.environment === "production"} />

      {/* ---------------------------------------------------------------- */}
      {/* Identificação                                                     */}
      {/* ---------------------------------------------------------------- */}
      <Panel
        title="Identificação do emitente"
        note="É o que sai impresso na nota. A razão social costuma ser diferente do nome da fachada."
      >
        <div style={css("display:flex;flex-direction:column;gap:13px")}>
          <LabeledField
            label="Razão social"
            value={f.legalName}
            onChange={(v) => set({ legalName: v })}
            placeholder="Como consta no CNPJ"
            note={`Na fachada o negócio se chama "${d.business.name}". Na nota, vale o que está aqui.`}
          />

          <div style={css(`display:grid;grid-template-columns:${cols};gap:13px`)}>
            <LabeledField
              label="CNPJ ou CPF"
              value={formatTaxId(f.taxId)}
              onChange={(v) => set({ taxId: v })}
              placeholder="00.000.000/0000-00"
              inputMode="numeric"
              mono
              error={f.submitted && !!f.taxId && !isValidTaxId(f.taxId)}
              message="Confira os dígitos: este número não é um CNPJ/CPF válido."
              note="CPF só para MEI pessoa física."
            />

            <div>
              <label style={css(FIELD_LABEL)}>Regime tributário</label>
              <Select
                value={f.regime == null ? "" : String(f.regime)}
                onChange={(e) =>
                  set({ regime: e.target.value ? (Number(e.target.value) as TaxRegime) : null })
                }
                boxCssText="width:100%"
                cssText="width:100%"
              >
                <option value="">Escolha o regime</option>
                {REGIMES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </Select>
              <Note>
                {f.regime == null
                  ? "Seu contador informa. É ele que decide os códigos do catálogo abaixo."
                  : (REGIMES.find((r) => r.value === f.regime)?.note ?? "")}
              </Note>
            </div>
          </div>

          <div style={css(`display:grid;grid-template-columns:${cols};gap:13px`)}>
            <div>
              <label style={css(FIELD_LABEL)}>Inscrição estadual</label>
              <input
                value={f.stateRegistrationExempt ? "ISENTO" : f.stateRegistration}
                onChange={(e) => set({ stateRegistration: e.target.value })}
                disabled={f.stateRegistrationExempt}
                placeholder="Só números"
                style={css(
                  field() +
                    `;font:500 13.5px ${MONO}` +
                    (f.stateRegistrationExempt ? ";opacity:.55" : ""),
                )}
              />
              <Note>Quem não tem inscrição marca &quot;isento&quot; ao lado.</Note>
            </div>

            <LabeledField
              label="Inscrição municipal"
              value={f.cityRegistration}
              onChange={(v) => set({ cityRegistration: v })}
              placeholder="Opcional"
              mono
              note="Só pesa quando você emitir nota de serviço."
            />
          </div>

          <Switch
            on={f.stateRegistrationExempt}
            onToggle={() => set({ stateRegistrationExempt: !f.stateRegistrationExempt })}
            title="Isento de inscrição estadual"
            note="A nota sai com ISENTO no lugar do número."
            state={f.stateRegistrationExempt ? "Isento" : "Tem inscrição"}
          />
        </div>
      </Panel>

      {/* ---------------------------------------------------------------- */}
      {/* Endereço                                                          */}
      {/* ---------------------------------------------------------------- */}
      <Panel
        title="Endereço do estabelecimento"
        note="O endereço de onde a mercadoria sai. Nem sempre é o mesmo endereço de contato."
      >
        <div style={css("display:flex;flex-direction:column;gap:13px")}>
          <div style={css(`display:grid;grid-template-columns:${cols};gap:13px`)}>
            <LabeledField
              label="CEP"
              value={formatZip(f.zipCode)}
              onChange={(v) => set({ zipCode: v })}
              placeholder="00000-000"
              inputMode="numeric"
              mono
              error={f.submitted && !!f.zipCode && !isValidZip(f.zipCode)}
              message="O CEP tem 8 dígitos."
            />
            <LabeledField
              label="Bairro"
              value={f.district}
              onChange={(v) => set({ district: v })}
              placeholder="Ex.: Centro"
            />
          </div>

          <div
            style={css(
              `display:grid;grid-template-columns:${isMobile ? "1fr" : "2fr 1fr 1fr"};gap:13px`,
            )}
          >
            <LabeledField
              label="Logradouro"
              value={f.street}
              onChange={(v) => set({ street: v })}
              placeholder="Rua, avenida, praça"
            />
            <LabeledField
              label="Número"
              value={f.streetNumber}
              onChange={(v) => set({ streetNumber: v })}
              placeholder="123"
            />
            <LabeledField
              label="Complemento"
              value={f.complement}
              onChange={(v) => set({ complement: v })}
              placeholder="Loja 2"
            />
          </div>

          <div
            style={css(
              `display:grid;grid-template-columns:${isMobile ? "1fr" : "2fr 1fr 1.4fr"};gap:13px`,
            )}
          >
            <LabeledField
              label="Município"
              value={f.cityName}
              onChange={(v) => set({ cityName: v })}
              placeholder="Ex.: Salvador"
            />

            <div>
              <label style={css(FIELD_LABEL)}>UF</label>
              <Select
                value={f.stateCode}
                onChange={(e) => set({ stateCode: e.target.value })}
                boxCssText="width:100%"
                cssText="width:100%"
              >
                <option value="">—</option>
                {UFS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </Select>
            </div>

            <LabeledField
              label="Código IBGE do município"
              value={f.cityIbgeCode}
              onChange={(v) => set({ cityIbgeCode: v })}
              placeholder="2927408"
              inputMode="numeric"
              mono
              error={f.submitted && !!f.cityIbgeCode && !isValidIbgeCode(f.cityIbgeCode)}
              message="São 7 dígitos."
              // O campo que mais some em integração fiscal: a tela mostra o
              // nome da cidade, o arquivo precisa do código.
              note="É o código que vai no arquivo da nota, não o nome da cidade."
            />
          </div>
        </div>
      </Panel>

      {/* ---------------------------------------------------------------- */}
      {/* Padrões do catálogo                                               */}
      {/* ---------------------------------------------------------------- */}
      <Panel
        title="Padrões fiscais do catálogo"
        note="Valem para todo produto que não tiver o campo preenchido. Quem define é o seu contador."
      >
        <div style={css("display:flex;flex-direction:column;gap:13px")}>
          <div style={css(`display:grid;grid-template-columns:${cols};gap:13px`)}>
            <LabeledField
              label="NCM padrão"
              value={f.defaultNcm}
              onChange={(v) => set({ defaultNcm: v })}
              placeholder="00000000"
              inputMode="numeric"
              mono
              error={f.submitted && !!f.defaultNcm && !isValidNcm(f.defaultNcm)}
              message="O NCM tem 8 dígitos."
              note="A classificação da mercadoria. Obrigatória em todo item da nota."
            />

            <CodeField
              label="CFOP padrão"
              value={f.defaultCfop}
              options={CFOP_COMMON}
              onChange={(v) => set({ defaultCfop: v })}
              placeholder="5102"
              error={f.submitted && !!f.defaultCfop && !isValidCfop(f.defaultCfop)}
              message="O CFOP tem 4 dígitos."
              note="A natureza da operação. 5102 cobre a venda no balcão, dentro do estado."
            />
          </div>

          <div style={css(`display:grid;grid-template-columns:${cols};gap:13px`)}>
            <CodeField
              label={usesCsosn(f.regime) ? "CSOSN padrão" : "CST de ICMS padrão"}
              value={f.defaultIcmsCode}
              options={usesCsosn(f.regime) ? CSOSN : ICMS_CST}
              onChange={(v) => set({ defaultIcmsCode: v })}
              placeholder={usesCsosn(f.regime) ? "102" : "00"}
              note={
                f.regime == null
                  ? "Escolha o regime tributário acima para ver a lista certa."
                  : usesCsosn(f.regime)
                    ? "O código do Simples Nacional."
                    : "O código do Regime Normal."
              }
            />

            <div>
              <label style={css(FIELD_LABEL)}>Origem da mercadoria</label>
              <Select
                value={f.defaultOrigin}
                onChange={(e) => set({ defaultOrigin: e.target.value })}
                boxCssText="width:100%"
                cssText="width:100%"
              >
                {ORIGINS.map((o) => (
                  <option key={o.code} value={o.code}>
                    {o.label}
                  </option>
                ))}
              </Select>
              <Note>Nacional cobre a maior parte de um comércio de bairro.</Note>
            </div>
          </div>

          <div style={css(`display:grid;grid-template-columns:${cols};gap:13px`)}>
            <CodeField
              label="CST de PIS padrão"
              value={f.defaultPisCst}
              options={PIS_COFINS_CST}
              onChange={(v) => set({ defaultPisCst: v })}
              placeholder="01"
            />
            <CodeField
              label="CST de COFINS padrão"
              value={f.defaultCofinsCst}
              options={PIS_COFINS_CST}
              onChange={(v) => set({ defaultCofinsCst: v })}
              placeholder="01"
            />
          </div>
        </div>
      </Panel>

      {/* ---------------------------------------------------------------- */}
      {/* Emissão                                                           */}
      {/* ---------------------------------------------------------------- */}
      <Panel
        title="Emissão"
        note="O CSC é gerado por você no portal da SEFAZ do seu estado, com o certificado digital."
      >
        <div style={css("display:flex;flex-direction:column;gap:13px")}>
          <div style={css(`display:grid;grid-template-columns:${cols};gap:13px`)}>
            <LabeledField
              label="Id do CSC"
              value={f.cscId}
              onChange={(v) => set({ cscId: v })}
              placeholder="000001"
              inputMode="numeric"
              mono
              note="O identificador do token. Ele viaja no QR Code da nota — não é segredo."
            />

            <div>
              <label style={css(FIELD_LABEL)}>Token do CSC</label>
              <input
                value={f.cscTokenInput}
                onChange={(e) => set({ cscTokenInput: e.target.value })}
                type="password"
                autoComplete="off"
                placeholder={f.cscTokenSet ? "Gravado — digite para substituir" : "Cole o token"}
                style={css(field() + `;font:500 13.5px ${MONO}`)}
              />
              {/*
                O portal NUNCA recebe o token de volta do banco: a tabela dos
                segredos não tem política de leitura para quem tem sessão. O que
                chega até aqui é só o fato de existir — por isso o campo aparece
                vazio mesmo estando configurado, e vazio significa "mantém o que
                está gravado".
              */}
              <Note tone={f.cscTokenSet ? "pos" : "muted"}>
                {f.cscTokenSet
                  ? "Já está gravado. Deixe vazio para manter — o portal não consegue lê-lo de volta."
                  : "Fica guardado cifrado no servidor e nunca volta para esta tela."}
              </Note>
            </div>
          </div>

          <div style={css(`display:grid;grid-template-columns:${cols};gap:13px`)}>
            <LabeledField
              label="Série da NFC-e"
              value={String(f.nfceSeries)}
              onChange={(v) => set({ nfceSeries: Math.max(1, Number(v.replace(/\D/g, "")) || 1) })}
              inputMode="numeric"
              mono
              note="Um número por ponto de emissão. Deixe 1 se você tem um caixa só."
            />

            {f.certificateExpiresAt && (
              <div>
                <label style={css(FIELD_LABEL)}>Certificado digital</label>
                <div
                  style={css(
                    `padding:12px 13px;border:1px solid var(--border2);border-radius:11px;background:var(--surface2);font:600 13px ${SANS}`,
                  )}
                >
                  Vence em{" "}
                  {new Date(f.certificateExpiresAt + "T00:00:00").toLocaleDateString("pt-BR")}
                </div>
                <Note>O A1 vale 12 meses. Vencido, a emissão para.</Note>
              </div>
            )}
          </div>

          {/*
            O ÚNICO INTERRUPTOR DESTA TELA COM CONSEQUÊNCIA LEGAL. Em
            homologação, tudo é teste e não vale nada; em produção, cada venda
            vira documento com valor fiscal, que não se apaga depois. A trava
            que vale é a do servidor (`saveFiscalData`) — esta aqui só evita que
            a pessoa chegue lá por engano.
          */}
          <Switch
            on={f.environment === "production"}
            onToggle={() =>
              set({ environment: f.environment === "production" ? "homologation" : "production" })
            }
            title="Emitir em produção"
            note={
              pending > 0
                ? `Ainda faltam ${pending} ${pending === 1 ? "item" : "itens"} do cadastro. Em produção, cada nota tem valor fiscal e não se apaga.`
                : "As notas passam a ter valor fiscal. Em homologação, tudo é teste."
            }
            state={f.environment === "production" ? "Produção" : "Homologação"}
          />
        </div>
      </Panel>

      {/* ---------------------------------------------------------------- */}
      {/* Barra de ação                                                     */}
      {/* ---------------------------------------------------------------- */}
      <div
        style={css(
          "display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:14px 18px;" +
            "border:1px solid var(--border);border-radius:15px;background:var(--surface2)",
        )}
      >
        <Button
          onClick={a.saveFiscal}
          loadingLabel="Salvando…"
          className="hv-brilho"
          style={css(primaryButton())}
        >
          Salvar dados fiscais
        </Button>

        {dirty && (
          <>
            <span
              style={css(
                `display:flex;align-items:center;gap:8px;font:600 12px ${SANS};color:var(--warn)`,
              )}
            >
              <span style={css("width:7px;height:7px;border-radius:50%;background:var(--warn)")} />
              Você tem alterações não salvas
            </span>
            <Button
              onClick={a.discardFiscal}
              style={css(`padding:13px 16px;border-radius:11px;font:600 13px ${SANS};color:var(--text2)`)}
            >
              Descartar
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* O que falta                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * A lista de pendências.
 *
 * POR QUE ELA É A PRIMEIRA COISA DA TELA: habilitar emissão fiscal leva semanas
 * num cliente que nunca emitiu, e metade dos passos não depende do portal
 * (certificado, credenciamento na SEFAZ). Sem esta lista, a pessoa preenche
 * tudo, não consegue emitir, e abre chamado perguntando o que falta. Os passos
 * externos aparecem marcados, para o cadastro não parecer completo quando
 * ainda depende de terceiros.
 */
function Pending({
  steps,
  pending,
  production,
}: {
  steps: ChecklistStep[];
  pending: number;
  production: boolean;
}) {
  const done = pending === 0;

  return (
    <Panel
      title={done ? "Cadastro fiscal completo" : `Faltam ${pending} ${pending === 1 ? "item" : "itens"}`}
      note={
        done
          ? production
            ? "Você está emitindo em produção."
            : "Tudo pronto. Ligue a emissão em produção no fim desta tela quando a SEFAZ liberar."
          : "Enquanto houver item pendente, a emissão não é liberada."
      }
      flush
    >
      <div style={css("display:flex;flex-direction:column")}>
        {steps.map((p) => (
          <div
            key={p.key}
            style={css(
              "display:flex;align-items:flex-start;gap:11px;padding:12px 18px;border-bottom:1px solid var(--border)",
            )}
          >
            <span
              style={css(
                "flex:none;width:19px;height:19px;margin-top:1px;border-radius:50%;display:flex;" +
                  "align-items:center;justify-content:center;font:700 11px " +
                  SANS +
                  ";" +
                  (p.done
                    ? "background:var(--pos-soft);color:var(--pos)"
                    : "background:var(--warn-soft);color:var(--warn)"),
              )}
            >
              {p.done ? "✓" : "!"}
            </span>

            <div style={css("flex:1;min-width:0")}>
              <div style={css("display:flex;align-items:center;gap:8px;flex-wrap:wrap")}>
                <span style={css(`font:600 13px ${SANS}`)}>{p.title}</span>
                {p.external && (
                  <span
                    style={css(
                      `padding:2px 8px;border-radius:999px;background:var(--surface2);border:1px solid var(--border2);` +
                        `color:var(--muted);font:600 10px ${SANS}`,
                    )}
                  >
                    fora do portal
                  </span>
                )}
              </div>
              <p style={css(`margin:2px 0 0;font:400 11.5px/1.5 ${SANS};color:var(--muted)`)}>
                {p.hint}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

/* -------------------------------------------------------------------------- */
/* Peças                                                                       */
/* -------------------------------------------------------------------------- */

function Note({ children, tone = "muted" }: { children: React.ReactNode; tone?: "muted" | "pos" }) {
  return (
    <div
      style={css(
        `margin-top:5px;font:500 11.5px/1.45 ${SANS};color:var(--${tone === "pos" ? "pos" : "muted"})`,
      )}
    >
      {children}
    </div>
  );
}

/**
 * Um código fiscal: escolhe da lista OU digita.
 *
 * As duas metades existem porque as duas são reais. A lista cobre o que
 * aparece num balcão e evita erro de digitação; o campo livre existe porque as
 * tabelas oficiais são muito maiores do que a lista, e um contador que pede um
 * código fora dela não pode ficar sem saída — a alternativa seria o cliente
 * abrir chamado para cadastrar um número.
 */
function CodeField({
  label,
  value,
  options,
  onChange,
  placeholder,
  error,
  message,
  note,
}: {
  label: string;
  value: string;
  options: CodeOption[];
  onChange: (v: string) => void;
  placeholder?: string;
  error?: boolean;
  message?: string;
  note?: string;
}) {
  const known = options.some((o) => o.code === value);

  return (
    <div>
      <label style={css(FIELD_LABEL)}>{label}</label>
      <div style={css("display:flex;gap:7px")}>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          inputMode="numeric"
          aria-invalid={error || undefined}
          aria-label={label}
          style={css(field(error) + `;flex:1;min-width:0;font:500 13.5px ${MONO}`)}
        />
        <Select
          value={known ? value : ""}
          onChange={(e) => e.target.value && onChange(e.target.value)}
          aria-label={`Escolher ${label} da lista`}
          boxCssText="flex:none"
          cssText="width:132px"
        >
          <option value="">Da lista…</option>
          {options.map((o) => (
            <option key={o.code} value={o.code}>
              {o.label}
            </option>
          ))}
        </Select>
      </div>
      {error && message ? (
        <div style={css(`margin-top:5px;font:600 11.5px ${SANS};color:var(--danger)`)}>{message}</div>
      ) : (
        note && <Note>{note}</Note>
      )}
    </div>
  );
}
