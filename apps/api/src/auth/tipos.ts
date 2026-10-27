import { Perfil, StatusRegistro } from '@prisma/client';

export type UsuarioAutenticado = {
  id: string;
  email: string;
  tenantId: string;
  perfil: Perfil;
  nivelHierarquicoId: string;
  status: StatusRegistro;
  jti: string;
};

export type PayloadAccessToken = {
  sub: string;
  email: string;
  tenant_id: string;
  perfil: Perfil;
  nivel_hierarquico_id: string;
  status: StatusRegistro;
  tipo: 'access';
  jti: string;
  /// Emissão em milissegundos: `iat` só tem resolução de segundos, insuficiente para
  /// decidir revogação de sessões ocorrida no mesmo segundo da emissão.
  emitido_ms: number;
};

export type PayloadRefreshToken = {
  sub: string;
  tenant_id: string;
  tipo: 'refresh';
  jti: string;
  emitido_ms: number;
};

export type ParDeTokens = {
  access_token: string;
  refresh_token: string;
};
