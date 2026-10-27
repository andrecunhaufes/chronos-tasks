export const EVENTO_AUDITORIA = {
  USUARIO_CRIADO: 'user_created',
  USUARIO_ATUALIZADO: 'user_updated',
  USUARIO_ATIVADO: 'user_activated',
  USUARIO_DESATIVADO: 'user_deactivated',
  AUTENTICACAO_SUCESSO: 'authentication_successful',
  AUTENTICACAO_FALHA: 'authentication_failed',
  RECUPERACAO_SENHA_SOLICITADA: 'password_recovery_requested',
  REDEFINICAO_SENHA_CONCLUIDA: 'password_reset_completed',
  SESSAO_REVOGADA: 'session_revoked',
  TAREFA_CRIADA: 'task_created',
  TAREFA_ATUALIZADA: 'task_updated',
  TAREFA_STATUS_ALTERADO: 'task_status_changed',
  TAREFA_CONCLUIDA: 'task_completed',
  TENANT_PROVISIONADO: 'tenant_provisioned',
  TENANT_ATIVADO: 'tenant_activated',
  TENANT_DESATIVADO: 'tenant_deactivated',
  LIMITE_TAXA_EXCEDIDO: 'rate_limit_exceeded',
  VIOLACAO_CONFORMIDADE: 'compliance_violation_detected',
} as const;

export type EventoAuditoria = (typeof EVENTO_AUDITORIA)[keyof typeof EVENTO_AUDITORIA];

export const SEVERIDADE = {
  INFO: 'info',
  AVISO: 'warning',
  CRITICO: 'critical',
} as const;

export type Severidade = (typeof SEVERIDADE)[keyof typeof SEVERIDADE];

export const CAMPOS_SENSIVEIS_REDIGIDOS: readonly string[] = [
  'senhaHash',
  'senha_hash',
  'password_hash',
  'refresh_token_hash',
  'password_reset_token_hash',
  'tokenHash',
];
