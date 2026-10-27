import 'dotenv/config';
import { Perfil, PrismaClient, StatusRegistro } from '@prisma/client';
import * as argon2 from 'argon2';
import { randomUUID } from 'node:crypto';

const prisma = new PrismaClient();

const NIVEIS_PADRAO = [
  { nome: 'Colaborador', profundidade: 1 },
  { nome: 'Gestor / Líder de Equipe', profundidade: 2 },
  { nome: 'Diretor', profundidade: 3 },
];

async function main(): Promise<void> {
  const emailAdmin = process.env.SEED_ADMIN_EMAIL ?? 'admin@chronos.local';
  const senhaAdmin = process.env.SEED_ADMIN_PASSWORD ?? 'Chronos@2026';

  const jaExiste = await prisma.usuario.findFirst({ where: { perfil: Perfil.administrador_plataforma } });
  if (jaExiste) {
    console.log('Administrador da plataforma já provisionado; nada a fazer.');
    return;
  }

  const tenantId = randomUUID();
  const usuarioId = randomUUID();
  const nivelId = randomUUID();
  const senhaHash = await argon2.hash(senhaAdmin, {
    type: argon2.argon2id,
    memoryCost: 64 * 1024,
    timeCost: 3,
    parallelism: 4,
  });

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SET CONSTRAINTS ALL DEFERRED`;

    await tx.tenant.create({
      data: {
        id: tenantId,
        nome: 'Plataforma Chronos',
        slug: 'plataforma',
        status: StatusRegistro.ativo,
        administradorCriadorId: usuarioId,
        dataUltimaAtivacao: new Date(),
      },
    });

    await tx.nivelHierarquico.create({
      data: { id: nivelId, tenantId, nome: 'Diretor', profundidade: 3, criadorId: usuarioId },
    });

    await tx.usuario.create({
      data: {
        id: usuarioId,
        tenantId,
        nomeCompleto: 'Administrador da Plataforma',
        email: emailAdmin,
        senhaHash,
        nivelHierarquicoId: nivelId,
        perfil: Perfil.administrador_plataforma,
        status: StatusRegistro.ativo,
        dataUltimaAtivacao: new Date(),
      },
    });

    await tx.nivelHierarquico.createMany({
      data: NIVEIS_PADRAO.filter((nivel) => nivel.nome !== 'Diretor').map((nivel) => ({
        tenantId,
        nome: nivel.nome,
        profundidade: nivel.profundidade,
        criadorId: usuarioId,
      })),
    });
  });

  console.log(`Administrador da plataforma criado: ${emailAdmin}`);
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
