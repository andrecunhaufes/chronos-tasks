import 'dotenv/config';
import { Prioridade, PrismaClient, StatusRegistro } from '@prisma/client';

// Popula um tenant dedicado com o volume previsto no ASSET 23577 para o teste de carga
// do stack_id 765: até 10.000 tarefas e 100 usuários por tenant. Fica separado do tenant
// E2E para não interferir nos testes de fluxo, que contam cartões por coluna.
const prisma = new PrismaClient();

const SLUG_CARGA = 'carga';

const TOTAL_TAREFAS = Number(process.env.SEED_CARGA_TAREFAS ?? 10_000);
const TOTAL_USUARIOS = Number(process.env.SEED_CARGA_USUARIOS ?? 100);
const LOTE = 1_000;

const PRIORIDADES = [Prioridade.baixa, Prioridade.media, Prioridade.alta, Prioridade.urgente];
const DIA_MS = 24 * 60 * 60 * 1000;

async function main(): Promise<void> {
  const modelo = await prisma.tenant.findUnique({ where: { slug: 'e2e' } });
  if (!modelo) throw new Error('Rode `npx tsx prisma/seed-e2e.ts` antes.');

  const adminModelo = await prisma.usuario.findFirstOrThrow({ where: { tenantId: modelo.id } });

  const tenant =
    (await prisma.tenant.findUnique({ where: { slug: SLUG_CARGA } })) ??
    (await prisma.tenant.create({
      data: {
        nome: 'Organização de Carga',
        slug: SLUG_CARGA,
        status: StatusRegistro.ativo,
        administradorCriadorId: adminModelo.id,
        dataUltimaAtivacao: new Date(),
      },
    }));

  const admin =
    (await prisma.usuario.findFirst({ where: { tenantId: tenant.id } })) ??
    (await (async () => {
      const nivelCarga = await prisma.nivelHierarquico.create({
        data: {
          tenantId: tenant.id,
          nome: 'Diretor',
          profundidade: 3,
          criadorId: adminModelo.id,
        },
      });

      return prisma.usuario.create({
        data: {
          tenantId: tenant.id,
          nomeCompleto: 'Administrador de Carga',
          email: 'admin@carga.local',
          senhaHash: adminModelo.senhaHash,
          nivelHierarquicoId: nivelCarga.id,
          perfil: 'administrador_tenant',
          status: StatusRegistro.ativo,
          criadorId: adminModelo.id,
        },
      });
    })());
  const nivel = await prisma.nivelHierarquico.findFirstOrThrow({ where: { tenantId: tenant.id } });
  const colunas = await prisma.statusTarefa.findMany({ orderBy: { ordem: 'asc' } });

  const existentes = await prisma.usuario.count({ where: { tenantId: tenant.id } });
  const faltamUsuarios = Math.max(TOTAL_USUARIOS - existentes, 0);

  if (faltamUsuarios > 0) {
    await prisma.usuario.createMany({
      data: Array.from({ length: faltamUsuarios }, (_, i) => ({
        tenantId: tenant.id,
        nomeCompleto: `Colaborador de Carga ${i}`,
        email: `carga-${i}@carga.local`,
        senhaHash: admin.senhaHash,
        nivelHierarquicoId: nivel.id,
        perfil: 'colaborador' as const,
        status: StatusRegistro.ativo,
        criadorId: admin.id,
      })),
      skipDuplicates: true,
    });
  }

  const responsaveis = (
    await prisma.usuario.findMany({ where: { tenantId: tenant.id }, select: { id: true } })
  ).map((u) => u.id);

  const jaCriadas = await prisma.tarefa.count({ where: { tenantId: tenant.id } });
  const faltamTarefas = Math.max(TOTAL_TAREFAS - jaCriadas, 0);

  for (let inicio = 0; inicio < faltamTarefas; inicio += LOTE) {
    const tamanho = Math.min(LOTE, faltamTarefas - inicio);

    await prisma.tarefa.createMany({
      data: Array.from({ length: tamanho }, (_, i) => {
        const indice = inicio + i;
        const deslocamentoDias = (indice % 60) - 30;

        return {
          tenantId: tenant.id,
          titulo: `Tarefa de carga ${indice}`,
          descricao: `Registro sintético ${indice} para teste de volume`,
          responsavelId: responsaveis[indice % responsaveis.length],
          criadorId: admin.id,
          prioridade: PRIORIDADES[indice % PRIORIDADES.length],
          status: colunas[indice % colunas.length].chave,
          dataLimite: new Date(Date.now() + deslocamentoDias * DIA_MS),
        };
      }),
    });

    console.log(`  ${Math.min(inicio + tamanho, faltamTarefas)}/${faltamTarefas} tarefas`);
  }

  console.log(`Tenant '${SLUG_CARGA}' pronto: ${responsaveis.length} usuários, ${TOTAL_TAREFAS} tarefas.`);
  console.log('Use admin@carga.local com a mesma senha do tenant E2E nos testes de carga.');
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
