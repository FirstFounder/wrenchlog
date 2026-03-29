# WrenchLog

WrenchLog is a self-hosted web application scaffold for running an automotive shop workflow with a React frontend, an Express API, and a PostgreSQL-backed data layer that is ready for future feature work.

## Prerequisites

- Node 22
- Docker
- Docker Compose

## Repository Access

Always clone and push using the SSH alias: `git@github.com-personal:FirstFounder/wrenchlog.git`

## Development Setup

```bash
git clone git@github.com-personal:FirstFounder/wrenchlog.git
npm install
cp .env.example .env
docker compose -f docker/compose.dev.yml up db -d
npm run dev
```

## Production Deploy on iolo (DS220+)

```bash
ssh philander@iolo
git clone git@github.com-personal:FirstFounder/wrenchlog.git ~/wrenchlog
cd ~/wrenchlog
cp .env.example .env   # edit values before proceeding
docker compose -f docker/compose.yml up -d
```

Caddy runs as separate infrastructure at `~/infra/caddy` on iolo. WrenchLog containers join the `caddy_proxy` network automatically. Add the reference snippet from `docker/Caddyfile` into `~/infra/caddy/Caddyfile` and reload with:

```bash
docker compose -f ~/infra/caddy/compose.yml exec caddy caddy reload --config /etc/caddy/Caddyfile
```
