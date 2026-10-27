import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Botao, Entrada, Selecao } from '@/componentes/ui';
import { FiltrosTarefa, tarefas, usuarios } from '@/servicos/recursos';
import { PRIORIDADES } from '@/servicos/tipos';

export function PainelFiltros({
  filtros,
  aoAlterar,
}: {
  filtros: FiltrosTarefa;
  aoAlterar: (filtros: FiltrosTarefa) => void;
}): JSX.Element {
  const { t } = useTranslation();

  const { data: listaUsuarios } = useQuery({
    queryKey: ['usuarios', 'ativos'],
    queryFn: () => usuarios.listar({ status: 'ativo', limit: 100 }),
  });

  const { data: colunas } = useQuery({ queryKey: ['colunas'], queryFn: tarefas.colunas });

  const alterar = (parcial: Partial<FiltrosTarefa>): void =>
    aoAlterar({ ...filtros, ...parcial, cursor: undefined });

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-slate-400" />
        <Entrada
          placeholder={t('tarefas.pesquisar')}
          maxLength={255}
          value={filtros.pesquisa ?? ''}
          onChange={(evento) => alterar({ pesquisa: evento.target.value || undefined })}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Selecao
          aria-label={t('tarefas.status')}
          value={filtros.status ?? ''}
          onChange={(evento) =>
            alterar({ status: (evento.target.value || undefined) as FiltrosTarefa['status'] })
          }
        >
          <option value="">{t('tarefas.status')}</option>
          {colunas?.map((coluna) => (
            <option key={coluna.chave} value={coluna.chave}>
              {coluna.rotulo}
            </option>
          ))}
        </Selecao>

        <Selecao
          aria-label={t('tarefas.responsavel')}
          value={filtros.responsavel_id ?? ''}
          onChange={(evento) => alterar({ responsavel_id: evento.target.value || undefined })}
        >
          <option value="">{t('tarefas.responsavel')}</option>
          {listaUsuarios?.data.map((usuario) => (
            <option key={usuario.id} value={usuario.id}>
              {usuario.nome_completo}
            </option>
          ))}
        </Selecao>

        <Selecao
          aria-label={t('tarefas.prioridade')}
          value={filtros.prioridade ?? ''}
          onChange={(evento) =>
            alterar({
              prioridade: (evento.target.value || undefined) as FiltrosTarefa['prioridade'],
            })
          }
        >
          <option value="">{t('tarefas.prioridade')}</option>
          {PRIORIDADES.map((prioridade) => (
            <option key={prioridade} value={prioridade}>
              {t(`prioridade.${prioridade}`)}
            </option>
          ))}
        </Selecao>

        <div className="flex gap-2">
          <Entrada
            type="date"
            aria-label={t('tarefas.dataLimite')}
            value={filtros.data_limite_inicio ?? ''}
            onChange={(evento) => alterar({ data_limite_inicio: evento.target.value || undefined })}
          />
          <Entrada
            type="date"
            aria-label={t('tarefas.dataLimite')}
            value={filtros.data_limite_fim ?? ''}
            onChange={(evento) => alterar({ data_limite_fim: evento.target.value || undefined })}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={filtros.apenas_atrasadas ?? false}
            onChange={(evento) => alterar({ apenas_atrasadas: evento.target.checked || undefined })}
          />
          {t('tarefas.apenasAtrasadas')}
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={filtros.apenas_criticas ?? false}
            onChange={(evento) => alterar({ apenas_criticas: evento.target.checked || undefined })}
          />
          {t('tarefas.apenasCriticas')}
        </label>

        <Botao type="button" variante="fantasma" onClick={() => aoAlterar({})}>
          {t('tarefas.limparFiltros')}
        </Botao>
      </div>
    </section>
  );
}
