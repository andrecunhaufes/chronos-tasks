import 'dotenv/config';
import { Perfil, PrismaClient, Prioridade, StatusRegistro } from '@prisma/client';
import * as argon2 from 'argon2';
import { randomUUID } from 'node:crypto';

// Tenant de demonstração: volume pequeno e dados plausíveis, para navegar pela interface.
// Separado dos tenants `e2e` (resíduo de teste) e `carga` (10.000 registros sintéticos).
const prisma = new PrismaClient();

const SLUG = 'demo';
const SENHA = process.env.SEED_DEMO_PASSWORD ?? 'Chronos@2026';
const DIA_MS = 24 * 60 * 60 * 1000;

const NIVEIS = [
  { nome: 'Colaborador', profundidade: 1 },
  { nome: 'Gestor / Líder de Equipe', profundidade: 2 },
  { nome: 'Diretor', profundidade: 3 },
];

const EQUIPE = [
  { nome: 'Helena Marques', email: 'helena@demo.local', perfil: Perfil.administrador_tenant, nivel: 2 },
  { nome: 'Rafael Andrade', email: 'rafael@demo.local', perfil: Perfil.gestor, nivel: 1 },
  { nome: 'Camila Ferreira', email: 'camila@demo.local', perfil: Perfil.colaborador, nivel: 0 },
  { nome: 'Diego Nakamura', email: 'diego@demo.local', perfil: Perfil.colaborador, nivel: 0 },
  { nome: 'Beatriz Lopes', email: 'beatriz@demo.local', perfil: Perfil.colaborador, nivel: 0 },
];

// prazoEmDias negativo vence no passado, o que exercita o destaque de atraso.
const TAREFAS = [
  { titulo: 'Revisar proposta comercial da Vertex', descricao: 'Conferir escopo, prazos e condições de pagamento antes do envio.', responsavel: 1, prioridade: Prioridade.alta, status: 'Em Andamento', prazoEmDias: 2 },
  { titulo: 'Migrar relatórios para o novo painel', descricao: 'Portar os cinco relatórios operacionais e validar os totais com o time financeiro.', responsavel: 3, prioridade: Prioridade.media, status: 'Em Andamento', prazoEmDias: 9 },
  { titulo: 'Corrigir falha no fechamento mensal', descricao: 'Lançamentos do último dia do mês não entram na consolidação.', responsavel: 2, prioridade: Prioridade.urgente, status: 'Em Andamento', prazoEmDias: -1 },
  { titulo: 'Atualizar política de acesso dos fornecedores', descricao: null, responsavel: 0, prioridade: Prioridade.media, status: 'A Fazer', prazoEmDias: 14 },
  { titulo: 'Preparar apresentação do comitê trimestral', descricao: 'Consolidar indicadores dos três meses e destacar os desvios.', responsavel: 1, prioridade: Prioridade.alta, status: 'A Fazer', prazoEmDias: 5 },
  { titulo: 'Renovar certificado do ambiente de homologação', descricao: 'Expira no fim do mês; solicitar com antecedência ao time de infraestrutura.', responsavel: 3, prioridade: Prioridade.urgente, status: 'A Fazer', prazoEmDias: -3 },
  { titulo: 'Cadastrar novos centros de custo', descricao: 'Quatro centros aprovados na última reunião de diretoria.', responsavel: 4, prioridade: Prioridade.baixa, status: 'A Fazer', prazoEmDias: 21 },
  { titulo: 'Levantar requisitos do módulo de contratos', descricao: 'Entrevistar jurídico e comercial; consolidar em documento único.', responsavel: 2, prioridade: Prioridade.media, status: 'A Fazer', prazoEmDias: 11 },
  { titulo: 'Documentar rotina de fechamento', descricao: null, responsavel: 4, prioridade: Prioridade.baixa, status: 'A Fazer', prazoEmDias: null },
  { titulo: 'Consolidar feedback da pesquisa interna', descricao: 'Agrupar respostas por área e destacar os três temas mais citados.', responsavel: 0, prioridade: Prioridade.media, status: 'Concluído', prazoEmDias: -6 },
  { titulo: 'Ajustar permissões do time de suporte', descricao: 'Perfis de suporte estavam com acesso indevido ao módulo financeiro.', responsavel: 1, prioridade: Prioridade.alta, status: 'Concluído', prazoEmDias: -9 },
  { titulo: 'Arquivar contratos encerrados em 2025', descricao: null, responsavel: 3, prioridade: Prioridade.baixa, status: 'Concluído', prazoEmDias: -15 },
];

async function main(): Promise<void> {
  const existente = await prisma.tenant.findUnique({ where: { slug: SLUG } });
  if (existente) {
    console.log(`Tenant '${SLUG}' já existe. Apague-o antes de semear de novo.`);
    return;
  }

  const plataforma = await prisma.usuario.findFirst({
    where: { perfil: Perfil.administrador_plataforma },
  });
  if (!plataforma) throw new Error('Rode `pnpm --filter @chronos/api seed` antes.');

  const senhaHash = await argon2.hash(SENHA, {
    type: argon2.argon2id,
    memoryCost: 64 * 1024,
    timeCost: 3,
    parallelism: 4,
  });

  const tenantId = randomUUID();
  const niveisIds = NIVEIS.map(() => randomUUID());
  const usuariosIds = EQUIPE.map(() => randomUUID());

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SET CONSTRAINTS ALL DEFERRED`;

    await tx.tenant.create({
      data: {
        id: tenantId,
        nome: 'Meridian Consultoria',
        slug: SLUG,
        status: StatusRegistro.ativo,
        administradorCriadorId: plataforma.id,
        dataUltimaAtivacao: new Date(),
      },
    });

    await tx.nivelHierarquico.createMany({
      data: NIVEIS.map((nivel, i) => ({
        id: niveisIds[i],
        tenantId,
        nome: nivel.nome,
        profundidade: nivel.profundidade,
        criadorId: plataforma.id,
      })),
    });

    await tx.usuario.createMany({
      data: EQUIPE.map((pessoa, i) => ({
        id: usuariosIds[i],
        tenantId,
        nomeCompleto: pessoa.nome,
        email: pessoa.email,
        senhaHash,
        nivelHierarquicoId: niveisIds[pessoa.nivel],
        perfil: pessoa.perfil,
        status: StatusRegistro.ativo,
        criadorId: plataforma.id,
        dataUltimaAtivacao: new Date(),
      })),
    });
  });

  const agora = Date.now();

  for (const tarefa of TAREFAS) {
    const concluida = tarefa.status === 'Concluído';

    const criada = await prisma.tarefa.create({
      data: {
        tenantId,
        titulo: tarefa.titulo,
        descricao: tarefa.descricao,
        responsavelId: usuariosIds[tarefa.responsavel],
        criadorId: usuariosIds[0],
        prioridade: tarefa.prioridade,
        status: tarefa.status,
        dataLimite: tarefa.prazoEmDias === null ? null : new Date(agora + tarefa.prazoEmDias * DIA_MS),
        dataConclusao: concluida ? new Date(agora - 2 * DIA_MS) : null,
      },
    });

    // O histórico só existe para quem saiu de "A Fazer"; as transições ficam coerentes
    // com o que a interface mostra no detalhe da tarefa.
    if (tarefa.status !== 'A Fazer') {
      await prisma.historicoStatusTarefa.create({
        data: {
          tarefaId: criada.id,
          tenantId,
          statusAnterior: 'A Fazer',
          statusNovo: 'Em Andamento',
          dataTransicao: new Date(agora - 5 * DIA_MS),
          executorId: usuariosIds[tarefa.responsavel],
        },
      });
    }

    if (concluida) {
      await prisma.historicoStatusTarefa.create({
        data: {
          tarefaId: criada.id,
          tenantId,
          statusAnterior: 'Em Andamento',
          statusNovo: 'Concluído',
          dataTransicao: new Date(agora - 2 * DIA_MS),
          executorId: usuariosIds[tarefa.responsavel],
        },
      });
    }
  }

  console.log(`Tenant '${SLUG}' (Meridian Consultoria) criado.`);
  console.log(`  ${EQUIPE.length} usuários, ${TAREFAS.length} tarefas nas três colunas.`);
  console.log(`  Entre com ${EQUIPE[0].email} (administrador do tenant) e senha ${SENHA}.`);
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
