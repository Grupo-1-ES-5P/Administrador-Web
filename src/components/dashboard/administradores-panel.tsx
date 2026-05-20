"use client";

import {
  ApiError,
  createAdministrador,
  deleteAdministrador,
  fetchAdministradores,
  type CreateAdministradorInput,
  updateAdministrador,
} from "@/lib/api-client";
import type { Administrador } from "@/lib/types";
import { useEffect, useState } from "react";
import type { DashboardPanelProps } from "./panel-props";

const EMPTY_FORM: CreateAdministradorInput = {
  nome: "",
  email: "",
  cnpj: "",
  idEndereco: "",
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

export function AdministradoresPanel({
  operation,
  session,
  onFeedback,
  onUnauthorized,
}: DashboardPanelProps) {
  const [items, setItems] = useState<Administrador[]>([]);
  const [form, setForm] = useState<CreateAdministradorInput>(EMPTY_FORM);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function syncFormFromSelectedItem(item: Administrador) {
    setForm({
      nome: item.nome,
      email: item.email,
      cnpj: item.cnpj,
      idEndereco: item.idEndereco,
    });
  }

  async function loadItems() {
    setLoading(true);
    setError("");

    try {
      const data = await fetchAdministradores(session.accessToken);
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
          "Não foi possível carregar os administradores.",
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

  function updateField(field: keyof CreateAdministradorInput, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.nome || !form.email || !form.cnpj || !form.idEndereco) {
      onFeedback({
        type: "error",
        text: "Preencha todos os campos obrigatórios para cadastrar.",
      });
      return;
    }

    setLoading(true);
    setError("");

    try {
      await createAdministrador(session.accessToken, {
        ...form,
        cnpj: form.cnpj.replace(/\D/g, ""),
      });
      setForm(EMPTY_FORM);
      onFeedback({ type: "success", text: "Administrador cadastrado com sucesso." });
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          onUnauthorized,
          "Falha ao cadastrar administrador.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedId) {
      onFeedback({
        type: "error",
        text: "Selecione um administrador para atualizar.",
      });
      return;
    }

    setLoading(true);
    setError("");

    try {
      await updateAdministrador(session.accessToken, selectedId, {
        nome: form.nome,
        email: form.email,
        cnpj: form.cnpj.replace(/\D/g, ""),
        idEndereco: form.idEndereco,
      });

      onFeedback({ type: "success", text: "Administrador atualizado com sucesso." });
      await loadItems();
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          onUnauthorized,
          "Falha ao atualizar administrador.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm("Deseja realmente apagar este administrador?");

    if (!confirmed) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      await deleteAdministrador(session.accessToken, id);
      onFeedback({ type: "success", text: "Administrador removido com sucesso." });
      await loadItems();
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          onUnauthorized,
          "Falha ao remover administrador.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel">
      <header className="panel__header">
        <h2>Administradores</h2>
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
                <th>Nome</th>
                <th>Email</th>
                <th>CNPJ</th>
                <th>ID Endereço</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && !loading ? (
                <tr>
                  <td colSpan={5} className="table__empty">
                    Nenhum administrador encontrado.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.id}</td>
                    <td>{item.nome}</td>
                    <td>{item.email}</td>
                    <td>{item.cnpj}</td>
                    <td>{item.idEndereco}</td>
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
            Nome
            <input
              value={form.nome}
              onChange={(event) => updateField("nome", event.target.value)}
              required
            />
          </label>
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
            CNPJ
            <input
              value={form.cnpj}
              onChange={(event) => updateField("cnpj", event.target.value)}
              required
            />
          </label>
          <label>
            ID do Endereço
            <input
              value={form.idEndereco}
              onChange={(event) => updateField("idEndereco", event.target.value)}
              required
            />
          </label>

          <button className="button" disabled={loading} type="submit">
            {loading ? "Salvando..." : "Cadastrar Administrador"}
          </button>
        </form>
      ) : null}

      {operation === "editar" ? (
        <>
          <label className="inline-field">
            Selecione o administrador
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
                  {item.nome} ({item.email})
                </option>
              ))}
            </select>
          </label>

          {selectedId ? (
            <form className="form-grid" onSubmit={handleUpdate}>
              <label>
                Nome
                <input
                  value={form.nome}
                  onChange={(event) => updateField("nome", event.target.value)}
                  required
                />
              </label>
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
                CNPJ
                <input
                  value={form.cnpj}
                  onChange={(event) => updateField("cnpj", event.target.value)}
                  required
                />
              </label>
              <label>
                ID do Endereço
                <input
                  value={form.idEndereco}
                  onChange={(event) => updateField("idEndereco", event.target.value)}
                  required
                />
              </label>

              <button className="button" disabled={loading} type="submit">
                {loading ? "Atualizando..." : "Atualizar Administrador"}
              </button>
            </form>
          ) : (
            <p className="panel__muted">Nenhum administrador disponível para edição.</p>
          )}
        </>
      ) : null}

      {operation === "apagar" ? (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Email</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && !loading ? (
                <tr>
                  <td colSpan={3} className="table__empty">
                    Nenhum administrador para remover.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.nome}</td>
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
    </section>
  );
}
