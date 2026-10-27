import axios, { AxiosError, AxiosInstance } from 'axios';

const CHAVE_ACCESS_TOKEN = 'chronos.access_token';
const CHAVE_REFRESH_TOKEN = 'chronos.refresh_token';

export type EnvelopeErro = {
  error: { code: string; message: string; details?: unknown };
  meta: { timestamp: string; request_id: string };
};

export type EnvelopeSucesso<T> = {
  data: T;
  meta: { timestamp: string; request_id: string; version: string };
};

export const sessao = {
  obterAccessToken: (): string | null => localStorage.getItem(CHAVE_ACCESS_TOKEN),
  obterRefreshToken: (): string | null => localStorage.getItem(CHAVE_REFRESH_TOKEN),
  gravar: (accessToken: string, refreshToken: string): void => {
    localStorage.setItem(CHAVE_ACCESS_TOKEN, accessToken);
    localStorage.setItem(CHAVE_REFRESH_TOKEN, refreshToken);
  },
  limpar: (): void => {
    localStorage.removeItem(CHAVE_ACCESS_TOKEN);
    localStorage.removeItem(CHAVE_REFRESH_TOKEN);
  },
};

export const api: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 30_000,
});

api.interceptors.request.use((configuracao) => {
  const token = sessao.obterAccessToken();
  if (token) configuracao.headers.Authorization = `Bearer ${token}`;
  return configuracao;
});

// Endpoints em que 401 é resposta de negócio (credenciais/token inválidos), não sessão
// expirada: tratá-los como expiração recarregaria a página e apagaria a mensagem de erro.
const ROTAS_SEM_RENOVACAO = ['/auth/login', '/auth/refresh', '/auth/password-recovery'];

let renovacaoEmAndamento: Promise<string> | null = null;

api.interceptors.response.use(
  (resposta) => resposta,
  async (erro: AxiosError<EnvelopeErro>) => {
    const requisicaoOriginal = erro.config as
      | (typeof erro.config & { _repetida?: boolean })
      | undefined;
    const codigo = erro.response?.data?.error?.code;

    if (erro.response?.status !== 401 || !requisicaoOriginal || requisicaoOriginal._repetida) {
      return Promise.reject(erro);
    }

    const caminho = requisicaoOriginal.url ?? '';
    if (ROTAS_SEM_RENOVACAO.some((rota) => caminho.startsWith(rota))) {
      return Promise.reject(erro);
    }

    if (codigo === 'USER_INACTIVE' || codigo === 'TENANT_INACTIVE') {
      sessao.limpar();
      window.location.assign('/login');
      return Promise.reject(erro);
    }

    const refreshToken = sessao.obterRefreshToken();
    if (!refreshToken) {
      sessao.limpar();
      window.location.assign('/login');
      return Promise.reject(erro);
    }

    try {
      renovacaoEmAndamento ??= renovarSessao(refreshToken);
      const novoAccessToken = await renovacaoEmAndamento;

      requisicaoOriginal._repetida = true;
      requisicaoOriginal.headers.Authorization = `Bearer ${novoAccessToken}`;
      return api.request(requisicaoOriginal);
    } catch (falha) {
      sessao.limpar();
      window.location.assign('/login');
      return Promise.reject(falha);
    } finally {
      renovacaoEmAndamento = null;
    }
  },
);

async function renovarSessao(refreshToken: string): Promise<string> {
  const resposta = await axios.post<
    EnvelopeSucesso<{ access_token: string; refresh_token: string }>
  >('/api/auth/refresh', { refresh_token: refreshToken });

  sessao.gravar(resposta.data.data.access_token, resposta.data.data.refresh_token);
  return resposta.data.data.access_token;
}

export function extrairMensagemErro(erro: unknown): string {
  if (axios.isAxiosError<EnvelopeErro>(erro) && erro.response?.data?.error) {
    return erro.response.data.error.message;
  }
  return 'Não foi possível concluir a operação. Tente novamente.';
}

export async function requisitar<T>(
  executar: () => Promise<{ data: EnvelopeSucesso<T> }>,
): Promise<T> {
  const resposta = await executar();
  return resposta.data.data;
}
