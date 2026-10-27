import { Injectable, OnModuleInit } from '@nestjs/common';
import { Perfil } from '@prisma/client';
import { Enforcer, Model, StringAdapter, newEnforcer } from 'casbin';
import { Acao, MODELO_CASBIN, POLITICAS, Recurso } from './politicas';

@Injectable()
export class RbacService implements OnModuleInit {
  private enforcer!: Enforcer;

  async onModuleInit(): Promise<void> {
    const modelo = new Model();
    modelo.loadModelFromText(MODELO_CASBIN);

    const politicasCsv = POLITICAS.map(
      ([perfil, recurso, acao]) => `p, ${perfil}, ${recurso}, ${acao}`,
    ).join('\n');
    this.enforcer = await newEnforcer(modelo, new StringAdapter(politicasCsv));
  }

  async permite(perfil: Perfil, recurso: Recurso, acao: Acao): Promise<boolean> {
    return this.enforcer.enforce(perfil, recurso, acao);
  }
}
