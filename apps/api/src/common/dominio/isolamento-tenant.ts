import { ErroAplicacao } from '../erros/erro-aplicacao';

// Mensagens exigidas pelos casos do ASSET 23832; a regra 39 do ASSET 23735 define
// 403 Forbidden como resposta quando o tenant do recurso não é o do executor.
export const ACESSO_NEGADO = {
  USUARIO: 'Acesso negado. Usuário não pertence a este tenant',
  TAREFA: 'Acesso negado. Tarefa não pertence a este tenant',
  RESPONSAVEL: 'Acesso negado. Responsável não pertence a este tenant',
  TENANT: 'Acesso negado. Tenant não pertence a este contexto',
} as const;

type Recurso = { tenantId: string } | null;

export function garantirMesmoTenant<T extends Recurso>(
  recurso: T,
  tenantExecutor: string,
  mensagemAcessoNegado: string,
  mensagemNaoEncontrado: string,
): NonNullable<T> {
  if (recurso === null) throw ErroAplicacao.naoEncontrado(mensagemNaoEncontrado);
  if (recurso.tenantId !== tenantExecutor) throw ErroAplicacao.proibido(mensagemAcessoNegado);

  return recurso as NonNullable<T>;
}
