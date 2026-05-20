import type { AuthSession } from "@/lib/types";

const SESSION_KEY = "admin-dashboard-session";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function isValidSession(value: unknown): value is AuthSession {
  if (!value || typeof value !== "object") {
    return false;
  }

  const session = value as Partial<AuthSession>;

  return (
    typeof session.accessToken === "string" &&
    session.tokenType === "Bearer" &&
    typeof session.expiresIn === "string" &&
    !!session.usuario &&
    typeof session.usuario.id === "string" &&
    typeof session.usuario.email === "string" &&
    Array.isArray(session.usuario.permissoes)
  );
}

export function saveSession(session: AuthSession): void {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function loadSession(): AuthSession | null {
  if (!isBrowser()) {
    return null;
  }

  const raw = window.localStorage.getItem(SESSION_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    return isValidSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.removeItem(SESSION_KEY);
}
