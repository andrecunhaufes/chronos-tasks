import { useAutoAnimate } from '@formkit/auto-animate/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/componentes/ui';
import { ColunaKanban, StatusTarefa, Tarefa } from '@/servicos/tipos';
import { CartaoTarefa } from './CartaoTarefa';

export function QuadroKanban({
  colunas,
  aoMover,
  aoConcluir,
  aoEditar,
}: {
  colunas: ColunaKanban[];
  aoMover: (tarefaId: string, novoStatus: StatusTarefa) => void;
  aoConcluir: (tarefa: Tarefa) => void;
  aoEditar: (tarefa: Tarefa) => void;
}): JSX.Element {
  const [arrastando, definirArrastando] = useState<string | null>(null);

  return (
    <div
      className="grid gap-4 md:grid-cols-3"
      onDragEnd={() => definirArrastando(null)}
      style={{ gridTemplateColumns: `repeat(${Math.min(colunas.length, 3)}, minmax(0, 1fr))` }}
    >
      {colunas.map((coluna) => (
        <Coluna
          key={coluna.status}
          coluna={coluna}
          arrastando={arrastando}
          aoConcluir={aoConcluir}
          aoEditar={aoEditar}
          aoIniciarArrasto={definirArrastando}
          aoMover={(tarefaId, status) => {
            definirArrastando(null);
            aoMover(tarefaId, status);
          }}
        />
      ))}
    </div>
  );
}

function Coluna({
  coluna,
  arrastando,
  aoIniciarArrasto,
  aoConcluir,
  aoEditar,
  aoMover,
}: {
  coluna: ColunaKanban;
  arrastando: string | null;
  aoIniciarArrasto: (tarefaId: string) => void;
  aoConcluir: (tarefa: Tarefa) => void;
  aoEditar: (tarefa: Tarefa) => void;
  aoMover: (tarefaId: string, novoStatus: StatusTarefa) => void;
}): JSX.Element {
  const { t } = useTranslation();
  const [referencia] = useAutoAnimate<HTMLDivElement>();
  const [sobreposta, definirSobreposta] = useState(false);

  // A coluna que já contém o cartão arrastado não é destino válido.
  const podeReceber =
    arrastando !== null && !coluna.tarefas.some((tarefa) => tarefa.id === arrastando);

  return (
    <section
      aria-label={coluna.rotulo}
      onDragOver={(evento) => {
        if (!podeReceber) return;
        evento.preventDefault();
        definirSobreposta(true);
      }}
      onDragLeave={() => definirSobreposta(false)}
      onDrop={(evento) => {
        evento.preventDefault();
        definirSobreposta(false);
        const tarefaId = evento.dataTransfer.getData('text/plain');
        if (tarefaId && podeReceber) aoMover(tarefaId, coluna.status);
      }}
      className={cn(
        'flex flex-col gap-3 rounded-lg border-2 border-dashed p-3 transition-colors',
        sobreposta && podeReceber
          ? 'border-sky-400 bg-sky-50'
          : podeReceber
            ? 'border-slate-300 bg-slate-100'
            : 'border-transparent bg-slate-100',
      )}
    >
      <header className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700">{coluna.rotulo}</h2>
        <span className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-500">
          {coluna.total}
        </span>
      </header>

      <div ref={referencia} className="flex min-h-16 flex-col gap-2">
        {coluna.tarefas.length === 0 ? (
          <p className="rounded-md border border-slate-200 bg-white/60 px-3 py-4 text-center text-xs text-slate-400">
            {sobreposta && podeReceber
              ? t('tarefas.moverPara', { coluna: coluna.rotulo })
              : t('tarefas.colunaVazia')}
          </p>
        ) : (
          coluna.tarefas.map((tarefa) => (
            <CartaoTarefa
              key={tarefa.id}
              tarefa={tarefa}
              arrastavel
              aoIniciarArrasto={aoIniciarArrasto}
              aoConcluir={aoConcluir}
              aoEditar={aoEditar}
            />
          ))
        )}
      </div>
    </section>
  );
}
