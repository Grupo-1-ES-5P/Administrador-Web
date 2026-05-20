"use client";

import {
  ApiError,
  createReserva,
  deleteReserva,
  fetchReservasDoAdministrador,
  updateReserva,
} from "@/lib/api-client";
import { formatDateTime, isoToInputDateTime } from "@/lib/formatters";
import type { Quadra, Reserva } from "@/lib/types";
import { useEffect, useState, type FormEvent } from "react";
import type { DashboardPanelProps } from "./panel-props";

interface ReservaFormState {
  idQuadra: string;
  idJogador: string;
  horarioInicio: string;
  horarioFim: string;
}

const EMPTY_FORM: ReservaFormState = {
  idQuadra: "",
  idJogador: "",
  horarioInicio: "",
  horarioFim: "",
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

export function ReservasPanel({
  operation,
  session,
  onFeedback,
  onUnauthorized,
}: DashboardPanelProps) {
  const idAdministradorLogado = session.usuario.idAdministrador;

  const [quadras, setQuadras] = useState<Quadra[]>([]);
  const [items, setItems] = useState<Reserva[]>([]);
  const [form, setForm] = useState<ReservaFormState>(EMPTY_FORM);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function syncFormFromSelectedItem(item: Reserva) {
    setForm({
      idQuadra: item.idQuadra,
      idJogador: item.idJogador,
      horarioInicio: isoToInputDateTime(item.horarioInicio),
      horarioFim: isoToInputDateTime(item.horarioFim),
    });
  }

  async function loadItems() {
    if (!idAdministradorLogado) {
      setQuadras([]);
      setItems([]);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetchReservasDoAdministrador(
        session.accessToken,
        idAdministradorLogado,
      );

      setQuadras(response.quadras);
      setItems(response.reservas);

      let nextSelectedId = selectedId;

      if (response.reservas.length === 0) {
        nextSelectedId = "";
      } else if (!response.reservas.some((item) => item.id === selectedId)) {
        nextSelectedId = response.reservas[0].id;
      }

      setSelectedId(nextSelectedId);

      if (operation === "editar") {
        const selected = response.reservas.find(
          (item) => item.id === nextSelectedId,
        );

        if (selected) {
          syncFormFromSelectedItem(selected);
        }
      }

      if (operation === "cadastrar" && response.quadras.length > 0) {
        setForm((current) => ({
          ...current,
          idQuadra: current.idQuadra || response.quadras[0].id,
        }));
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError, onUnauthorized, "Falha ao carregar reservas."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [operation, session.accessToken, idAdministradorLogado]);

  function updateField(field: keyof ReservaFormState, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.idQuadra || !form.idJogador || !form.horarioInicio || !form.horarioFim) {
      onFeedback({
        type: "error",
        text: "Preencha todos os campos obrigatórios para criar a reserva.",
      });
      return;
    }

    setLoading(true);
    setError("");

    try {
      await createReserva(session.accessToken, {
        idQuadra: form.idQuadra,
        idJogador: form.idJogador,
        horarioInicio: form.horarioInicio,
        horarioFim: form.horarioFim,
      });

      onFeedback({ type: "success", text: "Reserva criada com sucesso." });
      setForm(EMPTY_FORM);
      await loadItems();
    } catch (requestError) {
      setError(getErrorMessage(requestError, onUnauthorized, "Falha ao criar reserva."));
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedId) {
      onFeedback({ type: "error", text: "Selecione uma reserva para editar." });
      return;
    }

    setLoading(true);
    setError("");

    try {
      await updateReserva(session.accessToken, selectedId, {
        idQuadra: form.idQuadra,
        idJogador: form.idJogador,
        horarioInicio: form.horarioInicio,
        horarioFim: form.horarioFim,
      });

      onFeedback({ type: "success", text: "Reserva atualizada com sucesso." });
      await loadItems();
    } catch (requestError) {
      setError(getErrorMessage(requestError, onUnauthorized, "Falha ao atualizar reserva."));
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm("Deseja realmente apagar esta reserva?");

    if (!confirmed) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      await deleteReserva(session.accessToken, id);
      onFeedback({ type: "success", text: "Reserva removida com sucesso." });
      await loadItems();
    } catch (requestError) {
      setError(getErrorMessage(requestError, onUnauthorized, "Falha ao remover reserva."));
    } finally {
      setLoading(false);
    }
  }

  if (!idAdministradorLogado) {
    return (
      <section className="panel">
        <header className="panel__header">
          <h2>Reservas</h2>
        </header>
        <p className="panel__error">
          O usuário autenticado não possui `idAdministrador`. Não é possível gerenciar reservas.
        </p>
      </section>
    );
  }

  const quadraNomePorId = new Map(quadras.map((quadra) => [quadra.id, quadra.nome]));

  return (
    <section className="panel">
      <header className="panel__header">
        <h2>Reservas das quadras do administrador</h2>
        <button type="button" className="button button--ghost" onClick={() => void loadItems()}>
          Recarregar
        </button>
      </header>

      {error ? <p className="panel__error">{error}</p> : null}

      {operation === "visualizar" ? (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Quadra</th>
                <th>Jogador</th>
                <th>Início</th>
                <th>Fim</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && !loading ? (
                <tr>
                  <td colSpan={5} className="table__empty">
                    Nenhuma reserva encontrada para as suas quadras.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.id}</td>
                    <td>{quadraNomePorId.get(item.idQuadra) ?? `Quadra ${item.idQuadra}`}</td>
                    <td>{item.idJogador}</td>
                    <td>{formatDateTime(item.horarioInicio)}</td>
                    <td>{formatDateTime(item.horarioFim)}</td>
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
            Quadra
            <select
              value={form.idQuadra}
              onChange={(event) => updateField("idQuadra", event.target.value)}
              required
            >
              <option value="">Selecione</option>
              {quadras.map((quadra) => (
                <option key={quadra.id} value={quadra.id}>
                  {quadra.nome}
                </option>
              ))}
            </select>
          </label>
          <label>
            ID do jogador
            <input
              value={form.idJogador}
              onChange={(event) => updateField("idJogador", event.target.value)}
              required
            />
          </label>
          <label>
            Horário de início
            <input
              type="datetime-local"
              value={form.horarioInicio}
              onChange={(event) => updateField("horarioInicio", event.target.value)}
              required
            />
          </label>
          <label>
            Horário de fim
            <input
              type="datetime-local"
              value={form.horarioFim}
              onChange={(event) => updateField("horarioFim", event.target.value)}
              required
            />
          </label>

          <button className="button" disabled={loading} type="submit">
            {loading ? "Salvando..." : "Cadastrar Reserva"}
          </button>
        </form>
      ) : null}

      {operation === "editar" ? (
        <>
          <label className="inline-field">
            Selecione a reserva
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
                  {quadraNomePorId.get(item.idQuadra) ?? `Quadra ${item.idQuadra}`} - {formatDateTime(item.horarioInicio)}
                </option>
              ))}
            </select>
          </label>

          {selectedId ? (
            <form className="form-grid" onSubmit={handleUpdate}>
              <label>
                Quadra
                <select
                  value={form.idQuadra}
                  onChange={(event) => updateField("idQuadra", event.target.value)}
                  required
                >
                  {quadras.map((quadra) => (
                    <option key={quadra.id} value={quadra.id}>
                      {quadra.nome}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                ID do jogador
                <input
                  value={form.idJogador}
                  onChange={(event) => updateField("idJogador", event.target.value)}
                  required
                />
              </label>
              <label>
                Horário de início
                <input
                  type="datetime-local"
                  value={form.horarioInicio}
                  onChange={(event) => updateField("horarioInicio", event.target.value)}
                  required
                />
              </label>
              <label>
                Horário de fim
                <input
                  type="datetime-local"
                  value={form.horarioFim}
                  onChange={(event) => updateField("horarioFim", event.target.value)}
                  required
                />
              </label>

              <button className="button" disabled={loading} type="submit">
                {loading ? "Atualizando..." : "Atualizar Reserva"}
              </button>
            </form>
          ) : (
            <p className="panel__muted">Nenhuma reserva disponível para edição.</p>
          )}
        </>
      ) : null}

      {operation === "apagar" ? (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Quadra</th>
                <th>Início</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && !loading ? (
                <tr>
                  <td colSpan={3} className="table__empty">
                    Nenhuma reserva para remover.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id}>
                    <td>{quadraNomePorId.get(item.idQuadra) ?? `Quadra ${item.idQuadra}`}</td>
                    <td>{formatDateTime(item.horarioInicio)}</td>
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
      {!loading && quadras.length === 0 ? (
        <p className="panel__hint">
          Cadastre quadras neste administrador para começar a registrar reservas.
        </p>
      ) : null}
    </section>
  );
}
