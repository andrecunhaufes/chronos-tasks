import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { Aviso, AvisoSucesso, Botao, Campo, Confirmacao, Entrada, Modal } from '@/componentes/ui';
import { extrairMensagemErro } from '@/servicos/api';
import { niveis } from '@/servicos/recursos';
import { NivelHierarquico } from '@/servicos/tipos';

const esquema = z.object({
  nome: z.string().trim().min(1, 'O nome do nível é obrigatório').max(120),
  profundidade: z.coerce.number().int().min(1, 'A profundidade deve ser maior ou igual a 1'),
});

type Formulario = z.infer<typeof esquema>;

export function PaginaNiveis(): JSX.Element {
  const { t } = useTranslation();
  const clienteQuery = useQueryClient();

  const [emEdicao, definirEmEdicao] = useState<NivelHierarquico | null>(null);
  const [modalAberto, definirModalAberto] = useState(false);
  const [aExcluir, definirAExcluir] = useState<NivelHierarquico | null>(null);
  const [erro, definirErro] = useState<string | null>(null);
  const [sucesso, definirSucesso] = useState<string | null>(null);

  const { data: lista } = useQuery({ queryKey: ['niveis'], queryFn: niveis.listar });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Formulario>({
    resolver: zodResolver(esquema),
    values: emEdicao ? { nome: emEdicao.nome, profundidade: emEdicao.profundidade } : undefined,
  });

  const invalidar = async (): Promise<void> => {
    await clienteQuery.invalidateQueries({ queryKey: ['niveis'] });
  };

  const fechar = (): void => {
    definirModalAberto(false);
    definirEmEdicao(null);
    reset({ nome: '', profundidade: 1 });
  };

  const salvar = useMutation({
    mutationFn: (dados: Formulario) =>
      emEdicao ? niveis.atualizar(emEdicao.id, dados) : niveis.criar(dados),
    onSuccess: async () => {
      definirSucesso(emEdicao ? t('niveis.nivelAtualizado') : t('niveis.nivelCriado'));
      definirErro(null);
      fechar();
      await invalidar();
    },
    onError: (falha) => definirErro(extrairMensagemErro(falha)),
  });

  const excluir = useMutation({
    mutationFn: (id: string) => niveis.excluir(id),
    onSuccess: async () => {
      definirSucesso(t('niveis.nivelExcluido'));
      definirErro(null);
      await invalidar();
    },
    onError: (falha) => definirErro(extrairMensagemErro(falha)),
  });

  // Troca a profundidade entre dois níveis vizinhos para reordenar a estrutura.
  const reordenar = useMutation({
    mutationFn: async ({
      atual,
      vizinho,
    }: {
      atual: NivelHierarquico;
      vizinho: NivelHierarquico;
    }) => {
      await niveis.atualizar(atual.id, { profundidade: vizinho.profundidade });
      await niveis.atualizar(vizinho.id, { profundidade: atual.profundidade });
    },
    onSuccess: async () => {
      definirSucesso(t('niveis.ordemAtualizada'));
      definirErro(null);
      await invalidar();
    },
    onError: (falha) => definirErro(extrairMensagemErro(falha)),
  });

  const ordenados = lista ?? [];

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900">{t('niveis.titulo')}</h1>
        <Botao
          onClick={() => {
            definirEmEdicao(null);
            reset({ nome: '', profundidade: (ordenados.at(-1)?.profundidade ?? 0) + 1 });
            definirModalAberto(true);
          }}
        >
          <Plus className="h-4 w-4" />
          {t('niveis.novoNivel')}
        </Botao>
      </header>

      {erro ? <Aviso mensagem={erro} /> : null}
      {sucesso ? <AvisoSucesso mensagem={sucesso} /> : null}

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">{t('niveis.nome')}</th>
              <th className="px-4 py-3">{t('niveis.profundidade')}</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {ordenados.map((nivel, indice) => (
              <tr key={nivel.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3 text-slate-800">{nivel.nome}</td>
                <td className="px-4 py-3 text-slate-600">{nivel.profundidade}</td>
                <td className="flex justify-end gap-2 px-4 py-3">
                  <Botao
                    variante="secundario"
                    aria-label={t('niveis.subir')}
                    disabled={indice === 0}
                    onClick={() =>
                      reordenar.mutate({ atual: nivel, vizinho: ordenados[indice - 1] })
                    }
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Botao>

                  <Botao
                    variante="secundario"
                    aria-label={t('niveis.descer')}
                    disabled={indice === ordenados.length - 1}
                    onClick={() =>
                      reordenar.mutate({ atual: nivel, vizinho: ordenados[indice + 1] })
                    }
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Botao>

                  <Botao
                    variante="secundario"
                    aria-label={t('app.editar')}
                    onClick={() => {
                      definirEmEdicao(nivel);
                      definirModalAberto(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Botao>

                  <Botao
                    variante="perigo"
                    aria-label={t('app.excluir')}
                    onClick={() => definirAExcluir(nivel)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Botao>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {ordenados.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">{t('app.nenhumResultado')}</p>
        ) : null}
      </div>

      <Modal
        aberto={modalAberto}
        titulo={emEdicao ? t('niveis.editarNivel') : t('niveis.novoNivel')}
        aoFechar={fechar}
      >
        <form
          className="flex flex-col gap-4"
          onSubmit={handleSubmit((dados) => salvar.mutate(dados))}
        >
          <Campo rotulo={t('niveis.nome')} erro={errors.nome?.message}>
            <Entrada maxLength={120} {...register('nome')} />
          </Campo>

          <Campo rotulo={t('niveis.profundidade')} erro={errors.profundidade?.message}>
            <Entrada type="number" min={1} {...register('profundidade')} />
          </Campo>

          <div className="flex justify-end gap-2">
            <Botao type="button" variante="secundario" onClick={fechar}>
              {t('app.cancelar')}
            </Botao>
            <Botao type="submit" disabled={salvar.isPending}>
              {t('app.salvar')}
            </Botao>
          </div>
        </form>
      </Modal>

      <Confirmacao
        aberto={aExcluir !== null}
        titulo={t('app.excluir')}
        mensagem={t('niveis.confirmarExclusao')}
        rotuloConfirmar={t('app.excluir')}
        rotuloCancelar={t('app.cancelar')}
        aoConfirmar={() => {
          if (aExcluir) excluir.mutate(aExcluir.id);
          definirAExcluir(null);
        }}
        aoCancelar={() => definirAExcluir(null)}
      />
    </div>
  );
}
