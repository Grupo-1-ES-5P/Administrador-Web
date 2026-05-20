import type {
  Administrador,
  AuthSession,
  Quadra,
  Reserva,
  Usuario,
} from "@/lib/types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:3020";

interface RequestConfig {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string;
  query?: Record<string, string | number | undefined>;
}

interface ApiErrorBody {
  message?: string | string[];
  error?: string;
}

interface CollectionResponse<T> {
  data?: T[];
  items?: T[];
}

interface LoginInput {
  email: string;
  senha: string;
}

interface CreateAdministradorInput {
  nome: string;
  email: string;
  cnpj: string;
  idEndereco: string;
}

interface UpdateAdministradorInput {
  nome?: string;
  email?: string;
  cnpj?: string;
  idEndereco?: string;
}

interface CreateUsuarioInput {
  email: string;
  password: string;
  permissions: string[];
  jogadorId?: number;
  administradorId?: number;
}

interface UpdateUsuarioInput {
  email?: string;
  password?: string;
  permissions?: string[];
  jogadorId?: number;
  administradorId?: number;
}

interface CreateQuadraInput {
  nome: string;
  descricao: string;
  horarioAbertura: string;
  horarioFechamento: string;
  idEndereco: string;
  idAdministrador: string;
  imagens: string[];
}

type UpdateQuadraInput = Partial<CreateQuadraInput>;

interface CreateReservaInput {
  idQuadra: string;
  idJogador: string;
  horarioInicio: string;
  horarioFim: string;
}

type UpdateReservaInput = Partial<CreateReservaInput>;

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function buildUrl(path: string, query?: Record<string, string | number | undefined>): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${API_BASE_URL}${normalizedPath}`);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }

  return url.toString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toStringValue(value: unknown, fallback = ""): string {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "bigint") {
    return String(value);
  }

  return fallback;
}

function toNumberValue(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => toStringValue(item).trim())
    .filter((item) => item.length > 0);
}

function extractCollection<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (!isRecord(payload)) {
    return [];
  }

  const collection = payload as CollectionResponse<T>;

  if (Array.isArray(collection.data)) {
    return collection.data;
  }

  if (Array.isArray(collection.items)) {
    return collection.items;
  }

  return [];
}

function extractErrorMessage(body: unknown, fallback: string): string {
  if (!isRecord(body)) {
    return fallback;
  }

  const parsedBody = body as ApiErrorBody;

  if (typeof parsedBody.message === "string") {
    return parsedBody.message;
  }

  if (Array.isArray(parsedBody.message) && parsedBody.message.length > 0) {
    return parsedBody.message.join(" ");
  }

  if (typeof parsedBody.error === "string") {
    return parsedBody.error;
  }

  return fallback;
}

async function parseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    const text = await response.text();
    return text.length > 0 ? text : null;
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function request<T>(path: string, config: RequestConfig = {}): Promise<T> {
  const { method = "GET", body, token, query } = config;
  const headers = new Headers();

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(buildUrl(path, query), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const responseBody = await parseBody(response);

  if (!response.ok) {
    const fallbackMessage = `Erro na API (${response.status}).`;
    throw new ApiError(
      extractErrorMessage(responseBody, fallbackMessage),
      response.status,
    );
  }

  return responseBody as T;
}

function mapAdministrador(payload: unknown): Administrador {
  const source = isRecord(payload) ? payload : {};

  return {
    id: toStringValue(source.id),
    nome: toStringValue(source.nome),
    email: toStringValue(source.email),
    cnpj: toStringValue(source.cnpj),
    idEndereco: toStringValue(source.idEndereco),
    idUsuario: source.idUsuario ? toStringValue(source.idUsuario) : null,
  };
}

function mapUsuario(payload: unknown): Usuario {
  const source = isRecord(payload) ? payload : {};

  return {
    id: toStringValue(source.id),
    email: toStringValue(source.email),
    permissions: toStringArray(source.permissions ?? source.permissoes),
    jogadorId: source.jogadorId ? toStringValue(source.jogadorId) : null,
    administradorId: source.administradorId
      ? toStringValue(source.administradorId)
      : null,
  };
}

function mapQuadra(payload: unknown): Quadra {
  const source = isRecord(payload) ? payload : {};

  return {
    id: toStringValue(source.id),
    nome: toStringValue(source.nome),
    descricao: toStringValue(source.descricao),
    horarioAbertura: toStringValue(source.horarioAbertura),
    horarioFechamento: toStringValue(source.horarioFechamento),
    idEndereco: toStringValue(source.idEndereco),
    idAdministrador: toStringValue(source.idAdministrador),
    imagens: toStringArray(source.imagens),
  };
}

function mapReserva(payload: unknown): Reserva {
  const source = isRecord(payload) ? payload : {};

  return {
    id: toStringValue(source.id),
    idQuadra: toStringValue(source.idQuadra),
    idJogador: toStringValue(source.idJogador),
    horarioInicio: toStringValue(source.horarioInicio),
    horarioFim: toStringValue(source.horarioFim),
  };
}

function normalizeDateInput(value: string): string {
  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? value : parsedDate.toISOString();
}

export async function login(input: LoginInput): Promise<AuthSession> {
  return request<AuthSession>("/auth/login", {
    method: "POST",
    body: {
      email: input.email,
      senha: input.senha,
    },
  });
}

export async function fetchAdministradores(token: string): Promise<Administrador[]> {
  const response = await request<unknown>("/administradores", {
    token,
    query: { page: 1, perPage: 100 },
  });

  return extractCollection<unknown>(response).map(mapAdministrador);
}

export async function createAdministrador(
  token: string,
  input: CreateAdministradorInput,
): Promise<Administrador> {
  const response = await request<unknown>("/administradores", {
    method: "POST",
    token,
    body: input,
  });

  return mapAdministrador(response);
}

export async function updateAdministrador(
  token: string,
  id: string,
  input: UpdateAdministradorInput,
): Promise<Administrador> {
  const response = await request<unknown>(`/administradores/${id}`, {
    method: "PATCH",
    token,
    body: input,
  });

  return mapAdministrador(response);
}

export async function deleteAdministrador(token: string, id: string): Promise<void> {
  return request<void>(`/administradores/${id}`, {
    method: "DELETE",
    token,
  });
}

export async function fetchUsuarios(token: string): Promise<Usuario[]> {
  const response = await request<unknown>("/users", { token });
  return extractCollection<unknown>(response).map(mapUsuario);
}

export async function createUsuario(
  token: string,
  input: CreateUsuarioInput,
): Promise<Usuario | null> {
  const response = await request<unknown>("/users", {
    method: "POST",
    token,
    body: input,
  });

  if (!response) {
    return null;
  }

  return mapUsuario(response);
}

export async function updateUsuario(
  token: string,
  id: string,
  input: UpdateUsuarioInput,
): Promise<Usuario | null> {
  const response = await request<unknown>(`/users/${id}`, {
    method: "PUT",
    token,
    body: input,
  });

  if (!response) {
    return null;
  }

  return mapUsuario(response);
}

export async function deleteUsuario(token: string, id: string): Promise<void> {
  return request<void>(`/users/${id}`, {
    method: "DELETE",
    token,
  });
}

export async function fetchQuadras(
  token: string,
  idAdministrador: string,
): Promise<Quadra[]> {
  const response = await request<unknown>("/quadras", {
    token,
    query: { idAdministrador, page: 1, perPage: 100 },
  });

  return extractCollection<unknown>(response).map(mapQuadra);
}

export async function createQuadra(token: string, input: CreateQuadraInput): Promise<Quadra> {
  const response = await request<unknown>("/quadras", {
    method: "POST",
    token,
    body: input,
  });

  return mapQuadra(response);
}

export async function uploadQuadraImages(
  token: string,
  files: File[],
): Promise<string[]> {
  if (files.length === 0) {
    return [];
  }

  const formData = new FormData();

  for (const file of files) {
    formData.append("imagens", file);
  }

  const headers = new Headers();
  headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(buildUrl("/quadras/upload-imagens"), {
    method: "POST",
    headers,
    body: formData,
    cache: "no-store",
  });

  const responseBody = await parseBody(response);

  if (!response.ok) {
    const fallbackMessage = `Erro na API (${response.status}).`;
    throw new ApiError(
      extractErrorMessage(responseBody, fallbackMessage),
      response.status,
    );
  }

  if (!isRecord(responseBody)) {
    return [];
  }

  return toStringArray(responseBody.imagens);
}

export async function updateQuadra(
  token: string,
  id: string,
  input: UpdateQuadraInput,
): Promise<Quadra> {
  const response = await request<unknown>(`/quadras/${id}`, {
    method: "PATCH",
    token,
    body: input,
  });

  return mapQuadra(response);
}

export async function deleteQuadra(token: string, id: string): Promise<void> {
  return request<void>(`/quadras/${id}`, {
    method: "DELETE",
    token,
  });
}

export async function fetchReservasByQuadra(
  token: string,
  idQuadra: string,
): Promise<Reserva[]> {
  const response = await request<unknown>("/reservas", {
    token,
    query: {
      idQuadra,
      page: 1,
      perPage: 100,
    },
  });

  return extractCollection<unknown>(response).map(mapReserva);
}

export async function fetchReservasDoAdministrador(
  token: string,
  idAdministrador: string,
): Promise<{ quadras: Quadra[]; reservas: Reserva[] }> {
  const quadras = await fetchQuadras(token, idAdministrador);

  if (quadras.length === 0) {
    return { quadras: [], reservas: [] };
  }

  const reservasPorQuadra = await Promise.all(
    quadras.map(async (quadra) => {
      try {
        return await fetchReservasByQuadra(token, quadra.id);
      } catch {
        return [];
      }
    }),
  );

  const idQuadras = new Set(quadras.map((quadra) => quadra.id));
  const dedupe = new Map<string, Reserva>();

  for (const lote of reservasPorQuadra) {
    for (const reserva of lote) {
      if (!idQuadras.has(reserva.idQuadra)) {
        continue;
      }

      dedupe.set(reserva.id, reserva);
    }
  }

  const reservas = [...dedupe.values()].sort((a, b) => {
    const aDate = new Date(a.horarioInicio).getTime();
    const bDate = new Date(b.horarioInicio).getTime();
    return bDate - aDate;
  });

  return {
    quadras,
    reservas,
  };
}

export async function createReserva(token: string, input: CreateReservaInput): Promise<Reserva> {
  const response = await request<unknown>("/reservas", {
    method: "POST",
    token,
    body: {
      idQuadra: input.idQuadra,
      idJogador: input.idJogador,
      horarioInicio: normalizeDateInput(input.horarioInicio),
      horarioFim: normalizeDateInput(input.horarioFim),
    },
  });

  return mapReserva(response);
}

export async function updateReserva(
  token: string,
  id: string,
  input: UpdateReservaInput,
): Promise<Reserva> {
  const response = await request<unknown>(`/reservas/${id}`, {
    method: "PATCH",
    token,
    body: {
      ...input,
      horarioInicio: input.horarioInicio
        ? normalizeDateInput(input.horarioInicio)
        : undefined,
      horarioFim: input.horarioFim ? normalizeDateInput(input.horarioFim) : undefined,
    },
  });

  return mapReserva(response);
}

export async function deleteReserva(token: string, id: string): Promise<void> {
  return request<void>(`/reservas/${id}`, {
    method: "DELETE",
    token,
  });
}

export type {
  CreateAdministradorInput,
  CreateQuadraInput,
  CreateReservaInput,
  CreateUsuarioInput,
  LoginInput,
  UpdateQuadraInput,
  UpdateAdministradorInput,
  UpdateReservaInput,
  UpdateUsuarioInput,
};
