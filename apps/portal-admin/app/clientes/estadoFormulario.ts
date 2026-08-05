import type { Plan } from "@/types/types";

/**
 * Estado do formulário de cadastro de cliente.
 *
 * POR QUE ISTO NÃO MORA EM `actions.ts`: aquele arquivo é `"use server"`, e um
 * módulo de Server Actions só pode exportar FUNÇÕES ASSÍNCRONAS. Todo export
 * dali vira um endpoint invocável pela rede, e o Next recusa exportar um objeto
 * comum ("A 'use server' file can only export async functions, found object").
 *
 * Tipos podem ficar em qualquer lugar — são apagados na compilação. O problema
 * era só a constante `ESTADO_INICIAL`, que existe em tempo de execução.
 */

/**
 * Dados do cliente recém-criado, para a interface navegar direto para a ficha
 * sem esperar um novo carregamento.
 */
export interface CustomerCreated {
  id: string;
  name: string;
  segment: string;
  owner: string;
  /** Chave do plano em `plans`. */
  plan: string;
  monthlyFee: number;
  modules: readonly string[];
}

export type FormState =
  | { status: "inicial" }
  | { status: "error"; message: string; field?: string }
  | { status: "sucesso"; message: string; customer: CustomerCreated };

/** Ponto de partida do `useActionState` na tela de cadastro. */
export const INITIAL_STATE: FormState = { status: "inicial" };

/** Resultado das mutações de um cliente já existente. */
export type CustomerResult = { ok: true } | { ok: false; message: string };

// `Plano` é reexportado por conveniência de quem monta o formulário.
export type { Plan };
