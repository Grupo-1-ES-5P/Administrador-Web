"use client";

import {
  ApiError,
  createQuadra,
  deleteQuadra,
  fetchQuadras,
  type CreateQuadraInput,
  uploadQuadraImages,
  updateQuadra,
} from "@/lib/api-client";
import type { Quadra } from "@/lib/types";
import { useEffect, useState, type FormEvent } from "react";
import type { DashboardPanelProps } from "./panel-props";

interface QuadraFormState {
  nome: string;
  descricao: string;
  horarioAbertura: string;
  horarioFechamento: string;
  idEndereco: string;
  imagens: string[];
}

type QuadraTextField = Exclude<keyof QuadraFormState, "imagens">;

const EMPTY_FORM: QuadraFormState = {
  nome: "",
  descricao: "",
  horarioAbertura: "",
  horarioFechamento: "",
  idEndereco: "",
  imagens: [],
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

function mergeUniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

function normalizeTimeForInput(value: string): string {
  const normalized = value.trim();

  if (/^([01]\d|2[0-3]):[0-5]\d$/.test(normalized)) {
    return normalized;
  }

  if (/^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(normalized)) {
    return normalized.slice(0, 5);
  }

  return "";
}

function buildCreatePayload(
  form: QuadraFormState,
  idAdministrador: string,
): CreateQuadraInput {
  return {
    nome: form.nome.trim(),
    descricao: form.descricao.trim(),
    horarioAbertura: form.horarioAbertura.trim(),
    horarioFechamento: form.horarioFechamento.trim(),
    idEndereco: form.idEndereco.trim(),
    idAdministrador,
    imagens: form.imagens,
  };
}

function formatHorarioRange(item: Quadra): string {
  return `${item.horarioAbertura} - ${item.horarioFechamento}`;
}

export function QuadrasPanel({
  operation,
  session,
  onFeedback,
  onUnauthorized,
}: DashboardPanelProps) {
  const idAdministradorLogado = session.usuario.idAdministrador;

  const [items, setItems] = useState<Quadra[]>([]);
  const [form, setForm] = useState<QuadraFormState>(EMPTY_FORM);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  function syncFormFromSelectedItem(item: Quadra) {
    setForm({
      nome: item.nome,
      descricao: item.descricao,
      horarioAbertura: normalizeTimeForInput(item.horarioAbertura),
      horarioFechamento: normalizeTimeForInput(item.horarioFechamento),
      idEndereco: item.idEndereco,
      imagens: item.imagens,
    });
    setPendingFiles([]);
  }

  async function loadItems() {
    if (!idAdministradorLogado) {
      setItems([]);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await fetchQuadras(session.accessToken, idAdministradorLogado);
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
      setError(getErrorMessage(requestError, onUnauthorized, "Falha ao carregar quadras."));
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
  }, [operation, session.accessToken, idAdministradorLogado]);

  function updateField(field: QuadraTextField, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function removeImage(url: string) {
    setForm((current) => ({
      ...current,
      imagens: current.imagens.filter((item) => item !== url),
    }));
  }

  async function uploadPendingFilesIfNeeded(currentImages: string[]): Promise<string[]> {
    if (pendingFiles.length === 0) {
      return currentImages;
    }

    if (currentImages.length + pendingFiles.length > 12) {
      throw new ApiError("A quadra pode ter no máximo 12 imagens.", 400);
    }

    const uploadedImages = await uploadQuadraImages(session.accessToken, pendingFiles);
    setPendingFiles([]);
    return mergeUniqueStrings([...currentImages, ...uploadedImages]);
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!idAdministradorLogado) {
      onFeedback({
        type: "error",
        text: "Usuário logado não possui vínculo com administrador.",
      });
      return;
    }

    if (
      !form.nome ||
      !form.descricao ||
      !form.horarioAbertura ||
      !form.horarioFechamento ||
      !form.idEndereco
    ) {
      onFeedback({
        type: "error",
        text: "Nome, descrição, horários e id do endereço são obrigatórios.",
      });
      return;
    }

    setLoading(true);
    setError("");

    try {
      const imagens = await uploadPendingFilesIfNeeded(form.imagens);

      await createQuadra(session.accessToken, {
        ...buildCreatePayload(form, idAdministradorLogado),
        imagens,
      });
      setForm(EMPTY_FORM);
      setPendingFiles([]);
      onFeedback({ type: "success", text: "Quadra cadastrada com sucesso." });
    } catch (requestError) {
      setError(getErrorMessage(requestError, onUnauthorized, "Falha ao cadastrar quadra."));
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedId) {
      onFeedback({ type: "error", text: "Selecione uma quadra para atualizar." });
      return;
    }

    setLoading(true);
    setError("");

    try {
      const imagens = await uploadPendingFilesIfNeeded(form.imagens);

      await updateQuadra(session.accessToken, selectedId, {
        nome: form.nome.trim(),
        descricao: form.descricao.trim(),
        horarioAbertura: form.horarioAbertura.trim(),
        horarioFechamento: form.horarioFechamento.trim(),
        idEndereco: form.idEndereco.trim(),
        imagens,
      });

      onFeedback({ type: "success", text: "Quadra atualizada com sucesso." });
      await loadItems();
    } catch (requestError) {
      setError(getErrorMessage(requestError, onUnauthorized, "Falha ao atualizar quadra."));
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm("Deseja realmente apagar esta quadra?");

    if (!confirmed) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      await deleteQuadra(session.accessToken, id);
      onFeedback({ type: "success", text: "Quadra removida com sucesso." });
      await loadItems();
    } catch (requestError) {
      setError(getErrorMessage(requestError, onUnauthorized, "Falha ao remover quadra."));
    } finally {
      setLoading(false);
    }
  }

  if (!idAdministradorLogado) {
    return (
      <section className="panel">
        <header className="panel__header">
          <h2>Quadras</h2>
        </header>
        <p className="panel__error">
          O usuário autenticado não possui `idAdministrador`. Não é possível gerenciar quadras.
        </p>
      </section>
    );
  }

  return (
    <section className="panel">
      <header className="panel__header">
        <h2>Quadras do administrador logado</h2>
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
                <th>Horários</th>
                <th>Endereço</th>
                <th>Imagens</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && !loading ? (
                <tr>
                  <td colSpan={5} className="table__empty">
                    Nenhuma quadra encontrada.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.id}</td>
                    <td>{item.nome}</td>
                    <td>{formatHorarioRange(item)}</td>
                    <td>{item.idEndereco}</td>
                    <td>
                      {item.imagens.length === 0 ? (
                        <span className="quadra-image-empty">Sem imagens</span>
                      ) : (
                        <div className="quadra-images">
                          {item.imagens.map((url, index) => (
                            <a
                              key={`${item.id}-${url}`}
                              className="quadra-image-link"
                              href={url}
                              rel="noreferrer"
                              target="_blank"
                              title={`Imagem ${index + 1} da quadra ${item.nome}`}
                            >
                              <img
                                alt={`Imagem ${index + 1} da quadra ${item.nome}`}
                                className="quadra-image-thumb"
                                loading="lazy"
                                src={url}
                              />
                            </a>
                          ))}
                        </div>
                      )}
                    </td>
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
            Descrição
            <textarea
              value={form.descricao}
              onChange={(event) => updateField("descricao", event.target.value)}
              required
              rows={3}
            />
          </label>
          <label>
            Horário de abertura
            <input
              type="time"
              value={form.horarioAbertura}
              onChange={(event) => updateField("horarioAbertura", event.target.value)}
              required
            />
          </label>
          <label>
            Horário de fechamento
            <input
              type="time"
              value={form.horarioFechamento}
              onChange={(event) => updateField("horarioFechamento", event.target.value)}
              required
            />
          </label>
          <label>
            Id do endereço
            <input
              type="number"
              min="1"
              step="1"
              value={form.idEndereco}
              onChange={(event) => updateField("idEndereco", event.target.value)}
              required
            />
          </label>
          <label>
            Fotos da quadra
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(event) => {
                setPendingFiles(Array.from(event.target.files ?? []));
              }}
            />
          </label>
          {pendingFiles.length > 0 ? (
            <p className="panel__muted">
              {pendingFiles.length} arquivo(s) selecionado(s) para upload.
            </p>
          ) : null}
          {form.imagens.length > 0 ? (
            <div className="panel__hint">
              Imagens vinculadas:
              {form.imagens.map((url) => (
                <p key={url}>
                  <a href={url} rel="noreferrer" target="_blank">
                    {url}
                  </a>{" "}
                  <button
                    type="button"
                    className="button button--ghost"
                    onClick={() => removeImage(url)}
                  >
                    Remover
                  </button>
                </p>
              ))}
            </div>
          ) : null}

          <button className="button" disabled={loading} type="submit">
            {loading ? "Salvando..." : "Cadastrar Quadra"}
          </button>
        </form>
      ) : null}

      {operation === "editar" ? (
        <>
          <label className="inline-field">
            Selecione a quadra
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
                  {item.nome}
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
                Descrição
                <textarea
                  value={form.descricao}
                  onChange={(event) => updateField("descricao", event.target.value)}
                  required
                  rows={3}
                />
              </label>
              <label>
                Horário de abertura
                <input
                  type="time"
                  value={form.horarioAbertura}
                  onChange={(event) => updateField("horarioAbertura", event.target.value)}
                  required
                />
              </label>
              <label>
                Horário de fechamento
                <input
                  type="time"
                  value={form.horarioFechamento}
                  onChange={(event) => updateField("horarioFechamento", event.target.value)}
                  required
                />
              </label>
              <label>
                Id do endereço
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={form.idEndereco}
                  onChange={(event) => updateField("idEndereco", event.target.value)}
                  required
                />
              </label>
              <label>
                Fotos da quadra
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(event) => {
                    setPendingFiles(Array.from(event.target.files ?? []));
                  }}
                />
              </label>
              {pendingFiles.length > 0 ? (
                <p className="panel__muted">
                  {pendingFiles.length} arquivo(s) selecionado(s) para upload.
                </p>
              ) : null}
              {form.imagens.length > 0 ? (
                <div className="panel__hint">
                  Imagens vinculadas:
                  {form.imagens.map((url) => (
                    <p key={url}>
                      <a href={url} rel="noreferrer" target="_blank">
                        {url}
                      </a>{" "}
                      <button
                        type="button"
                        className="button button--ghost"
                        onClick={() => removeImage(url)}
                      >
                        Remover
                      </button>
                    </p>
                  ))}
                </div>
              ) : null}

              <button className="button" disabled={loading} type="submit">
                {loading ? "Atualizando..." : "Atualizar Quadra"}
              </button>
            </form>
          ) : (
            <p className="panel__muted">Nenhuma quadra disponível para edição.</p>
          )}
        </>
      ) : null}

      {operation === "apagar" ? (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Horários</th>
                <th>Imagens</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && !loading ? (
                <tr>
                  <td colSpan={4} className="table__empty">
                    Nenhuma quadra para remover.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.nome}</td>
                    <td>{formatHorarioRange(item)}</td>
                    <td>{item.imagens.length}</td>
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
          A seção de quadras espera endpoints em `/quadras` filtrando por `idAdministrador`.
        </p>
      ) : null}
    </section>
  );
}
