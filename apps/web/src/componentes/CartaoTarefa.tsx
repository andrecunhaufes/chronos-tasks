import { AlertTriangle, Check, Clock, Flame, Pencil } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Botao, Etiqueta, cn } from '@/componentes/ui';
import { Prioridade, Tarefa } from '@/servicos/tipos';

const BORDA_POR_PRIORIDADE: Record<Prioridade, string> = {
  baixa: 'border-l-slate-400',
  media: 'border-l-sky-500',
  alta: 'border-l-amber-500',
  urgente: 'border-l-red-500',
};

export function CartaoTarefa({
  tarefa,
  arrastavel = false,
  aoIniciarArrasto,
  aoConcluir,
  aoEditar,
}: {
  tarefa: Tarefa;
  arrastavel?: boolean;
  aoIniciarArrasto?: (tarefaId: string) => void;
  aoConcluir?: (tarefa: Tarefa) => void;
  aoEditar?: (tarefa: Tarefa) => void;
}): JSX.Element {
  const { t, i18n } = useTranslation();

  const formatarData = (valor: string | null): string =>
    valor ? new Date(valor).toLocaleDateString(i18n.language) : t('tarefas.semPrazo');

  return (
    <article
      draggable={arrastavel}
      onDragStart={(evento) => {
        evento.dataTransfer.setData('text/plain', tarefa.id);
        evento.dataTransfer.effectAllowed = 'move';
        aoIniciarArrasto?.(tarefa.id);
      }}
      className={cn(
        'rounded-md border border-l-4 border-slate-200 bg-white p-3 shadow-sm transition-shadow',
        BORDA_POR_PRIORIDADE[tarefa.prioridade],
        arrastavel && 'cursor-grab hover:shadow-md active:cursor-grabbing active:opacity-60',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <Link to={`/tasks/${tarefa.id}`} className="font-medium text-slate-900 hover:text-sky-700">
          {tarefa.titulo}
        </Link>

        <div className="flex shrink-0 gap-1">
          {aoEditar ? (
            <Botao
              variante="fantasma"
              aria-label={t('app.editar')}
              className="px-1 py-0.5"
              onClick={() => aoEditar(tarefa)}
            >
              <Pencil className="h-4 w-4" />
            </Botao>
          ) : null}

          {aoConcluir && tarefa.data_conclusao === null ? (
            <Botao
              variante="fantasma"
              aria-label={t('tarefas.concluir')}
              className="px-1 py-0.5"
              onClick={() => aoConcluir(tarefa)}
            >
              <Check className="h-4 w-4" />
            </Botao>
          ) : null}
        </div>
      </div>

      <p className="mt-1 text-xs text-slate-500">{tarefa.responsavel_nome}</p>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Etiqueta>{t(`prioridade.${tarefa.prioridade}`)}</Etiqueta>

        <span className="flex items-center gap-1 text-xs text-slate-500">
          <Clock className="h-3 w-3" />
          {formatarData(tarefa.data_limite)}
        </span>

        {tarefa.destaque_critico && tarefa.destaque_atrasado ? (
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
    </article>
  );
}
