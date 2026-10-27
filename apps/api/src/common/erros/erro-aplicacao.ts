export const CODIGO_ERRO = {
  INVALID_INPUT: 'INVALID_INPUT',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  TENANT_INACTIVE: 'TENANT_INACTIVE',
  USER_INACTIVE: 'USER_INACTIVE',
} as const;

export type CodigoErro = (typeof CODIGO_ERRO)[keyof typeof CODIGO_ERRO];

const STATUS_POR_CODIGO: Record<CodigoErro, number> = {
  INVALID_INPUT: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
  TENANT_INACTIVE: 403,
  USER_INACTIVE: 403,
};

export class ErroAplicacao extends Error {
  readonly codigo: CodigoErro;
  readonly statusHttp: number;
  readonly detalhes?: unknown;

  constructor(codigo: CodigoErro, mensagem: string, detalhes?: unknown) {
    super(mensagem);
    this.name = 'ErroAplicacao';
    this.codigo = codigo;
    this.statusHttp = STATUS_POR_CODIGO[codigo];
    this.detalhes = detalhes;
  }

  static entradaInvalida(mensagem: string, detalhes?: unknown): ErroAplicacao {
    return new ErroAplicacao(CODIGO_ERRO.INVALID_INPUT, mensagem, detalhes);
  }

  static naoAutorizado(mensagem = 'Token ausente, inválido ou expirado'): ErroAplicacao {
    return new ErroAplicacao(CODIGO_ERRO.UNAUTHORIZED, mensagem, { required_auth: 'bearer' });
  }

  static credenciaisInvalidas(): ErroAplicacao {
    return new ErroAplicacao(CODIGO_ERRO.UNAUTHORIZED, 'Credenciais inválidas');
  }

  static proibido(mensagem: string): ErroAplicacao {
    return new ErroAplicacao(CODIGO_ERRO.FORBIDDEN, mensagem);
  }

  static naoEncontrado(mensagem: string): ErroAplicacao {
    return new ErroAplicacao(CODIGO_ERRO.NOT_FOUND, mensagem);
  }

  static conflito(mensagem: string, campo: string, motivo: string): ErroAplicacao {
    return new ErroAplicacao(CODIGO_ERRO.CONFLICT, mensagem, { field: campo, reason: motivo });
  }

  static limiteExcedido(segundosParaNovaTentativa: number): ErroAplicacao {
    return new ErroAplicacao(
      CODIGO_ERRO.RATE_LIMITED,
      'Limite de tentativas excedido. Tente novamente mais tarde.',
      { retry_after_seconds: segundosParaNovaTentativa },
    );
  }

  static tenantInativo(): ErroAplicacao {
    return new ErroAplicacao(
      CODIGO_ERRO.TENANT_INACTIVE,
      'Organização desativada; acesso bloqueado',
    );
  }

  static usuarioInativo(): ErroAplicacao {
    return new ErroAplicacao(CODIGO_ERRO.USER_INACTIVE, 'Usuário desativado; acesso bloqueado');
  }
}
