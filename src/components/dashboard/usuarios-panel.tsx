"use client";

import {
  ApiError,
  createUsuario,
  deleteUsuario,
  fetchUsuarios,
  type CreateUsuarioInput,
  updateUsuario,
} from "@/lib/api-client";
import { splitByComma } from "@/lib/formatters";
import type { Usuario } from "@/lib/types";
import { useEffect, useState, type FormEvent } from "react";
import type { DashboardPanelProps } from "./panel-props";

interface UsuarioFormState {
  email: string;
  password: string;
  permissions: string;
  jogadorId: string;
  administradorId: string;
}

const EMPTY_FORM: UsuarioFormState = {
  email: "",
  password: "",
  permissions: "",
  jogadorId: "",
  administradorId: "",
};

function getErrorMessage(
  error: unknown,
  onUnauthorized: () => void,
  fallback: string,
): string {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      onUnauthorized();
      return "Sua sessão expirou. Faça login novamente.";
    }

    return error.message;
  }

  return fallback;
}

function toPayload(form: UsuarioFormState): CreateUsuarioInput {
  const permissions = splitByComma(form.permissions);

  return {
    email: form.email.trim(),
    password: form.password,
    permissions,
    jogadorId: form.jogadorId ? Number(form.jogadorId) : undefined,
    administradorId: form.administradorId ? Number(form.administradorId) : undefined,
  };
}

export function UsuariosPanel({
  operation,
  session,
  onFeedback,
  onUnauthorized,
}: DashboardPanelProps) {
  const [items, setItems] = useState<Usuario[]>([]);
  const [form, setForm] = useState<UsuarioFormState>(EMPTY_FORM);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function syncFormFromSelectedItem(item: Usuario) {
    setForm({
      email: item.email,
      password: "",
      permissions: item.permissions.join(", "),
      jogadorId: item.jogadorId ?? "",
      administradorId: item.administradorId ?? "",
    });
  }

  async function loadItems() {
    setLoading(true);
    setError("");

    try {
      const data = await fetchUsuarios(session.accessToken);
      setItems(data);

      let nextSelectedId = selectedId;

      if (data.length === 0) {
        nextSelectedId = "";
      } else if (!data.some((item) => item.id === selectedId)) {
        nextSelectedId = data[0].id;
      }

      setSelectedId(nextSelectedId);

      if (operation === "editar") {
        const selected = data.find((item) => item.id === nextSelectedId);

        if (selected) {
          syncFormFromSelectedItem(selected);
        }
      }
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          onUnauthorized,
          "Não foi possível carregar os usuários.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (operation === "cadastrar") {
      return;
    }

    void loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [operation, session.accessToken]);

  function updateField(field: keyof UsuarioFormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.email || !form.password) {
      onFeedback({
        type: "error",
        text: "Email e senha são obrigatórios para cadastrar usuário.",
      });
      return;
    }

    setLoading(true);
    setError("");

    try {
      await createUsuario(session.accessToken, toPayload(form));
      setForm(EMPTY_FORM);
      onFeedback({ type: "success", text: "Usuário cadastrado com sucesso." });
    } catch (requestError) {
      setError(getErrorMessage(requestError, onUnauthorized, "Falha ao criar usuário."));
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedId) {
      onFeedback({
        type: "error",
        text: "Selecione um usuário para atualizar.",
      });
      return;
    }

    setLoading(true);
    setError("");

    try {
      const payload = toPayload(form);

      await updateUsuario(session.accessToken, selectedId, {
        ...payload,
        password: payload.password || undefined,
      });

      onFeedback({ type: "success", text: "Usuário atualizado com sucesso." });
      await loadItems();
    } catch (requestError) {
      setError(
        getErrorMessage(requestError, onUnauthorized, "Falha ao atualizar usuário."),
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm("Deseja realmente apagar este usuário?");

    if (!confirmed) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      await deleteUsuario(session.accessToken, id);
      onFeedback({ type: "success", text: "Usuário removido com sucesso." });
      await loadItems();
    } catch (requestError) {
      setError(getErrorMessage(requestError, onUnauthorized, "Falha ao remover usuário."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel">
      <header className="panel__header">
        <h2>Usuários</h2>
        {operation !== "cadastrar" ? (
          <button type="button" className="button button--ghost" onClick={() => void loadItems()}>
            Recarregar
          </button>
        ) : null}
      </header>

      {error ? <p className="panel__error">{error}</p> : null}

      {operation === "visualizar" ? (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Email</th>
                <th>Permissões</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && !loading ? (
                <tr>
                  <td colSpan={3} className="table__empty">
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.id}</td>
                    <td>{item.email}</td>
                    <td>{item.permissions.join(", ") || "Sem permissões"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : null}

      {operation === "cadastrar" ? (
        <form className="form-grid" onSubmit={handleCreate}>
          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
              required
            />
          </label>
          <label>
            Senha
            <input
              type="password"
              value={form.password}
              onChange={(event) => updateField("password", event.target.value)}
              minLength={6}
              required
            />
          </label>
          <label>
            Permissões (separadas por vírgula)
            <input
              value={form.permissions}
              onChange={(event) => updateField("permissions", event.target.value)}
              placeholder="ADMINISTRADOR_VISUALIZAR, RESERVA_CRIAR"
            />
          </label>
          <label>
            ID Jogador (opcional)
            <input
              value={form.jogadorId}
              onChange={(event) => updateField("jogadorId", event.target.value)}
            />
          </label>
          <label>
            ID Administrador (opcional)
            <input
              value={form.administradorId}
              onChange={(event) => updateField("administradorId", event.target.value)}
            />
          </label>

          <button className="button" disabled={loading} type="submit">
            {loading ? "Salvando..." : "Cadastrar Usuário"}
          </button>
        </form>
      ) : null}

      {operation === "editar" ? (
        <>
          <label className="inline-field">
            Selecione o usuário
            <select
              value={selectedId}
              onChange={(event) => {
                const itemId = event.target.value;
                setSelectedId(itemId);

                const selected = items.find((item) => item.id === itemId);

                if (selected) {
                  syncFormFromSelectedItem(selected);
                }
              }}
            >
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.email}
                </option>
              ))}
            </select>
          </label>

          {selectedId ? (
            <form className="form-grid" onSubmit={handleUpdate}>
              <label>
                Email
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => updateField("email", event.target.value)}
                  required
                />
              </label>
              <label>
                Nova senha (opcional)
                <input
                  type="password"
                  value={form.password}
                  onChange={(event) => updateField("password", event.target.value)}
                  minLength={6}
                />
              </label>
              <label>
                Permissões (separadas por vírgula)
                <input
                  value={form.permissions}
                  onChange={(event) => updateField("permissions", event.target.value)}
                />
              </label>
              <label>
                ID Jogador (opcional)
                <input
                  value={form.jogadorId}
                  onChange={(event) => updateField("jogadorId", event.target.value)}
                />
              </label>
              <label>
                ID Administrador (opcional)
                <input
                  value={form.administradorId}
                  onChange={(event) => updateField("administradorId", event.target.value)}
                />
              </label>

              <button className="button" disabled={loading} type="submit">
                {loading ? "Atualizando..." : "Atualizar Usuário"}
              </button>
            </form>
          ) : (
            <p className="panel__muted">Nenhum usuário disponível para edição.</p>
          )}
        </>
      ) : null}

      {operation === "apagar" ? (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && !loading ? (
                <tr>
                  <td colSpan={2} className="table__empty">
                    Nenhum usuário para remover.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.email}</td>
                    <td>
                      <button
                        className="button button--danger"
                        disabled={loading}
                        onClick={() => void handleDelete(item.id)}
                        type="button"
                      >
                        Apagar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : null}

      {loading ? <p className="panel__muted">Carregando...</p> : null}
      {!loading && items.length === 0 && operation !== "cadastrar" ? (
        <p className="panel__hint">
          Se a API retornar um formato diferente de lista em `/users`, ajuste o mapeamento em
          `src/lib/api-client.ts`.
        </p>
      ) : null}
    </section>
  );
}
