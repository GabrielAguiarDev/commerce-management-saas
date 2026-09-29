-- =====================================================================
-- DIA E MÊS DO NEGÓCIO, NÃO DO SERVIDOR: v_daily_sales e v_monthly_result
-- =====================================================================
--
-- As duas views agrupavam `sales.sold_at` (timestamptz) com `date()` e
-- `date_trunc()` no fuso da sessão do banco — UTC. Das 21h à meia-noite no
-- horário de Brasília já é o dia seguinte em UTC, então:
--
--   * o card "Vendas de hoje" do app (lê `v_daily_sales` pelo dia local)
--     zerava o faturamento nesse horário, enquanto itens e custo do mesmo dia
--     apareciam — "Sobrou hoje" ficava negativo;
--   * a venda das 22h do último dia do mês entrava no resultado do mês
--     seguinte em `v_monthly_result`.
--
-- Achado pelo E2E do app (28/09/2026, 22:16): venda de R$ 19,80 gravada
-- certa, Início mostrando R$ 0,00.
--
-- O fuso é o mesmo de `recurring_cost_today()` (20260917020000). Quando o
-- produto tiver clientes fora do horário de Brasília, o lugar da troca é um
-- fuso por negócio — e estes dois pontos, junto com aquela função.
--
-- `CREATE OR REPLACE` com as mesmas colunas e tipos: nenhum cliente muda.
-- Custos já são `date` e não têm o problema. IDEMPOTENTE.
-- =====================================================================

CREATE OR REPLACE VIEW "public"."v_daily_sales" WITH ("security_invoker"='true') AS
 SELECT "tenant_id",
    "day",
    "sales_count",
    "revenue",
    "cash_total",
    "pix_total",
    "debit_total",
    "credit_total"
   FROM ( SELECT "sales"."tenant_id",
            (("sales"."sold_at" AT TIME ZONE 'America/Sao_Paulo'))::"date" AS "day",
            "count"(*) AS "sales_count",
            "sum"("sales"."total") AS "revenue",
            "sum"(
                CASE
                    WHEN ("sales"."payment_method" = 'cash'::"text") THEN "sales"."total"
                    ELSE (0)::numeric
                END) AS "cash_total",
            "sum"(
                CASE
                    WHEN ("sales"."payment_method" = 'pix'::"text") THEN "sales"."total"
                    ELSE (0)::numeric
                END) AS "pix_total",
            "sum"(
                CASE
                    WHEN ("sales"."payment_method" = 'debit'::"text") THEN "sales"."total"
                    ELSE (0)::numeric
                END) AS "debit_total",
            "sum"(
                CASE
                    WHEN ("sales"."payment_method" = 'credit'::"text") THEN "sales"."total"
                    ELSE (0)::numeric
                END) AS "credit_total"
           FROM "public"."sales"
          WHERE ("sales"."status" = 'completed'::"text")
          GROUP BY "sales"."tenant_id", ((("sales"."sold_at" AT TIME ZONE 'America/Sao_Paulo'))::"date")) "gated"
  WHERE ( SELECT "public"."current_actor_can_access_modules"('{sales,reports,cash}'::"text"[]) AS "current_actor_can_access_modules");

CREATE OR REPLACE VIEW "public"."v_monthly_result" WITH ("security_invoker"='true') AS
 SELECT "tenant_id",
    "month",
    "revenue",
    "total_costs",
    "fixed_costs",
    "variable_costs",
    "profit"
   FROM ( WITH "sales_m" AS (
                 SELECT "sales"."tenant_id",
                    ("date_trunc"('month'::"text", ("sales"."sold_at" AT TIME ZONE 'America/Sao_Paulo')))::"date" AS "month",
                    "sum"("sales"."total") AS "revenue"
                   FROM "public"."sales"
                  WHERE ("sales"."status" = 'completed'::"text")
                  GROUP BY "sales"."tenant_id", (("date_trunc"('month'::"text", ("sales"."sold_at" AT TIME ZONE 'America/Sao_Paulo')))::"date")
                ), "costs_m" AS (
                 SELECT "costs"."tenant_id",
                    ("date_trunc"('month'::"text", ("costs"."cost_date")::timestamp with time zone))::"date" AS "month",
                    "sum"("costs"."amount") AS "total_costs",
                    "sum"(
                        CASE
                            WHEN ("costs"."type" = 'fixed'::"text") THEN "costs"."amount"
                            ELSE (0)::numeric
                        END) AS "fixed_costs",
                    "sum"(
                        CASE
                            WHEN ("costs"."type" = 'variable'::"text") THEN "costs"."amount"
                            ELSE (0)::numeric
                        END) AS "variable_costs"
                   FROM "public"."costs"
                  GROUP BY "costs"."tenant_id", (("date_trunc"('month'::"text", ("costs"."cost_date")::timestamp with time zone))::"date")
                )
         SELECT COALESCE("s"."tenant_id", "c"."tenant_id") AS "tenant_id",
            COALESCE("s"."month", "c"."month") AS "month",
            COALESCE("s"."revenue", (0)::numeric) AS "revenue",
            COALESCE("c"."total_costs", (0)::numeric) AS "total_costs",
            COALESCE("c"."fixed_costs", (0)::numeric) AS "fixed_costs",
            COALESCE("c"."variable_costs", (0)::numeric) AS "variable_costs",
            (COALESCE("s"."revenue", (0)::numeric) - COALESCE("c"."total_costs", (0)::numeric)) AS "profit"
           FROM ("sales_m" "s"
             FULL JOIN "costs_m" "c" ON ((("s"."tenant_id" = "c"."tenant_id") AND ("s"."month" = "c"."month"))))) "gated"
  WHERE ( SELECT "public"."current_actor_can_access_modules"('{costs,reports}'::"text"[]) AS "current_actor_can_access_modules");
