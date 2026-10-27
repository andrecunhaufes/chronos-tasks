import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Botao } from '@/componentes/ui';
import { FiltrosTarefa } from '@/servicos/recursos';

type Chip = { chave: keyof FiltrosTarefa; rotulo: string };

export function FiltrosAtivos({
  filtros,
  nomePorUsuario,
  aoRemover,
  aoLimpar,
}: {
  filtros: FiltrosTarefa;
  nomePorUsuario: Record<string, string>;
  aoRemover: (chave: keyof FiltrosTarefa) => void;
  aoLimpar: () => void;
}): JSX.Element | null {
  const { t, i18n } = useTranslation();

  const data = (valor?: string): string =>
    valor ? new Date(valor).toLocaleDateString(i18n.language) : '';

  const chips: Chip[] = [
    ...(filtros.pesquisa ? [{ chave: 'pesquisa' as const, rotulo: `"${filtros.pesquisa}"` }] : []),
    ...(filtros.status
      ? [{ chave: 'status' as const, rotulo: `${t('tarefas.status')}: ${filtros.status}` }]
      : []),
    ...(filtros.responsavel_id
      ? [
          {
            chave: 'responsavel_id' as const,
            rotulo: `${t('tarefas.responsavel')}: ${nomePorUsuario[filtros.responsavel_id] ?? filtros.responsavel_id}`,
          },
        ]
      : []),
    ...(filtros.prioridade
      ? [
          {
            chave: 'prioridade' as const,
            rotulo: `${t('tarefas.prioridade')}: ${t(`prioridade.${filtros.prioridade}`)}`,
          },
        ]
      : []),
    ...(filtros.data_limite_inicio
      ? [
          {
            chave: 'data_limite_inicio' as const,
            rotulo: `${t('tarefas.dataLimite')} ≥ ${data(filtros.data_limite_inicio)}`,
          },
        ]
      : []),
    ...(filtros.data_limite_fim
      ? [
          {
            chave: 'data_limite_fim' as const,
            rotulo: `${t('tarefas.dataLimite')} ≤ ${data(filtros.data_limite_fim)}`,
          },
        ]
      : []),
    ...(filtros.apenas_atrasadas
      ? [{ chave: 'apenas_atrasadas' as const, rotulo: t('tarefas.apenasAtrasadas') }]
      : []),
    ...(filtros.apenas_criticas
      ? [{ chave: 'apenas_criticas' as const, rotulo: t('tarefas.apenasCriticas') }]
      : []),
  ];

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs uppercase tracking-wide text-slate-400">
        {t('tarefas.filtrosAtivos')}
      </span>

      {chips.map((chip) => (
        <span
          key={chip.chave}
          className="flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-xs text-sky-800"
        >
          {chip.rotulo}
          <button
            type="button"
            onClick={() => aoRemover(chip.chave)}
            aria-label={t('tarefas.removerFiltro')}
            className="text-sky-500 hover:text-sky-900"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}

      <Botao type="button" variante="fantasma" className="px-2 py-0.5 text-xs" onClick={aoLimpar}>
        {t('tarefas.limparFiltros')}
      </Botao>
    </div>
  );
}
