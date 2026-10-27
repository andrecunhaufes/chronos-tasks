import 'dotenv/config';
import { Perfil, PrismaClient, StatusRegistro } from '@prisma/client';
import * as argon2 from 'argon2';
import { randomUUID } from 'node:crypto';

// Cria um tenant determinístico para os testes E2E (fluxos de login, criação de tarefa
// e movimentação no Kanban, exigidos pelo stack_id 753). Idempotente: reexecutar apenas
// redefine a senha do administrador.
const prisma = new PrismaClient();

const SLUG = 'e2e';
const EMAIL = 'e2e@chronos.local';
const SENHA = 'Chronos@2026';

const NIVEIS_PADRAO = [
  { nome: 'Colaborador', profundidade: 1 },
  { nome: 'Gestor / Líder de Equipe', profundidade: 2 },
  { nome: 'Diretor', profundidade: 3 },
];

async function main(): Promise<void> {
  const senhaHash = await argon2.hash(SENHA, {
    type: argon2.argon2id,
    memoryCost: 64 * 1024,
    timeCost: 3,
    parallelism: 4,
  });

  const existente = await prisma.tenant.findUnique({ where: { slug: SLUG } });

  if (existente) {
    await prisma.usuario.updateMany({
      where: { tenantId: existente.id, email: EMAIL },
      data: { senhaHash, status: StatusRegistro.ativo },
    });
    await prisma.tenant.update({
      where: { id: existente.id },
      data: { status: StatusRegistro.ativo },
    });
    console.log(`Tenant E2E já existia; senha redefinida para ${EMAIL}`);
    return;
  }

  const plataforma = await prisma.usuario.findFirst({
    where: { perfil: Perfil.administrador_plataforma },
  });
  if (!plataforma) throw new Error('Rode `npm run seed` antes: falta o administrador da plataforma.');

  const tenantId = randomUUID();
  const usuarioId = randomUUID();
  const nivelId = randomUUID();

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SET CONSTRAINTS ALL DEFERRED`;

    await tx.tenant.create({
      data: {
        id: tenantId,
        nome: 'Organização E2E',
        slug: SLUG,
        status: StatusRegistro.ativo,
        administradorCriadorId: plataforma.id,
        dataUltimaAtivacao: new Date(),
      },
    });

    await tx.nivelHierarquico.create({
      data: { id: nivelId, tenantId, nome: 'Diretor', profundidade: 3, criadorId: plataforma.id },
    });

    await tx.nivelHierarquico.createMany({
      data: NIVEIS_PADRAO.filter((nivel) => nivel.nome !== 'Diretor').map((nivel) => ({
        tenantId,
        nome: nivel.nome,
        profundidade: nivel.profundidade,
        criadorId: plataforma.id,
      })),
    });

    await tx.usuario.create({
      data: {
        id: usuarioId,
        tenantId,
        nomeCompleto: 'Administradora E2E',
        email: EMAIL,
        senhaHash,
        nivelHierarquicoId: nivelId,
        perfil: Perfil.administrador_tenant,
        status: StatusRegistro.ativo,
        criadorId: plataforma.id,
        dataUltimaAtivacao: new Date(),
      },
    });
  });

  console.log(`Tenant E2E provisionado: ${SLUG} / ${EMAIL}`);
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
