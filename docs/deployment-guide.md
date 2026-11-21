# Deployment

## Docker Compose (single host)
```bash
cp .env.example .env     # set strong POSTGRES_PASSWORD and JWT_SECRET; set SPRING_PROFILES_ACTIVE=prod
docker compose --env-file .env up -d --build
```
Services: `postgres` (volume `pgdata`, healthcheck), `backend` (waits for healthy DB, healthcheck on `/actuator/health`), `frontend` (nginx serving the SPA and proxying `/api` and `/files` to the backend, so cookies are same-origin), `mailpit` (dev SMTP sink; remove in production).

## Production checklist
- `SPRING_PROFILES_ACTIVE=prod`: no demo seed, no payment simulation, refresh cookie `Secure`.
- Terminate TLS in front of nginx (load balancer / Caddy / cloud ingress). The `Secure` cookie requires HTTPS.
- `JWT_SECRET` >= 32 random bytes (`openssl rand -base64 48`); keep all secrets in the platform's secret store, never in git.
- Set `APP_CORS_ALLOWED_ORIGINS` to the real origin(s); with the bundled nginx proxy CORS is not needed.
- Real SMTP via `MAIL_*`. Back up the Postgres volume. Persist `/data/uploads` (or swap `FileStorage` for S3).
- Multiple backend instances: replace the in-memory rate limiter; the expiry job is already safe to run concurrently.

## Hosting options
Backend + Postgres: Render, Railway, Fly.io, or a VM with Compose. Frontend: the nginx image, or `npm run build` and any static host with `/api` proxied.

## CI
`.github/workflows/ci.yml`: backend `mvn verify` (Testcontainers), frontend `npm ci && npm test && npm run build`, then Docker image builds.
