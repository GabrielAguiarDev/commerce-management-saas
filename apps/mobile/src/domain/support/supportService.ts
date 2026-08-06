import * as api from './supportApi';
import { toChamado, toChamadoPayload, toMensagem } from './supportAdapter';
import {
  SuporteError,
  type Chamado,
  type MensagemDoChamado,
  type NovoChamado,
} from './supportTypes';

/** AS REGRAS do suporte. */

function normalizar(erro: unknown): never {
  if (erro instanceof SuporteError) throw erro;
  throw new SuporteError('rede', erro instanceof Error ? erro.message : undefined);
}

export async function listarChamados(tenantId: string): Promise<Chamado[]> {
  try {
    return (await api.listarChamados(tenantId)).map(toChamado);
  } catch (e) {
    return normalizar(e);
  }
}

export async function listarMensagens(chamadoId: string): Promise<MensagemDoChamado[]> {
  try {
    return (await api.listarMensagens(chamadoId)).map(toMensagem);
  } catch (e) {
    return normalizar(e);
  }
}

export async function marcarComoLido(tenantId: string, chamadoId: string): Promise<void> {
  try {
    await api.marcarComoLido(tenantId, chamadoId);
  } catch {
    // Falhar em marcar como lido não pode impedir a leitura do chamado.
  }
}

export function validarNovoChamado(novo: NovoChamado): SuporteError | null {
  if (!novo.assunto.trim()) return new SuporteError('assunto_obrigatorio');
  if (!novo.descricao.trim()) return new SuporteError('descricao_obrigatoria');
  return null;
}

export async function abrirChamado(tenantId: string, novo: NovoChamado): Promise<Chamado> {
  const invalido = validarNovoChamado(novo);
  if (invalido) throw invalido;

  try {
    return toChamado(await api.criarChamado(toChamadoPayload(tenantId, novo)));
  } catch (e) {
    return normalizar(e);
  }
}

export async function responder(chamadoId: string, texto: string): Promise<MensagemDoChamado> {
  if (!texto.trim()) throw new SuporteError('descricao_obrigatoria');
  try {
    return toMensagem(await api.responder({ ticket_id: chamadoId, body: texto.trim() }));
  } catch (e) {
    return normalizar(e);
  }
}
