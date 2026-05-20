"use client";

import { ApiError, login } from "@/lib/api-client";
import { clearSession, loadSession, saveSession } from "@/lib/session-storage";
import type {
  AuthSession,
  CrudOperation,
  DashboardSection,
  FeedbackMessage,
} from "@/lib/types";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AdministradoresPanel } from "./administradores-panel";
import { QuadrasPanel } from "./quadras-panel";
import { ReservasPanel } from "./reservas-panel";
import { UsuariosPanel } from "./usuarios-panel";

const SECTION_LABELS: Record<DashboardSection, string> = {
  administradores: "Administradores",
  usuarios: "Usuários",
  quadras: "Quadras",
  reservas: "Reservas",
};

const OPERATION_LABELS: Record<CrudOperation, string> = {
  visualizar: "Ver",
  cadastrar: "Cadastrar",
  editar: "Alterar",
  apagar: "Apagar",
};

interface LoginFormState {
  email: string;
  senha: string;
}

const EMPTY_LOGIN_FORM: LoginFormState = {
  email: "",
  senha: "",
};

function getLoginErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  return "Não foi possível autenticar. Verifique seu backend e tente novamente.";
}

export function DashboardApp() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [ready, setReady] = useState(false);
  const [selectedSection, setSelectedSection] =
    useState<DashboardSection>("administradores");
  const [operation, setOperation] = useState<CrudOperation>("visualizar");
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);
  const [loginForm, setLoginForm] = useState<LoginFormState>(EMPTY_LOGIN_FORM);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  function hydrateSessionFromStorage() {
    const storedSession = loadSession();

    if (storedSession) {
      setSession(storedSession);
    }

    setReady(true);
  }

  useEffect(() => {
    hydrateSessionFromStorage();
  }, []);

  useEffect(() => {
    if (!feedback) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setFeedback(null);
    }, 4500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [feedback]);

  const sectionTitle = useMemo(
    () => SECTION_LABELS[selectedSection],
    [selectedSection],
  );

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!loginForm.email || !loginForm.senha) {
      setLoginError("Preencha email e senha para entrar.");
      return;
    }

    setLoginLoading(true);
    setLoginError("");

    try {
      const authenticatedSession = await login(loginForm);
      saveSession(authenticatedSession);
      setSession(authenticatedSession);
      setFeedback({ type: "success", text: "Login realizado com sucesso." });
      setLoginForm(EMPTY_LOGIN_FORM);
    } catch (requestError) {
      setLoginError(getLoginErrorMessage(requestError));
    } finally {
      setLoginLoading(false);
    }
  }

  function handleLogout() {
    clearSession();
    setSession(null);
    setSelectedSection("administradores");
    setOperation("visualizar");
    setFeedback({ type: "info", text: "Sessão encerrada." });
  }

  function handleUnauthorized() {
    clearSession();
    setSession(null);
    setFeedback({
      type: "error",
      text: "Sua sessão expirou. Faça login novamente para continuar.",
    });
  }

  function renderPanel() {
    if (!session) {
      return null;
    }

    const props = {
      operation,
      session,
      onFeedback: setFeedback,
      onUnauthorized: handleUnauthorized,
    };

    switch (selectedSection) {
      case "administradores":
        return (
          <AdministradoresPanel
            key={`${selectedSection}-${operation}`}
            {...props}
          />
        );
      case "usuarios":
        return <UsuariosPanel key={`${selectedSection}-${operation}`} {...props} />;
      case "quadras":
        return <QuadrasPanel key={`${selectedSection}-${operation}`} {...props} />;
      case "reservas":
        return <ReservasPanel key={`${selectedSection}-${operation}`} {...props} />;
      default:
        return null;
    }
  }

  if (!ready) {
    return (
      <main className="app-shell loading-shell">
        <p>Carregando painel administrativo...</p>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="auth-shell">
        <section className="auth-card">
          <header className="auth-card__header">
            <p className="eyebrow">Sistema Integrador</p>
            <h1>Dashboard Administrativa</h1>
            <p>
              Entre com seu usuário para gerenciar administradores, usuários, quadras e reservas.
            </p>
          </header>

          {loginError ? <p className="panel__error">{loginError}</p> : null}

          <form className="form-grid" onSubmit={handleLogin}>
            <label>
              Email
              <input
                autoComplete="email"
                type="email"
                value={loginForm.email}
                onChange={(event) =>
                  setLoginForm((current) => ({ ...current, email: event.target.value }))
                }
                required
              />
            </label>
            <label>
              Senha
              <input
                autoComplete="current-password"
                type="password"
                value={loginForm.senha}
                onChange={(event) =>
                  setLoginForm((current) => ({ ...current, senha: event.target.value }))
                }
                required
              />
            </label>

            <button className="button" disabled={loginLoading} type="submit">
              {loginLoading ? "Entrando..." : "Entrar"}
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">Controle</p>
          <h1>Admin Hub</h1>
          <p className="sidebar__description">
            Tudo em uma dashboard: escolha o módulo e depois a operação.
          </p>
        </div>

        <nav className="menu" aria-label="Módulos administrativos">
          {(Object.keys(SECTION_LABELS) as DashboardSection[]).map((section) => (
            <button
              key={section}
              className={`menu__item ${selectedSection === section ? "is-active" : ""}`}
              onClick={() => {
                setSelectedSection(section);
                setFeedback(null);
              }}
              type="button"
            >
              {SECTION_LABELS[section]}
            </button>
          ))}
        </nav>

        <div className="sidebar__user">
          <p>{session.usuario.email}</p>
          <small>ID administrador: {session.usuario.idAdministrador ?? "não vinculado"}</small>
          <button type="button" className="button button--ghost" onClick={handleLogout}>
            Sair
          </button>
        </div>
      </aside>

      <section className="workspace">
        <header className="workspace__header">
          <div>
            <p className="eyebrow">Módulo ativo</p>
            <h2>{sectionTitle}</h2>
          </div>

          <div className="operations" role="tablist" aria-label="Operações">
            {(Object.keys(OPERATION_LABELS) as CrudOperation[]).map((item) => (
              <button
                key={item}
                className={`operations__item ${operation === item ? "is-active" : ""}`}
                onClick={() => {
                  setOperation(item);
                  setFeedback(null);
                }}
                role="tab"
                type="button"
              >
                {OPERATION_LABELS[item]}
              </button>
            ))}
          </div>
        </header>

        {feedback ? (
          <p className={`feedback feedback--${feedback.type}`} role="status">
            {feedback.text}
          </p>
        ) : null}

        {renderPanel()}
      </section>
    </main>
  );
}
