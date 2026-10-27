import { AlertTriangle, ArrowDown, ArrowUp, ArrowUpDown, Check, Flame, Pencil } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Botao, Etiqueta, cn } from '@/componentes/ui';
import { FiltrosTarefa } from '@/servicos/recursos';
import { Prioridade, Tarefa } from '@/servicos/tipos';

type Coluna = { campo: string; rotulo: string; classe?: string };

const TEXTO_PRIORIDADE: Record<Prioridade, string> = {
  baixa: 'text-slate-600',
  media: 'text-sky-700',
  alta: 'text-amber-700',
  urgente: 'text-red-700',
};

export function TabelaTarefas({
  tarefas,
  ordenacao,
  aoOrdenar,
  aoConcluir,
  aoEditar,
}: {
  tarefas: Tarefa[];
  ordenacao: Pick<FiltrosTarefa, 'sort_by' | 'sort_order'>;
  aoOrdenar: (campo: string) => void;
  aoConcluir: (tarefa: Tarefa) => void;
  aoEditar: (tarefa: Tarefa) => void;
}): JSX.Element {
  const { t, i18n } = useTranslation();
  const navegar = useNavigate();

  const colunas: Coluna[] = [
    { campo: 'titulo', rotulo: t('tarefas.campoTitulo') },
    { campo: 'responsavel', rotulo: t('tarefas.responsavel') },
    { campo: 'prioridade', rotulo: t('tarefas.prioridade') },
    { campo: 'status', rotulo: t('tarefas.status') },
    { campo: 'data_limite', rotulo: t('tarefas.dataLimite') },
  ];

  const campoAtual = ordenacao.sort_by ?? 'data_criacao';
  const direcao = ordenacao.sort_order ?? 'desc';

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
          <tr>
            {colunas.map((coluna) => {
              const ativa = campoAtual === coluna.campo;
              const Icone = !ativa ? ArrowUpDown : direcao === 'asc' ? ArrowUp : ArrowDown;

              return (
                <th
                  key={coluna.campo}
                  scope="col"
                  className="px-4 py-3"
                  aria-sort={ativa ? (direcao === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  <button
                    type="button"
                    onClick={() => aoOrdenar(coluna.campo)}
                    aria-label={t('tarefas.ordenarPor', { coluna: coluna.rotulo })}
                    className={cn(
                      'flex items-center gap-1 uppercase transition-colors',
                      ativa ? 'font-semibold text-sky-700' : 'hover:text-slate-700',
                    )}
                  >
                    {coluna.rotulo}
                    <Icone className={cn('h-3 w-3', ativa ? 'text-sky-600' : 'text-slate-300')} />
                  </button>
                </th>
              );
            })}
            <th scope="col" className="px-4 py-3" />
          </tr>
        </thead>

        <tbody>
          {tarefas.map((tarefa) => {
            const criticaEAtrasada = tarefa.destaque_critico && tarefa.destaque_atrasado;

            return (
              <tr
                key={tarefa.id}
                onClick={() => navegar(`/tasks/${tarefa.id}`)}
                className={cn(
                  'cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50',
                  criticaEAtrasada
                    ? 'bg-red-50/70'
                    : tarefa.destaque_atrasado
                      ? 'bg-red-50/40'
                      : tarefa.destaque_critico
                        ? 'bg-amber-50/40'
                        : '',
                )}
              >
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-slate-900">{tarefa.titulo}</span>

                    {criticaEAtrasada ? (
                      <Etiqueta tom="atraso">
                        <span className="flex items-center gap-1">
                          <Flame className="h-3 w-3" />
                          {t('tarefas.criticaEAtrasada')}
                        </span>
                      </Etiqueta>
                    ) : (
                      <>
                        {tarefa.destaque_critico ? (
                          <Etiqueta tom="critico">{t('tarefas.critica')}</Etiqueta>
                        ) : null}
                        {tarefa.destaque_atrasado ? (
                          <Etiqueta tom="atraso">
                            <span className="flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              {t('tarefas.atrasada')}
                            </span>
                          </Etiqueta>
                        ) : null}
                      </>
                    )}
                  </div>
                </td>

                <td className="px-4 py-3 text-slate-600">{tarefa.responsavel_nome}</td>

                <td className={cn('px-4 py-3 font-medium', TEXTO_PRIORIDADE[tarefa.prioridade])}>
                  {t(`prioridade.${tarefa.prioridade}`)}
                </td>

                <td className="px-4 py-3">
                  <Etiqueta tom={tarefa.data_conclusao ? 'sucesso' : 'neutro'}>
                    {tarefa.status}
                  </Etiqueta>
                </td>

                <td className="px-4 py-3 text-slate-600">
                  {tarefa.data_limite
                    ? new Date(tarefa.data_limite).toLocaleDateString(i18n.language)
                    : t('tarefas.semPrazo')}
                </td>

                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Botao
                      variante="secundario"
                      aria-label={t('app.editar')}
                      onClick={(evento) => {
                        evento.stopPropagation();
                        aoEditar(tarefa);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Botao>

                    {tarefa.data_conclusao === null ? (
                      <Botao
                        variante="secundario"
                        aria-label={t('tarefas.concluir')}
                        onClick={(evento) => {
                          evento.stopPropagation();
                          aoConcluir(tarefa);
                        }}
                      >
                        <Check className="h-4 w-4" />
                      </Botao>
                    ) : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
