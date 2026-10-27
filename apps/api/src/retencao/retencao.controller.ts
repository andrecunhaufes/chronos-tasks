import { Controller, HttpCode, Post } from '@nestjs/common';
import { Permissao } from '../auth/decorators';
import { ACAO, RECURSO } from '../rbac/politicas';
import { RetencaoService } from './retencao.service';

// Disparo manual restrito ao administrador da plataforma (regra de autorização do ASSET 23881).
@Controller('api/maintenance')
export class RetencaoController {
  constructor(private readonly retencao: RetencaoService) {}

  @Post('retention')
  @HttpCode(200)
  @Permissao(RECURSO.TENANT, ACAO.ATIVAR)
  async disparar() {
    return this.retencao.executar('manual');
  }
}
