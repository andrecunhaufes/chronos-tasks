import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { EnderecoIp, Permissao, UsuarioAtual } from '../auth/decorators';
import { UsuarioAutenticado } from '../auth/tipos';
import { PipeZod } from '../common/validacao/pipe-zod';
import { uuidSchema } from '../common/validacao/esquemas-comuns';
import { ACAO, RECURSO } from '../rbac/politicas';
import {
  ListarTenantsDto,
  ProvisionarTenantDto,
  listarTenantsSchema,
  provisionarTenantSchema,
} from './tenants.dto';
import { TenantsService } from './tenants.service';

@Controller('api/tenants')
export class TenantsController {
  constructor(private readonly tenants: TenantsService) {}

  @Post()
  @Permissao(RECURSO.TENANT, ACAO.CRIAR)
  async provisionar(
    @Body(new PipeZod(provisionarTenantSchema)) dados: ProvisionarTenantDto,
    @UsuarioAtual() executor: UsuarioAutenticado,
    @EnderecoIp() enderecoIp: string,
  ) {
    return this.tenants.provisionar(dados, executor, enderecoIp);
  }

  @Get()
  @Permissao(RECURSO.TENANT, ACAO.LER)
  async listar(@Query(new PipeZod(listarTenantsSchema)) filtros: ListarTenantsDto) {
    return this.tenants.listar(filtros);
  }

  @Get(':tenant_id')
  @Permissao(RECURSO.TENANT, ACAO.LER)
  async obterPorId(@Param('tenant_id', new PipeZod(uuidSchema)) tenantId: string) {
    return this.tenants.obterPorId(tenantId);
  }

  @Patch(':tenant_id/activate')
  @HttpCode(200)
  @Permissao(RECURSO.TENANT, ACAO.ATIVAR)
  async ativar(
    @Param('tenant_id', new PipeZod(uuidSchema)) tenantId: string,
    @UsuarioAtual() executor: UsuarioAutenticado,
    @EnderecoIp() enderecoIp: string,
  ) {
    return this.tenants.ativar(tenantId, executor, enderecoIp);
  }

  @Patch(':tenant_id/deactivate')
  @HttpCode(200)
  @Permissao(RECURSO.TENANT, ACAO.DESATIVAR)
  async desativar(
    @Param('tenant_id', new PipeZod(uuidSchema)) tenantId: string,
    @UsuarioAtual() executor: UsuarioAutenticado,
    @EnderecoIp() enderecoIp: string,
  ) {
    return this.tenants.desativar(tenantId, executor, enderecoIp);
  }
}
