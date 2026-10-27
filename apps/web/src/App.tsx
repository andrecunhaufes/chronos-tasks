import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { GuardaAutenticado, GuardaPerfil, GuardaPublica } from '@/componentes/Guardas';
import { ProvedorSessao } from '@/hooks/usarSessao';
import { AppShell } from '@/layouts/AppShell';
import { LayoutAutenticacao } from '@/layouts/LayoutAutenticacao';
import { PaginaDetalheTarefa } from '@/paginas/PaginaDetalheTarefa';
import { PaginaDetalheTenant } from '@/paginas/PaginaDetalheTenant';
import { PaginaLogin } from '@/paginas/PaginaLogin';
import { PaginaNiveis } from '@/paginas/PaginaNiveis';
import { PaginaPerfilUsuario } from '@/paginas/PaginaPerfilUsuario';
import { PaginaRecuperacaoSenha } from '@/paginas/PaginaRecuperacaoSenha';
import { PaginaRedefinirSenha } from '@/paginas/PaginaRedefinirSenha';
import { PaginaTarefas } from '@/paginas/PaginaTarefas';
import { PaginaTenants } from '@/paginas/PaginaTenants';
import { PaginaUsuarios } from '@/paginas/PaginaUsuarios';

const clienteQuery = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 },
  },
});

export function App(): JSX.Element {
  return (
    <QueryClientProvider client={clienteQuery}>
      <BrowserRouter>
        <ProvedorSessao>
          <Routes>
            <Route element={<GuardaPublica />}>
              <Route element={<LayoutAutenticacao />}>
                <Route path="/login" element={<PaginaLogin />} />
                <Route path="/password-recovery" element={<PaginaRecuperacaoSenha />} />
                <Route path="/password-recovery/reset/:token" element={<PaginaRedefinirSenha />} />
                <Route path="/redefinir-senha" element={<PaginaRedefinirSenha />} />
              </Route>
            </Route>

            <Route element={<GuardaAutenticado />}>
              <Route element={<AppShell />}>
                <Route path="/" element={<Navigate to="/tasks" replace />} />
                <Route path="/tasks" element={<PaginaTarefas />} />
                <Route path="/tasks/:id" element={<PaginaDetalheTarefa />} />
                <Route path="/profile" element={<PaginaPerfilUsuario />} />

                <Route element={<GuardaPerfil perfis={['gestor', 'administrador_tenant']} />}>
                  <Route path="/users" element={<PaginaUsuarios />} />
                  <Route path="/users/:id" element={<PaginaPerfilUsuario />} />
                </Route>

                <Route element={<GuardaPerfil perfis={['administrador_tenant']} />}>
                  <Route path="/hierarchy-levels" element={<PaginaNiveis />} />
                </Route>

                <Route element={<GuardaPerfil perfis={['administrador_plataforma']} />}>
                  <Route path="/tenants" element={<PaginaTenants />} />
                  <Route path="/tenants/:id" element={<PaginaDetalheTenant />} />
                </Route>
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/tasks" replace />} />
          </Routes>
        </ProvedorSessao>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
