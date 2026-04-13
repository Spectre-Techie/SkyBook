# Server Layer Map

This project uses Next.js App Router (integrated full-stack), so backend code lives in:

- `app/api` for HTTP route handlers
- `lib` for server business logic (auth, db, validation, serializers)

The `server` folder is a logical boundary to keep architecture explicit for teams that expect `client` and `server` structure.

Current backend source of truth remains:

- `app/api/**`
- `lib/**`
