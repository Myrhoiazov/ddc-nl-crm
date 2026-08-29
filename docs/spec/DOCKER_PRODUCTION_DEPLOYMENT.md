# Docker Production Deployment Specification

Status: **active production specification**.

`ddc-nl` runs on one live Docker Compose stack on the VPS. This repository has one production
deploy path: Docker Compose.

## Live Stack

```text
host: root@SERVER_IP
path: /var/www/project/ddc_nl_docker_prod
domain: https://ddc-nl.example.com
```

Containers:

```text
ddc-nl-client-live
ddc-nl-backend-live
ddc-nl-mysql-live
ddc-nl-redis-live
```

Ports:

```text
frontend 3030 -> 80
backend  38080 -> 8080
mysql    127.0.0.1:33062 -> 3306
redis    127.0.0.1:16381 -> 6379
```

## Deploy Contract

Production deploy command:

```bash
npm run deploy
```

`npm run deploy:docker` is an alias for the same production command.

The deploy script must:

1. sync the current repository to `/var/www/project/ddc_nl_docker_prod`;
2. preserve `.env`, uploads, build output, logs and dependency directories;
3. verify that remote `.env` contains the production live container names and ports;
4. run `docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d`;
5. verify backend health and frontend HTTP status.

## Nginx Contract

Host nginx terminates TLS with:

```text
/etc/nginx/sites-available/ddc_nl
```

The tracked template is:

```text
deploy/nginx/ddc-nl.conf
```

Required proxy targets:

```text
/       -> http://127.0.0.1:3030
/api    -> http://127.0.0.1:38080
/upload -> http://127.0.0.1:38080
```

## Compose Contract

```text
docker-compose.yml       # MySQL, Redis, shared volumes/network
docker-compose.prod.yml  # frontend nginx + backend Node production services
```

`docker-compose.dev.yml` is only for local development.

## Required Production Env

Remote `/var/www/project/ddc_nl_docker_prod/.env` must keep these production values:

```text
FRONTEND_CONTAINER_NAME=ddc-nl-client-live
BACKEND_CONTAINER_NAME=ddc-nl-backend-live
DB_CONTAINER_NAME=ddc-nl-mysql-live
REDIS_CONTAINER_NAME=ddc-nl-redis-live
FRONTEND_PORT_PROD=3030
BACKEND_PORT_PROD=38080
DB_PORT=33062
REDIS_PORT=16381
CLIENT_API_URL_PROD=https://ddc-nl.example.com
CLIENT_URL_PROD=https://ddc-nl.example.com
PUBLIC_SITE_URL_PROD=https://talentcenter.example.com
COOKIE_NAME=sid
COOKIE_NAME_MOLLIE=mollie_sid
```

Secrets remain only in `.env` files and are not committed.
