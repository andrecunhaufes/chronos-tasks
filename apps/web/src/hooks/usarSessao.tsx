import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ReactNode, createContext, useContext } from 'react';
import { autenticacao } from '@/servicos/recursos';
import { sessao } from '@/servicos/api';
import { Perfil, UsuarioAutenticado } from '@/servicos/tipos';

type ContextoSessao = {
  usuario: UsuarioAutenticado | null;
  carregando: boolean;
  autenticado: boolean;
  temPerfil: (...perfis: Perfil[]) => boolean;
  encerrar: () => Promise<void>;
};

const Contexto = createContext<ContextoSessao | null>(null);

export function ProvedorSessao({ children }: { children: ReactNode }): JSX.Element {
  const clienteQuery = useQueryClient();

  // A query fica sempre habilitada e checa o token dentro do queryFn: com `enabled`
  // derivado do localStorage, invalidar após o login não refaria a busca — o provedor
  // não re-renderiza quando o localStorage muda, e a sessão nunca era carregada.
  const { data: usuario = null, isLoading } = useQuery({
    queryKey: ['sessao'],
    queryFn: async () => {
      if (sessao.obterAccessToken() === null) return null;
      return autenticacao.usuarioAtual();
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const valor: ContextoSessao = {
    usuario,
    carregando: isLoading,
    autenticado: usuario !== null,
    temPerfil: (...perfis) => (usuario ? perfis.includes(usuario.perfil) : false),
    encerrar: async () => {
      await autenticacao.sair();
      clienteQuery.clear();
      window.location.assign('/login');
    },
  };

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function usarSessao(): ContextoSessao {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error('usarSessao deve ser usado dentro de ProvedorSessao');
  return contexto;
}
