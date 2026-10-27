import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LayoutGrid, List, Plus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiltrosAtivos } from '@/componentes/FiltrosAtivos';
import { FormularioTarefa, FormularioTarefaDados } from '@/componentes/FormularioTarefa';
import { PainelFiltros } from '@/componentes/PainelFiltros';
import { QuadroKanban } from '@/componentes/QuadroKanban';
import { TabelaTarefas } from '@/componentes/TabelaTarefas';
import { Aviso, AvisoSucesso, Botao, Confirmacao, Modal, cn } from '@/componentes/ui';
import { extrairMensagemErro } from '@/servicos/api';
import { FiltrosTarefa, tarefas, usuarios } from '@/servicos/recursos';
import { StatusTarefa, Tarefa } from '@/servicos/tipos';

type Visao = 'lista' | 'kanban';

const TAMANHO_PAGINA = 20;

export function PaginaTarefas(): JSX.Element {
  const { t } = useTranslation();
  const clienteQuery = useQueryClient();

  const [visao, definirVisao] = useState<Visao>('lista');
  const [filtros, definirFiltros] = useState<FiltrosTarefa>({
    sort_by: 'data_criacao',
    sort_order: 'desc',
  });
  const [cursores, definirCursores] = useState<string[]>([]);
  const [modalAberto, definirModalAberto] = useState(false);
  const [aConcluir, definirAConcluir] = useState<Tarefa | null>(null);
  const [emEdicao, definirEmEdicao] = useState<Tarefa | null>(null);
  const [confirmandoDescarte, definirConfirmandoDescarte] = useState(false);
  const [erro, definirErro] = useState<string | null>(null);
  const [sucesso, definirSucesso] = useState<string | null>(null);

  const cursorAtual = cursores[cursores.length - 1];
  const consulta = { ...filtros, limit: TAMANHO_PAGINA, cursor: cursorAtual };

  const consultaLista = useQuery({
    queryKey: ['tarefas', consulta],
    queryFn: () => tarefas.listar(consulta),
    enabled: visao === 'lista',
  });

  const consultaKanban = useQuery({
    queryKey: ['tarefas', 'kanban', filtros.responsavel_id, filtros.prioridade, filtros.pesquisa],
    queryFn: () =>
      tarefas.quadroKanban({
        responsavel_id: filtros.responsavel_id,
        prioridade: filtros.prioridade,
        pesquisa: filtros.pesquisa,
      }),
    enabled: visao === 'kanban',
  });

  const { data: listaUsuarios } = useQuery({
    queryKey: ['usuarios', 'ativos'],
    queryFn: () => usuarios.listar({ status: 'ativo', limit: 100 }),
  });

  const nomePorUsuario = Object.fromEntries(
    (listaUsuarios?.data ?? []).map((usuario) => [usuario.id, usuario.nome_completo]),
  );

  const invalidar = async (): Promise<void> => {
    await clienteQuery.invalidateQueries({ queryKey: ['tarefas'] });
  };

  const criar = useMutation({
    mutationFn: (dados: FormularioTarefaDados) =>
      tarefas.criar({
        titulo: dados.titulo,
        descricao: dados.descricao || undefined,
        responsavel_id: dados.responsavel_id,
        prioridade: dados.prioridade,
        status: dados.status,
        data_limite: dados.data_limite || undefined,
      }),
    onSuccess: async () => {
      definirModalAberto(false);
      definirSucesso(t('tarefas.tarefaCriada'));
      definirErro(null);
      await invalidar();
    },
    onError: (falha) => definirErro(extrairMensagemErro(falha)),
  });

  const mover = useMutation({
    mutationFn: ({ id, status }: { id: string; status: StatusTarefa }) =>
      tarefas.alterarStatus(id, status),
    onSuccess: async () => {
      definirSucesso(t('tarefas.statusAtualizado'));
      definirErro(null);
      await invalidar();
    },
    // O quadro é reconsultado no erro, então o cartão volta à coluna de origem.
    onError: async (falha) => {
      definirErro(`${t('tarefas.falhaMovimentacao')} ${extrairMensagemErro(falha)}`);
      await invalidar();
    },
  });

  const concluir = useMutation({
    mutationFn: (tarefaId: string) => tarefas.concluir(tarefaId),
    onSuccess: async () => {
      definirSucesso(t('tarefas.tarefaConcluida'));
      definirErro(null);
      await invalidar();
    },
    onError: (falha) => definirErro(extrairMensagemErro(falha)),
  });

  const atualizar = useMutation({
    // O status tem endpoint proprio para que a transicao entre no historico.
    mutationFn: async (dados: FormularioTarefaDados) => {
      if (!emEdicao) return;

      await tarefas.atualizar(emEdicao.id, {
        titulo: dados.titulo,
        descricao: dados.descricao || null,
        responsavel_id: dados.responsavel_id,
        prioridade: dados.prioridade,
        data_limite: dados.data_limite || null,
      });

      if (dados.status !== emEdicao.status) {
        await tarefas.alterarStatus(emEdicao.id, dados.status);
      }
    },
    onSuccess: async () => {
      definirEmEdicao(null);
      definirSucesso(t('tarefas.tarefaAtualizada'));
      definirErro(null);
      await invalidar();
    },
    onError: (falha) => definirErro(extrairMensagemErro(falha)),
  });

  const fecharFormulario = (temAlteracaoPendente: boolean): void => {
    if (temAlteracaoPendente) {
      definirConfirmandoDescarte(true);
      return;
    }
    definirModalAberto(false);
    definirEmEdicao(null);
  };

  const trocarFiltros = (novos: FiltrosTarefa): void => {
    definirFiltros({ sort_by: filtros.sort_by, sort_order: filtros.sort_order, ...novos });
    definirCursores([]);
  };

  const ordenarPor = (campo: string): void => {
    const mesmaColuna = filtros.sort_by === campo;
    definirFiltros({
      ...filtros,
      sort_by: campo,
      sort_order: mesmaColuna && filtros.sort_order === 'asc' ? 'desc' : 'asc',
    });
    definirCursores([]);
  };

  const removerFiltro = (chave: keyof FiltrosTarefa): void => {
    const restantes = { ...filtros };
    delete restantes[chave];
    definirFiltros(restantes);
    definirCursores([]);
  };

  const pagina = consultaLista.data;
  const totalExibidas = cursores.length * TAMANHO_PAGINA + (pagina?.data.length ?? 0);

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900">{t('tarefas.titulo')}</h1>

        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-slate-200 bg-white p-0.5">
            {(['lista', 'kanban'] as const).map((opcao) => (
              <button
                key={opcao}
                type="button"
                onClick={() => definirVisao(opcao)}
                aria-pressed={visao === opcao}
                className={cn(
                  'flex items-center gap-1 rounded px-3 py-1 text-sm',
                  visao === opcao ? 'bg-sky-50 text-sky-700' : 'text-slate-500',
                )}
              >
                {opcao === 'lista' ? (
                  <List className="h-4 w-4" />
                ) : (
                  <LayoutGrid className="h-4 w-4" />
                )}
                {opcao === 'lista' ? t('tarefas.visaoLista') : t('tarefas.visaoKanban')}
              </button>
            ))}
          </div>

          <Botao onClick={() => definirModalAberto(true)}>
            <Plus className="h-4 w-4" />
            {t('tarefas.novaTarefa')}
          </Botao>
        </div>
      </header>

      {erro ? <Aviso mensagem={erro} /> : null}
      {sucesso ? <AvisoSucesso mensagem={sucesso} /> : null}

      <PainelFiltros filtros={filtros} aoAlterar={trocarFiltros} />

      <FiltrosAtivos
        filtros={filtros}
        nomePorUsuario={nomePorUsuario}
        aoRemover={removerFiltro}
        aoLimpar={() => trocarFiltros({})}
      />

      {visao === 'lista' ? (
        <section className="flex flex-col gap-3">
          <p className="text-xs text-slate-500">
            {t('tarefas.exibindo', {
              exibidas: totalExibidas,
              total: pagina?.pagination.total_count ?? 0,
            })}
          </p>

          {consultaLista.isLoading ? (
            <p className="text-sm text-slate-500">{t('app.carregando')}</p>
          ) : pagina && pagina.data.length === 0 ? (
            <p className="rounded-lg border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
              {t('tarefas.listaVazia')}
            </p>
          ) : (
            <TabelaTarefas
              tarefas={pagina?.data ?? []}
              ordenacao={{ sort_by: filtros.sort_by, sort_order: filtros.sort_order }}
              aoOrdenar={ordenarPor}
              aoConcluir={definirAConcluir}
              aoEditar={definirEmEdicao}
            />
          )}

          <nav className="flex items-center justify-between gap-2">
            <Botao
              variante="secundario"
              disabled={cursores.length === 0}
              onClick={() => definirCursores(cursores.slice(0, -1))}
            >
              {t('app.anterior')}
            </Botao>

            <span className="text-xs text-slate-500">
              {t('app.pagina', { numero: cursores.length + 1 })}
            </span>

            <Botao
              variante="secundario"
              disabled={!pagina?.pagination.has_more}
              onClick={() => definirCursores([...cursores, pagina?.pagination.cursor ?? ''])}
            >
              {t('app.proxima')}
            </Botao>
          </nav>
        </section>
      ) : (
        <QuadroKanban
          colunas={consultaKanban.data?.colunas ?? []}
          aoMover={(id, status) => mover.mutate({ id, status })}
          aoConcluir={definirAConcluir}
          aoEditar={definirEmEdicao}
        />
      )}

      <Confirmacao
        aberto={aConcluir !== null}
        titulo={t('tarefas.concluir')}
        mensagem={t('tarefas.confirmarConclusao', { titulo: aConcluir?.titulo ?? '' })}
        rotuloConfirmar={t('tarefas.concluir')}
        rotuloCancelar={t('app.cancelar')}
        aoConfirmar={() => {
          if (aConcluir) concluir.mutate(aConcluir.id);
          definirAConcluir(null);
        }}
        aoCancelar={() => definirAConcluir(null)}
      />

      <Modal
        aberto={modalAberto || emEdicao !== null}
        titulo={emEdicao ? t('app.editar') : t('tarefas.novaTarefa')}
        aoFechar={() => fecharFormulario(false)}
      >
        <FormularioTarefa
          key={emEdicao?.id ?? 'nova'}
          tarefa={emEdicao ?? undefined}
          aoSalvar={(dados) => (emEdicao ? atualizar.mutate(dados) : criar.mutate(dados))}
          aoCancelar={fecharFormulario}
          salvando={criar.isPending || atualizar.isPending}
        />
      </Modal>

      <Confirmacao
        aberto={confirmandoDescarte}
        titulo={t('tarefas.descartar')}
        mensagem={t('tarefas.descartarEdicao')}
        rotuloConfirmar={t('tarefas.descartar')}
        rotuloCancelar={t('app.cancelar')}
        aoConfirmar={() => {
          definirConfirmandoDescarte(false);
          definirModalAberto(false);
          definirEmEdicao(null);
        }}
        aoCancelar={() => definirConfirmandoDescarte(false)}
      />
    </div>
  );
}
