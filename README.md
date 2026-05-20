# Admin Dashboard (Next.js)

Frontend administrativo em Next.js para consumir o `Backend-Quadras`.

## Funcionalidades

Dashboard única com troca de conteúdo por operação:

- `Ver`
- `Cadastrar`
- `Alterar`
- `Apagar`

Módulos disponíveis:

- Administradores
- Usuários
- Quadras do administrador logado
- Reservas das quadras do administrador logado

## Stack

- Next.js (App Router)
- TypeScript
- CSS puro (sem dependência de framework)

## Como rodar

1. Instale dependências:

```bash
npm install
```

2. Crie o arquivo `.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3020
```

3. Inicie o projeto:

```bash
npm run dev
```

A aplicação abre em `http://localhost:3000` (ou próxima porta livre).

## Observações de integração

- Login usa `POST /auth/login`.
- O token JWT é enviado no header `Authorization: Bearer <token>`.
- Administradores usa `/administradores`.
- Usuários usa `/users`.
- Quadras usa `/quadras` com filtro por `idAdministrador`.
- Reservas usa `/reservas` e filtra pelas quadras do administrador.

Se algum endpoint do backend estiver com nome/payload diferente, ajuste o mapeamento em:

- `src/lib/api-client.ts`
