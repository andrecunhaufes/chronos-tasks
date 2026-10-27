import { check, sleep } from 'k6';
import http from 'k6/http';

// Teste de carga do stack_id 765. Volumes do ASSET 23577 (volumeAndOperationalExpectations):
// até 100 usuários por tenant e 10.000 tarefas por tenant.
// Metas de latência do ASSET 23752: listagem p95 <= 500ms, filtro combinado p95 <= 300ms.
//
//   k6 run -e BASE_URL=http://localhost:3000 -e EMAIL=... -e SENHA=... listagem-tarefas.js

const BASE = __ENV.BASE_URL || 'http://localhost:3000';
const EMAIL = __ENV.EMAIL || 'admin@carga.local';
const SENHA = __ENV.SENHA || 'Chronos@2026';

export const options = {
  scenarios: {
    leitura_sustentada: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 25 },
        { duration: '1m', target: 50 },
        { duration: '30s', target: 0 },
      ],
    },
  },
  thresholds: {
    'http_req_duration{operacao:listagem}': ['p(95)<500'],
    'http_req_duration{operacao:filtro}': ['p(95)<300'],
    'http_req_duration{operacao:kanban}': ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

export function setup() {
  const resposta = http.post(
    `${BASE}/api/auth/login`,
    JSON.stringify({ email: EMAIL, password: SENHA }),
    { headers: { 'Content-Type': 'application/json' } },
  );

  check(resposta, { 'login bem-sucedido': (r) => r.status === 200 });
  return { token: resposta.json('data.access_token') };
}

export default function (dados) {
  const cabecalhos = { headers: { Authorization: `Bearer ${dados.token}` } };

  const listagem = http.get(`${BASE}/api/tasks?limit=20`, {
    ...cabecalhos,
    tags: { operacao: 'listagem' },
  });
  check(listagem, { 'listagem responde 200': (r) => r.status === 200 });

  const filtro = http.get(`${BASE}/api/tasks?prioridade=urgente&apenas_atrasadas=true&limit=20`, {
    ...cabecalhos,
    tags: { operacao: 'filtro' },
  });
  check(filtro, { 'filtro responde 200': (r) => r.status === 200 });

  const kanban = http.get(`${BASE}/api/tasks/kanban/board`, {
    ...cabecalhos,
    tags: { operacao: 'kanban' },
  });
  check(kanban, { 'kanban responde 200': (r) => r.status === 200 });

  sleep(1);
}
