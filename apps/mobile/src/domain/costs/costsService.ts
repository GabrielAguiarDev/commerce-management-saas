import * as api from './costsApi';
import { toCusto, toCustoPayload, toResumoDoMes } from './costsAdapter';
import { CustoError, type Custo, type ResumoDoMes } from './costsTypes';

/** AS REGRAS dos custos. */

function normalizar(erro: unknown): never {
  if (erro instanceof CustoError) throw erro;
  throw new CustoError('rede', erro instanceof Error ? erro.message : undefined);
}

export async function listarCustos(tenantId: string): Promise<Custo[]> {
  try {
    return (await api.listarCustos(tenantId)).map(toCusto);
  } catch (e) {
    return normalizar(e);
  }
}

const RESUMO_VAZIO: ResumoDoMes = {
  mes: '—',
  periodo: '—',
  entrouCentavos: 0,
  saiuCentavos: 0,
  sobrouCentavos: 0,
};

export async function obterResumoDoMes(tenantId: string): Promise<ResumoDoMes> {
  try {
    const raw = await api.buscarResumoDoMes(tenantId);
    return raw ? toResumoDoMes(raw) : RESUMO_VAZIO;
  } catch (e) {
    return normalizar(e);
  }
}

export async function registrarCusto(
  tenantId: string,
  nome: string,
  valorCentavos: number,
): Promise<Custo> {
  if (!nome.trim()) throw new CustoError('nome_obrigatorio');
  if (valorCentavos <= 0) throw new CustoError('valor_invalido');

  try {
    return toCusto(await api.criarCusto(toCustoPayload(tenantId, nome, valorCentavos)));
  } catch (e) {
    return normalizar(e);
  }
}
