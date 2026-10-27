// Exports do ASSET 23639 (Toolkit de Suporte Técnico) que normalizam ou validam texto.

const PADRAO_EMAIL = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const PADRAO_SLUG = /^[a-z0-9-]{3,50}$/;

const TAMANHO_MAXIMO_TITULO = 255;
const TAMANHO_MAXIMO_NIVEL = 120;

export function validateEmail(email: string): boolean {
  return PADRAO_EMAIL.test(email.trim());
}

export function validateTenantSlug(slug: string): boolean {
  return PADRAO_SLUG.test(slug);
}

export function generateTenantSlug(organizationName: string): string {
  return organizationName
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

export function sanitizeTaskTitle(title: string, maxLength = TAMANHO_MAXIMO_TITULO): string {
  return colapsarEspacos(title).slice(0, maxLength);
}

export function normalizeHierarchyLevelName(
  name: string,
  maxLength = TAMANHO_MAXIMO_NIVEL,
): string {
  return colapsarEspacos(name).slice(0, maxLength);
}

// Um ponto por classe de caractere presente e um por atingir o comprimento mínimo.
export function calculatePasswordComplexityScore(password: string): number {
  const criterios = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];

  return criterios.filter(Boolean).length;
}

export function validatePasswordComplexity(password: string, minimumScore = 5): boolean {
  return calculatePasswordComplexityScore(password) >= minimumScore;
}

function colapsarEspacos(valor: string): string {
  return valor.trim().replace(/\s+/g, ' ');
}
