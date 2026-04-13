# Client Layer Map

Client-side shared code and UX utilities live here:

- `client/api` centralized Axios access and API service functions
- `client/theme` theme mode provider (system, light, dark)

UI route pages continue to be in Next.js `app/**` and consume these shared client utilities.
