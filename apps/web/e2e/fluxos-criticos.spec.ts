import { expect, request, test } from '@playwright/test';
import type { Page } from '@playwright/test';

// Fluxos críticos definidos pelo stack_id 753: login, criação de tarefa e movimentação no Kanban.
const EMAIL = 'e2e@chronos.local';
const SENHA = 'Chronos@2026';

async function entrar(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('E-mail').fill(EMAIL);
  await page.getByLabel('Senha', { exact: true }).fill(SENHA);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/tasks/);
}

const PREFIXO = 'Tarefa E2E';

function titulo(sufixo: string): string {
  return `${PREFIXO} ${sufixo} ${Date.now()}`;
}

// Sem isto o tenant de teste acumula uma tarefa por execução, indefinidamente.
test.afterAll(async ({ baseURL }) => {
  const api = await request.newContext({ baseURL: baseURL ?? 'http://localhost:5173' });

  try {
    const login = await api.post('/api/auth/login', { data: { email: EMAIL, password: SENHA } });
    if (!login.ok()) return;

    const token = (await login.json()).data.access_token;
    const cabecalhos = { Authorization: `Bearer ${token}` };

    const listagem = await api.get('/api/tasks?limit=100', { headers: cabecalhos });
    if (!listagem.ok()) return;

    const criadasPeloTeste = (await listagem.json()).data.data.filter(
      (tarefa: { titulo: string }) => tarefa.titulo.startsWith(PREFIXO),
    );

    for (const tarefa of criadasPeloTeste) {
      await api.delete(`/api/tasks/${tarefa.id}`, { headers: cabecalhos });
    }
  } finally {
    await api.dispose();
  }
});

// O painel de filtros repete rótulos do formulário; os seletores ficam escopados ao modal.
function formulario(page: Page) {
  return page.locator('form').filter({ has: page.getByLabel('Título') });
}

async function criarTarefa(page: Page, nome: string, prioridade?: string): Promise<void> {
  await page.getByRole('button', { name: 'Nova tarefa' }).click();
  const modal = formulario(page);
  await modal.getByLabel('Título').fill(nome);
  await modal.getByLabel('Responsável').selectOption({ label: 'Administradora E2E' });
  if (prioridade) await modal.getByLabel('Prioridade').selectOption(prioridade);
  await modal.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByRole('status')).toBeVisible();
}

test.describe('Autenticação (feature 23592)', () => {
  test('rejeita credenciais inválidas sem revelar qual campo falhou', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('E-mail').fill(EMAIL);
    await page.getByLabel('Senha', { exact: true }).fill('Errada@123');
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page.getByRole('alert')).toContainText('Credenciais inválidas');
    await expect(page).toHaveURL(/\/login/);
  });

  test('alterna a visibilidade da senha', async ({ page }) => {
    await page.goto('/login');
    const campo = page.getByLabel('Senha', { exact: true });
    await campo.fill(SENHA);

    await expect(campo).toHaveAttribute('type', 'password');
    await page.getByRole('button', { name: 'Mostrar senha' }).click();
    await expect(campo).toHaveAttribute('type', 'text');
    await page.getByRole('button', { name: 'Ocultar senha' }).click();
    await expect(campo).toHaveAttribute('type', 'password');
  });

  test('autentica e mantém a sessão ao recarregar', async ({ page }) => {
    await entrar(page);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Tarefas' })).toBeVisible();
  });

  test('bloqueia rota protegida sem sessão', async ({ page }) => {
    await page.goto('/tasks');
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('Criação de tarefa (feature 23606)', () => {
  test('cria uma tarefa e ela aparece na lista', async ({ page }) => {
    await entrar(page);
    const nome = titulo('criada');

    await criarTarefa(page, nome, 'urgente');

    await expect(page.getByRole('status')).toContainText('Tarefa criada com sucesso');
    await expect(page.getByRole('cell', { name: nome })).toBeVisible();
  });

  test('recusa título vazio com mensagem no campo', async ({ page }) => {
    await entrar(page);

    await page.getByRole('button', { name: 'Nova tarefa' }).click();
    const modal = formulario(page);
    await modal.getByLabel('Responsável').selectOption({ label: 'Administradora E2E' });
    await modal.getByRole('button', { name: 'Salvar' }).click();

    await expect(page.getByText('O título da tarefa é obrigatório')).toBeVisible();
  });

  test('marca prioridade urgente como crítica na lista', async ({ page }) => {
    await entrar(page);
    const nome = titulo('critica');

    await criarTarefa(page, nome, 'urgente');

    const linha = page.getByRole('row').filter({ hasText: nome });
    await expect(linha.getByText('Crítica')).toBeVisible();
  });
});

test.describe('Quadro Kanban (feature 23628)', () => {
  test('exibe as três colunas fixas do sistema', async ({ page }) => {
    await entrar(page);
    await page.getByRole('button', { name: 'Kanban' }).click();

    for (const coluna of ['A Fazer', 'Em Andamento', 'Concluído']) {
      await expect(page.getByRole('heading', { name: coluna, exact: true })).toBeVisible();
    }
  });

  test('move o cartão entre colunas por drag and drop', async ({ page }) => {
    await entrar(page);
    const nome = titulo('kanban');

    await criarTarefa(page, nome);
    await page.getByRole('button', { name: 'Kanban' }).click();

    const cartao = page.locator('article').filter({ hasText: nome });
    const destino = page.getByRole('region', { name: 'Em Andamento' });

    await expect(cartao).toBeVisible();

    // `dragTo` move o mouse, mas o Chromium não converte isso em eventos HTML5 de arrasto.
    // As fases são disparadas separadamente: o React precisa processar o estado de
    // `dragstart` antes de a coluna aceitar o `drop`.
    const xpathCartao = `//article[contains(., ${JSON.stringify(nome)})]`;
    const xpathDestino = "//section[@aria-label='Em Andamento']";

    await page.evaluate((seletor) => {
      const origem = document.evaluate(seletor, document, null, 9, null).singleNodeValue as HTMLElement;
      const dados = new DataTransfer();
      (window as unknown as { __dt: DataTransfer }).__dt = dados;
      origem.dispatchEvent(new DragEvent('dragstart', { dataTransfer: dados, bubbles: true }));
    }, xpathCartao);

    await page.waitForTimeout(300);

    await page.evaluate((seletor) => {
      const alvo = document.evaluate(seletor, document, null, 9, null).singleNodeValue as HTMLElement;
      const dados = (window as unknown as { __dt: DataTransfer }).__dt;
      alvo.dispatchEvent(new DragEvent('dragover', { dataTransfer: dados, bubbles: true, cancelable: true }));
      alvo.dispatchEvent(new DragEvent('drop', { dataTransfer: dados, bubbles: true, cancelable: true }));
    }, xpathDestino);

    await expect(destino.filter({ hasText: nome })).toBeVisible();
    await expect(page.getByRole('region', { name: 'A Fazer' }).filter({ hasText: nome })).toHaveCount(0);
  });

  test('conclui a tarefa pelo cartão, com confirmação', async ({ page }) => {
    await entrar(page);
    const nome = titulo('concluir');

    await criarTarefa(page, nome);
    await page.getByRole('button', { name: 'Kanban' }).click();
    const cartao = page.locator('article').filter({ hasText: nome });
    await cartao.getByRole('button', { name: 'Concluir' }).click();

    await expect(page.getByText(`Concluir a tarefa "${nome}"?`)).toBeVisible();
    await page.getByRole('button', { name: 'Concluir', exact: true }).last().click();

    await expect(page.getByRole('region', { name: 'Concluído' }).filter({ hasText: nome })).toBeVisible();
  });
});

test.describe('Filtros e ordenação (features 23625 e 23631)', () => {
  test('filtra por prioridade e mostra o filtro ativo removível', async ({ page }) => {
    await entrar(page);

    await page.getByLabel('Prioridade', { exact: true }).selectOption('urgente');
    await expect(page.getByText('Filtros ativos')).toBeVisible();

    await page.getByRole('button', { name: 'Remover filtro' }).first().click();
    await expect(page.getByText('Filtros ativos')).toHaveCount(0);
  });

  test('ordena a lista pela coluna Título', async ({ page }) => {
    await entrar(page);
    await criarTarefa(page, titulo('ordenacao'));

    const cabecalho = page.getByRole('button', { name: /Ordenar por Título/ });
    await cabecalho.click();
    await expect(page.getByRole('columnheader').first()).toHaveAttribute('aria-sort', /ascending|descending/);
  });
});
