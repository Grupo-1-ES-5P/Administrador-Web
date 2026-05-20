export type DashboardSection =
  | "administradores"
  | "usuarios"
  | "quadras"
  | "reservas";

export type CrudOperation = "visualizar" | "cadastrar" | "editar" | "apagar";

export type FeedbackType = "success" | "error" | "info";

export interface FeedbackMessage {
  type: FeedbackType;
  text: string;
}

export interface AuthUser {
  id: string;
  email: string;
  idJogador: string | null;
  idAdministrador: string | null;
  permissoes: string[];
}

export interface AuthSession {
  accessToken: string;
  tokenType: "Bearer";
  expiresIn: string;
  usuario: AuthUser;
}

export interface Administrador {
  id: string;
  nome: string;
  email: string;
  cnpj: string;
  idEndereco: string;
  idUsuario: string | null;
}

export interface Usuario {
  id: string;
  email: string;
  permissions: string[];
  jogadorId: string | null;
  administradorId: string | null;
}

export interface Quadra {
  id: string;
  nome: string;
  descricao: string;
  horarioAbertura: string;
  horarioFechamento: string;
  idEndereco: string;
  idAdministrador: string;
  imagens: string[];
}

export interface Reserva {
  id: string;
  idQuadra: string;
  idJogador: string;
  horarioInicio: string;
  horarioFim: string;
}
