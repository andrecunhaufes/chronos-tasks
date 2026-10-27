import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, RotateCcw, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FormularioTarefa, FormularioTarefaDados } from '@/componentes/FormularioTarefa';
import {
  Aviso,
  AvisoSucesso,
  Botao,
  Confirmacao,
  Etiqueta,
  Modal,
  Selecao,
} from '@/componentes/ui';
import { usarSessao } from '@/hooks/usarSessao';
import { extrairMensagemErro } from '@/servicos/api';
import { tarefas } from '@/servicos/recursos';
import { StatusTarefa } from '@/servicos/tipos';

export function PaginaDetalheTarefa(): JSX.Element {
  const { t, i18n } = useTranslation();
  const { id = '' } = useParams<{ id: string }>();
  const navegar = useNavigate();
  const clienteQuery = useQueryClient();
  const { temPerfil } = usarSessao();

  const [editando, definirEditando] = useState(false);
  const [confirmandoExclusao, definirConfirmandoExclusao] = useState(false);
  const [confirmandoConclusao, definirConfirmandoConclusao] = useState(false);
  const [confirmandoDescarte, definirConfirmandoDescarte] = useState(false);
  const [erro, definirErro] = useState<string | null>(null);
  const [sucesso, definirSucesso] = useState<string | null>(null);

  const { data: tarefa, isLoading } = useQuery({
    queryKey: ['tarefa', id],
    queryFn: () => tarefas.obter(id),
  });

  const { data: colunas } = useQuery({ queryKey: ['colunas'], queryFn: tarefas.colunas });

  const invalidar = async (): Promise<void> => {
    await clienteQuery.invalidateQueries({ queryKey: ['tarefa', id] });
    await clienteQuery.invalidateQueries({ queryKey: ['tarefas'] });
  };

  const atualizar = useMutation({
    // O status tem endpoint proprio para que a transicao entre no historico;
    // por isso a edicao envia os demais campos e, se o status mudou, transita depois.
    mutationFn: async (dados: FormularioTarefaDados) => {
      await tarefas.atualizar(id, {
        titulo: dados.titulo,
        descricao: dados.descricao || null,
        responsavel_id: dados.responsavel_id,
        prioridade: dados.prioridade,
        data_limite: dados.data_limite || null,
      });

      if (tarefa && dados.status !== tarefa.status) {
        await tarefas.alterarStatus(id, dados.status);
      }
    },
    onSuccess: async () => {
      definirEditando(false);
      definirSucesso(t('tarefas.tarefaAtualizada'));
      await invalidar();
    },
    onError: (falha) => definirErro(extrairMensagemErro(falha)),
  });

  const alterarStatus = useMutation({
    mutationFn: (status: StatusTarefa) => tarefas.alterarStatus(id, status),
    onSuccess: async () => {
      definirSucesso(t('tarefas.statusAtualizado'));
      await invalidar();
    },
    onError: (falha) => definirErro(extrairMensagemErro(falha)),
  });

  const concluir = useMutation({
    mutationFn: () => tarefas.concluir(id),
    onSuccess: async () => {
      definirSucesso(t('tarefas.statusAtualizado'));
      await invalidar();
    },
    onError: (falha) => definirErro(extrairMensagemErro(falha)),
  });

  const reabrir = useMutation({
    mutationFn: () => tarefas.reabrir(id),
    onSuccess: async () => {
      definirSucesso(t('tarefas.statusAtualizado'));
      await invalidar();
    },
    onError: (falha) => definirErro(extrairMensagemErro(falha)),
  });

  const excluir = useMutation({
    mutationFn: () => tarefas.excluir(id),
    onSuccess: async () => {
      await clienteQuery.invalidateQueries({ queryKey: ['tarefas'] });
      navegar('/tasks');
    },
    onError: (falha) => definirErro(extrairMensagemErro(falha)),
  });

  if (isLoading) return <p className="text-sm text-slate-500">{t('app.carregando')}</p>;
  if (!tarefa) return <p className="text-sm text-slate-500">{t('app.nenhumResultado')}</p>;

  const formatar = (valor: string | null): string =>
    valor ? new Date(valor).toLocaleString(i18n.language) : '—';

  return (
    <div className="flex flex-col gap-4">
      <Link
        to="/tasks"
        className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('app.voltar')}
      </Link>

      {erro ? <Aviso mensagem={erro} /> : null}
      {sucesso ? <AvisoSucesso mensagem={sucesso} /> : null}

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{tarefa.titulo}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <Etiqueta>{t(`prioridade.${tarefa.prioridade}`)}</Etiqueta>
            <Etiqueta tom={tarefa.data_conclusao ? 'sucesso' : 'neutro'}>{tarefa.status}</Etiqueta>
            {tarefa.destaque_critico && tarefa.destaque_atrasado ? (
              <Etiqueta tom="atraso">{t('tarefas.criticaEAtrasada')}</Etiqueta>
            ) : (
              <>
                {tarefa.destaque_critico ? (
                  <Etiqueta tom="critico">{t('tarefas.critica')}</Etiqueta>
                ) : null}
                {tarefa.destaque_atrasado ? (
                  <Etiqueta tom="atraso">{t('tarefas.atrasada')}</Etiqueta>
                ) : null}
              </>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Selecao
            aria-label={t('tarefas.status')}
            value={tarefa.status}
            onChange={(evento) => alterarStatus.mutate(evento.target.value as StatusTarefa)}
          >
            {colunas?.map((coluna) => (
              <option key={coluna.chave} value={coluna.chave}>
                {coluna.rotulo}
              </option>
            ))}
          </Selecao>

          {tarefa.data_conclusao === null ? (
            <Botao onClick={() => definirConfirmandoConclusao(true)} disabled={concluir.isPending}>
              <Check className="h-4 w-4" />
              {t('tarefas.concluir')}
            </Botao>
          ) : (
            <Botao
              variante="secundario"
              onClick={() => reabrir.mutate()}
              disabled={reabrir.isPending}
            >
              <RotateCcw className="h-4 w-4" />
              {t('tarefas.reabrir')}
            </Botao>
          )}

          <Botao variante="secundario" onClick={() => definirEditando(true)}>
            {t('app.editar')}
          </Botao>

          {temPerfil('gestor', 'administrador_tenant') ? (
            <Botao variante="perigo" onClick={() => definirConfirmandoExclusao(true)}>
              <Trash2 className="h-4 w-4" />
            </Botao>
          ) : null}
        </div>
      </header>

      <section className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2">
        <Detalhe rotulo={t('tarefas.descricao')} valor={tarefa.descricao ?? '—'} />
        <Detalhe rotulo={t('tarefas.responsavel')} valor={tarefa.responsavel_nome} />
        <Detalhe
          rotulo={t('tarefas.dataLimite')}
          valor={
            tarefa.data_limite
              ? new Date(tarefa.data_limite).toLocaleDateString(i18n.language)
              : t('tarefas.semPrazo')
          }
        />
        <Detalhe rotulo={t('tarefas.criadaEm')} valor={formatar(tarefa.data_criacao)} />
        <Detalhe rotulo={t('tarefas.concluidaEm')} valor={formatar(tarefa.data_conclusao)} />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">{t('tarefas.historico')}</h2>

        {tarefa.historico_status.length === 0 ? (
          <p className="text-sm text-slate-500">{t('app.nenhumResultado')}</p>
        ) : (
          <ol className="flex flex-col gap-2">
            {tarefa.historico_status.map((transicao) => (
              <li key={transicao.id} className="flex flex-wrap gap-2 text-sm text-slate-600">
                <span className="text-slate-400">{formatar(transicao.data_transicao)}</span>
                <span>
                  {transicao.status_anterior} → <strong>{transicao.status_novo}</strong>
                </span>
                <span className="text-slate-400">{transicao.executor_nome}</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <Confirmacao
        aberto={confirmandoConclusao}
        titulo={t('tarefas.concluir')}
        mensagem={t('tarefas.confirmarConclusao', { titulo: tarefa.titulo })}
        rotuloConfirmar={t('tarefas.concluir')}
        rotuloCancelar={t('app.cancelar')}
        aoConfirmar={() => {
          definirConfirmandoConclusao(false);
          concluir.mutate();
        }}
        aoCancelar={() => definirConfirmandoConclusao(false)}
      />

      <Confirmacao
        aberto={confirmandoExclusao}
        titulo={t('app.excluir')}
        mensagem={t('tarefas.confirmarExclusao')}
        rotuloConfirmar={t('app.excluir')}
        rotuloCancelar={t('app.cancelar')}
        aoConfirmar={() => {
          definirConfirmandoExclusao(false);
          excluir.mutate();
        }}
        aoCancelar={() => definirConfirmandoExclusao(false)}
      />

      <Modal aberto={editando} titulo={t('app.editar')} aoFechar={() => definirEditando(false)}>
        <FormularioTarefa
          tarefa={tarefa}
          aoSalvar={(dados) => atualizar.mutate(dados)}
          aoCancelar={(temAlteracaoPendente) => {
            if (temAlteracaoPendente) {
              definirConfirmandoDescarte(true);
              return;
            }
            definirEditando(false);
          }}
          salvando={atualizar.isPending}
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
          definirEditando(false);
        }}
        aoCancelar={() => definirConfirmandoDescarte(false)}
      />
    </div>
  );
}

function Detalhe({ rotulo, valor }: { rotulo: string; valor: string }): JSX.Element {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-400">{rotulo}</dt>
      <dd className="text-sm text-slate-800">{valor}</dd>
    </div>
  );
}
