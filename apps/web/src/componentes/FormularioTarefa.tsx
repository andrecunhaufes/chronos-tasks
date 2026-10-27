import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { AreaTexto, Botao, Campo, Entrada, Selecao } from '@/componentes/ui';
import { tarefas, usuarios } from '@/servicos/recursos';
import { PRIORIDADES, Tarefa } from '@/servicos/tipos';

const esquema = z.object({
  titulo: z.string().trim().min(1, 'O título da tarefa é obrigatório').max(255),
  descricao: z
    .string()
    .trim()
    .max(2000, 'A descrição deve ter no máximo 2000 caracteres')
    .optional(),
  responsavel_id: z.string().uuid('Selecione um responsável'),
  prioridade: z.enum(['baixa', 'media', 'alta', 'urgente']),
  status: z.string().min(1),
  data_limite: z.string().optional(),
});

export type FormularioTarefaDados = z.infer<typeof esquema>;

export function FormularioTarefa({
  tarefa,
  aoSalvar,
  aoCancelar,
  salvando,
}: {
  tarefa?: Tarefa;
  aoSalvar: (dados: FormularioTarefaDados) => void;
  aoCancelar: (temAlteracaoPendente: boolean) => void;
  salvando: boolean;
}): JSX.Element {
  const { t } = useTranslation();

  const { data: listaUsuarios } = useQuery({
    queryKey: ['usuarios', 'ativos'],
    queryFn: () => usuarios.listar({ status: 'ativo', limit: 100 }),
  });

  const { data: colunas } = useQuery({ queryKey: ['colunas'], queryFn: tarefas.colunas });

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<FormularioTarefaDados>({
    resolver: zodResolver(esquema),
    defaultValues: {
      titulo: tarefa?.titulo ?? '',
      descricao: tarefa?.descricao ?? '',
      responsavel_id: tarefa?.responsavel_id ?? '',
      prioridade: tarefa?.prioridade ?? 'media',
      status: tarefa?.status ?? colunas?.[0]?.chave ?? '',
      data_limite: tarefa?.data_limite ? tarefa.data_limite.slice(0, 10) : '',
    },
  });

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit(aoSalvar)}>
      <Campo rotulo={t('tarefas.campoTitulo')} erro={errors.titulo?.message}>
        <Entrada maxLength={255} {...register('titulo')} />
      </Campo>

      <Campo rotulo={t('tarefas.descricao')} erro={errors.descricao?.message}>
        <AreaTexto maxLength={2000} {...register('descricao')} />
      </Campo>

      <Campo rotulo={t('tarefas.responsavel')} erro={errors.responsavel_id?.message}>
        <Selecao {...register('responsavel_id')}>
          <option value="">—</option>
          {listaUsuarios?.data.map((usuario) => (
            <option key={usuario.id} value={usuario.id}>
              {usuario.nome_completo}
            </option>
          ))}
        </Selecao>
      </Campo>

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo={t('tarefas.prioridade')} erro={errors.prioridade?.message}>
          <Selecao {...register('prioridade')}>
            {PRIORIDADES.map((prioridade) => (
              <option key={prioridade} value={prioridade}>
                {t(`prioridade.${prioridade}`)}
              </option>
            ))}
          </Selecao>
        </Campo>

        <Campo rotulo={t('tarefas.status')} erro={errors.status?.message}>
          <Selecao {...register('status')}>
            {colunas?.map((coluna) => (
              <option key={coluna.chave} value={coluna.chave}>
                {coluna.rotulo}
              </option>
            ))}
          </Selecao>
        </Campo>
      </div>

      <Campo rotulo={t('tarefas.dataLimite')} erro={errors.data_limite?.message}>
        <Entrada type="date" {...register('data_limite')} />
      </Campo>

      <div className="flex justify-end gap-2">
        <Botao type="button" variante="secundario" onClick={() => aoCancelar(isDirty)}>
          {t('app.cancelar')}
        </Botao>
        <Botao type="submit" disabled={salvando}>
          {t('app.salvar')}
        </Botao>
      </div>
    </form>
  );
}
