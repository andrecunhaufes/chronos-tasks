// Exports do ASSET 23659 (Utilitários de Cálculo Temporal), também listados no ASSET 23639.

export function isDateOverdue(targetDate: Date, referenceDate: Date = new Date()): boolean {
  return inicioDoDiaUtc(targetDate) < inicioDoDiaUtc(referenceDate);
}

export function formatDateForDisplay(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'short' }).format(date);
}

export function calculateSessionExpirationTime(sessionDurationMinutes: number): Date {
  return new Date(Date.now() + sessionDurationMinutes * 60 * 1000);
}

export function isSessionExpired(expirationTime: Date, currentTime: Date = new Date()): boolean {
  return expirationTime.getTime() < currentTime.getTime();
}

function inicioDoDiaUtc(data: Date): number {
  return Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate());
}
