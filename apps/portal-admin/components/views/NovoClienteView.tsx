"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { criarCliente, ESTADO_INICIAL } from "@/app/clientes/actions";
import { useAdmin } from "@/components/AdminProvider";
import { BarraAcoes } from "@/components/BarraAcoes";
import { GradeModulos, ModuloCard } from "@/components/ModuloCard";
import { Campo, Selecao } from "@/components/campos";
import { css, MONO } from "@/lib/css";
import {
  CATALOGO_MODULOS,
  ehPlanoFixo,
  modulosDoPlano,
  ROTULO_PLANO,
  SUGESTAO_CUSTOM,
  TOTAL_MODULOS,
  type Plano,
} from "@/lib/planos";
import { clienteHref, ROTAS } from "@/lib/rotas";

const ROTULO_CAMPO =
  "font-size:10.5px;letter-spacing:.07em;text-transform:uppercase;color:var(--tx3);font-weight:600";

/** Campos que a interface exige antes de deixar enviar. */
type CampoObrigatorio = "nome" | "responsavel" | "email";

/**
 * Tela cheia de cadastro de cliente — mesmo padrão da ficha do cliente.
 *
 * Segurança: roda no navegador e NÃO fala com o Supabase. Só entrega o
 * FormData para a Server Action `criarCliente`, que é quem tem a service_role.
 * A validação daqui é conveniência para quem digita; a que vale é a do servidor.
 */
export function NovoClienteView() {
  const { s, a, opts } = useAdmin();
  // `set` e `toast` são memoizados no provider; o objeto `a` NÃO é (ele é
  // recriado a cada render). Efeitos abaixo dependem só destes dois.
  const { L, set, toast } = a;
  const id = s.idioma;
  const router = useRouter();

  const [estado, enviar, enviando] = useActionState(criarCliente, ESTADO_INICIAL);

  const [campos, setCampos] = useState({
    nome: "",
    segmento: "",
    responsavel: "",
    cidade: "",
    telefone: "",
    email: "",
    mensalidade: "",
  });
  const [plano, setPlano] = useState<Plano>("free");
  const [escolhidos, setEscolhidos] = useState<string[]>([...SUGESTAO_CUSTOM]);
  // Só destacamos o que falta depois da primeira tentativa de envio, para não
  // pintar a tela de vermelho enquanto a pessoa ainda está preenchendo.
  const [tentouEnviar, setTentouEnviar] = useState(false);

  const planoFixo = ehPlanoFixo(plano);
  const ativos = modulosDoPlano(plano, escolhidos);

  const preenchido = Object.values(campos).some((v) => v.trim() !== "");
  const faltando: CampoObrigatorio[] = (["nome", "responsavel", "email"] as const).filter(
    (k) => campos[k].trim() === "",
  );
  const custoFaltando = plano === "custom" && campos.mensalidade.trim() === "";
  const modulosFaltando = ativos.length === 0;
  const podeEnviar = faltando.length === 0 && !custoFaltando && !modulosFaltando;

  const editar = (k: keyof typeof campos, v: string) =>
    setCampos((atual) => ({ ...atual, [k]: v }));

  // Mantém o guard de saída do painel sabendo que há algo digitado aqui.
  useEffect(() => {
    set({ novoClienteSujo: preenchido });
  }, [preenchido, set]);

  // Ao sair da tela, o formulário deixa de existir — nada mais a proteger.
  useEffect(() => () => set({ novoClienteSujo: false }), [set]);

  const trocarPlano = (novo: Plano) => {
    if (novo === "custom" && ehPlanoFixo(plano)) setEscolhidos(modulosDoPlano(plano));
    setPlano(novo);
  };

  const alternarModulo = (chave: string) =>
    setEscolhidos((atual) =>
      atual.includes(chave) ? atual.filter((k) => k !== chave) : [...atual, chave],
    );

  const limpar = () => {
    setCampos({
      nome: "",
      segmento: "",
      responsavel: "",
      cidade: "",
      telefone: "",
      email: "",
      mensalidade: "",
    });
    setPlano("free");
    setEscolhidos([...SUGESTAO_CUSTOM]);
    setTentouEnviar(false);
  };

  // Sucesso: avisa e vai para a ficha do cliente recém-criado.
  //
  // A lista não precisa mais ser remendada aqui: a Server Action revalida o
  // layout, que relê a tabela `tenants`, e o provider sincroniza o estado.
  useEffect(() => {
    if (estado.status !== "sucesso") return;

    toast(estado.mensagem);
    set({ novoClienteSujo: false });
    // `refresh` antes do `push` para a ficha já abrir com o registro do banco.
    router.refresh();
    router.push(clienteHref(estado.cliente.id));
    // `estado` só muda quando a action responde, então isto roda uma vez por envio.
  }, [estado, set, toast, router]);

  /** Um campo do card de dados, com destaque quando obrigatório e vazio. */
  const campo = (
    chave: keyof typeof campos,
    rotulo: string,
    props: React.InputHTMLAttributes<HTMLInputElement> = {},
    obrigatorio = false,
  ) => {
    const vazio = obrigatorio && tentouEnviar && campos[chave].trim() === "";
    return (
      <label style={css("display:flex;flex-direction:column;gap:6px;min-width:0")}>
        <span style={css(ROTULO_CAMPO)}>
          {rotulo}
          {obrigatorio && <span style={css("color:var(--bad);margin-left:3px")}>*</span>}
        </span>
        <Campo
          name={chave}
          value={campos[chave]}
          onChange={(e) => editar(chave, e.target.value)}
          disabled={enviando}
          aria-invalid={vazio || undefined}
          {...props}
        />
      </label>
    );
  };

  const estadoBarra = enviando
    ? id === "pt"
      ? "Cadastrando cliente…"
      : "Creating customer…"
    : modulosFaltando
      ? id === "pt"
        ? "Selecione ao menos um módulo"
        : "Select at least one module"
      : !podeEnviar
        ? id === "pt"
          ? "Preencha os campos obrigatórios"
          : "Fill in the required fields"
        : id === "pt"
          ? "Tudo pronto para cadastrar"
          : "Ready to create";

  return (
    <form
      action={enviar}
      onSubmit={(e) => {
        setTentouEnviar(true);
        // A action revalida tudo de novo; isto só evita uma ida ao servidor
        // quando já dá para ver que falta coisa.
        if (!podeEnviar) e.preventDefault();
      }}
      style={css("display:flex;flex-direction:column;gap:16px")}
    >
      <button
        type="button"
        onClick={() => a.ir(ROTAS.clientes)}
        className="hv-acc"
        style={css(
          "align-self:flex-start;background:none;border:none;color:var(--tx2);font-size:12.5px;" +
            "cursor:pointer;padding:0",
        )}
      >
        ← {L.voltar}
      </button>

      {/* ---------------------------------------------------------------
          CARD 1 — dados do negócio e acesso
      --------------------------------------------------------------- */}
      <section
        style={css(
          "background:var(--panel);border:1px solid var(--line);border-radius:12px;overflow:hidden",
        )}
      >
        <div
          style={css(
            "padding:20px 24px;border-bottom:1px solid var(--lineSoft);background:var(--panel2);" +
              "display:flex;flex-direction:column;gap:4px",
          )}
        >
          <h2
            style={css(
              "margin:0;font-size:20px;font-weight:600;letter-spacing:-.02em;color:var(--tx)",
            )}
          >
            {id === "pt" ? "Novo cliente" : "New customer"}
          </h2>
          <p style={css("margin:0;font-size:12.5px;color:var(--tx2);max-width:54ch")}>
            {id === "pt"
              ? "Cadastre um novo comércio na plataforma."
              : "Register a new business on the platform."}
          </p>
        </div>

        <div style={css("padding:22px 24px;display:flex;flex-direction:column;gap:18px")}>
          <div
            style={css(
              "display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px 20px",
            )}
          >
            {campo(
              "nome",
              id === "pt" ? "Nome do negócio" : "Business name",
              { autoFocus: true, placeholder: id === "pt" ? "Padaria da Esquina" : "Corner Bakery" },
              true,
            )}
            {campo("segmento", L.segmento, {
              placeholder: id === "pt" ? "Alimentação · Padaria" : "Food · Bakery",
            })}
            {campo(
              "responsavel",
              L.responsavel,
              { placeholder: id === "pt" ? "Nome do dono" : "Owner name" },
              true,
            )}
            {campo("cidade", id === "pt" ? "Cidade / UF" : "City / State", {
              placeholder: "Salvador, BA",
            })}
            {campo("telefone", id === "pt" ? "Telefone / contato" : "Phone / contact", {
              type: "tel",
              placeholder: "(71) 90000-0000",
            })}
          </div>

          <div
            style={css("border-top:1px solid var(--lineSoft);padding-top:18px;" + "display:grid;" +
              "grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px 20px;align-items:start")}
          >
            <div style={css("display:flex;flex-direction:column;gap:6px;min-width:0")}>
              {campo(
                "email",
                id === "pt" ? "E-mail de acesso" : "Access email",
                { type: "email", placeholder: "dono@negocio.com.br" },
                true,
              )}
              <span style={css("font-size:11.5px;color:var(--tx3);line-height:1.5")}>
                {id === "pt"
                  ? "O dono recebe um convite por e-mail para definir a própria senha."
                  : "The owner gets an email invite to set their own password."}
              </span>
            </div>

            <label style={css("display:flex;flex-direction:column;gap:6px;min-width:0")}>
              <span style={css(ROTULO_CAMPO)}>{L.plano}</span>
              <Selecao
                name="plano"
                value={plano}
                onChange={(e) => trocarPlano(e.target.value as Plano)}
                disabled={enviando}
                estiloCaixa="width:100%"
              >
                <option value="free">{ROTULO_PLANO.free}</option>
                <option value="paid">{ROTULO_PLANO.paid}</option>
                <option value="custom">{ROTULO_PLANO.custom}</option>
              </Selecao>
            </label>

            {/* A mensalidade só existe no Customizado — nos outros é tabelada. */}
            {plano === "custom" && (
              <label style={css("display:flex;flex-direction:column;gap:6px;min-width:0")}>
                <span style={css(ROTULO_CAMPO)}>
                  {L.mensalidade}
                  <span style={css("color:var(--bad);margin-left:3px")}>*</span>
                </span>
                <Campo
                  name="mensalidade"
                  value={campos.mensalidade}
                  onChange={(e) => editar("mensalidade", e.target.value)}
                  inputMode="decimal"
                  placeholder="149,00"
                  disabled={enviando}
                  aria-invalid={(tentouEnviar && custoFaltando) || undefined}
                  estilo={`max-width:180px;font-family:`}
                />
              </label>
            )}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------
          CARD 2 — módulos (mesma grade da ficha do cliente)
      --------------------------------------------------------------- */}
      <section
        style={css(
          "background:var(--panel);border:1px solid var(--line);border-radius:12px;overflow:hidden",
        )}
      >
        <div
          style={css(
            "display:flex;align-items:flex-start;justify-content:space-between;gap:20px;" +
              "flex-wrap:wrap;padding:20px 24px;border-bottom:1px solid var(--lineSoft);background:var(--panel2)",
          )}
        >
          <div style={css("display:flex;flex-direction:column;gap:4px")}>
            <h3 style={css("margin:0;font-size:16px;font-weight:600;color:var(--tx)")}>
              {id === "pt" ? "Módulos do plano" : "Plan modules"}
            </h3>
            <p style={css("margin:0;font-size:12.5px;color:var(--tx2);max-width:54ch")}>
              {planoFixo
                ? id === "pt"
                  ? "Os módulos deste plano são fixos. Para uma combinação personalizada, use o plano Customizado."
                  : "This plan's modules are fixed. For a custom combination, use the Custom plan."
                : id === "pt"
                  ? "Plano customizado: ligue e desligue cada módulo livremente para este cliente."
                  : "Custom plan: turn each module on or off freely for this customer."}
            </p>
          </div>

          <div style={css("display:flex;align-items:center;gap:14px;flex:none")}>
            <div style={css("display:flex;flex-direction:column;align-items:flex-end;gap:2px")}>
              <span
                style={css(
                  `font-family:${MONO};font-size:20px;font-weight:600;color:var(--acc);line-height:1`,
                )}
              >
                {ativos.length}/{TOTAL_MODULOS}
              </span>
              <span style={css("font-size:11px;color:var(--tx3)")}>{L.modulosAtivos}</span>
            </div>

            {/* Ativar todos / limpar só fazem sentido quando há o que editar. */}
            {!planoFixo && (
              <div style={css("display:flex;gap:6px")}>
                <button
                  type="button"
                  onClick={() => setEscolhidos(CATALOGO_MODULOS.map((m) => m.chave))}
                  className="hv-acc-line"
                  style={css(
                    "border:1px solid var(--line);background:var(--panel);color:var(--tx2);" +
                      "font-size:11.5px;padding:7px 11px;border-radius:7px;cursor:pointer",
                  )}
                >
                  {L.ativarTodos}
                </button>
                <button
                  type="button"
                  onClick={() => setEscolhidos([])}
                  className="hv-tx"
                  style={css(
                    "border:1px solid var(--line);background:var(--panel);color:var(--tx3);" +
                      "font-size:11.5px;padding:7px 11px;border-radius:7px;cursor:pointer",
                  )}
                >
                  {L.limpar}
                </button>
              </div>
            )}
          </div>
        </div>

        <GradeModulos colunas={opts.colunasModulos}>
          {CATALOGO_MODULOS.map((m) => {
            const ligado = ativos.includes(m.chave);
            return (
              <ModuloCard
                key={m.chave}
                sigla={m.sigla}
                nome={m.nome}
                descricao={m.descricao}
                ligado={ligado}
                // Ainda não há cliente: o texto fala do pacote, não de acesso concedido.
                estado={
                  ligado
                    ? id === "pt"
                      ? "Incluído no plano"
                      : "Included in the plan"
                    : id === "pt"
                      ? "Não incluído"
                      : "Not included"
                }
                acesso={m.acesso}
                tagAcesso={L.tagAcesso}
                ajudaAcesso={L.acessoAjuda}
                bloqueado={planoFixo || enviando}
                alternar={() => alternarModulo(m.chave)}
              />
            );
          })}
        </GradeModulos>

        {modulosFaltando && (
          <div
            style={css(
              "padding:13px 24px;border-top:1px solid var(--lineSoft);background:var(--badBg);" +
                "display:flex;align-items:center;gap:9px",
            )}
          >
            <div style={css("width:6px;height:6px;border-radius:99px;background:var(--bad)")} />
            <span style={css("font-size:12px;color:var(--bad)")}>
              {id === "pt"
                ? "Selecione ao menos um módulo para este cliente."
                : "Select at least one module for this customer."}
            </span>
          </div>
        )}
      </section>

      {/* Erro vindo do servidor. */}
      {estado.status === "erro" && (
        <div
          role="alert"
          style={css(
            "padding:13px 16px;border:1px solid var(--badLine);background:var(--badBg);" +
              "border-radius:11px;font-size:13px;color:var(--bad);line-height:1.5",
          )}
        >
          {estado.mensagem}
        </div>
      )}

      {/* Os módulos vão no FormData por aqui. Num plano fixo estes campos nem
          existem — a Server Action usa o pacote do plano de qualquer forma. */}
      {!planoFixo && ativos.map((k) => <input key={k} type="hidden" name="modulos" value={k} />)}

      <BarraAcoes
        estado={estadoBarra}
        tom={enviando || !podeEnviar ? "alerta" : "neutro"}
        secundario={{
          rotulo: preenchido ? L.descartar : L.cancelar,
          onClick: () => (preenchido ? limpar() : a.ir(ROTAS.clientes)),
          desabilitado: enviando,
        }}
        primario={{
          rotulo: enviando
            ? id === "pt"
              ? "Cadastrando…"
              : "Creating…"
            : id === "pt"
              ? "Cadastrar cliente"
              : "Create customer",
          submit: true,
          desabilitado: enviando,
        }}
      />
    </form>
  );
}
