# Deploy en servidor propio (Docker + Postgres + Caddy)

Stack: la app Next.js, PostgreSQL y Caddy (reverse proxy con HTTPS automático),
todo orquestado con `docker compose`.

## Requisitos

- Un servidor Linux con **Docker** y **docker compose**.
- Un **dominio** apuntando (registro A) a la IP del server.
  > HTTPS es obligatorio: las notificaciones push y el service worker no
  > funcionan sin un dominio con TLS (salvo en `localhost`).

## Pasos

```bash
# 1. Clonar
git clone https://github.com/EzequielVyG/Loyalty.git /opt/loyalty
cd /opt/loyalty

# 2. Configurar variables
cp .env.example .env
nano .env        # completá DOMAIN, PUBLIC_URL, passwords, secreto y claves VAPID

#    - Secreto de auth:  openssl rand -base64 32
#    - Claves VAPID:      npx web-push generate-vapid-keys

# 3. Levantar (build + migraciones + arranque)
docker compose up -d --build
```

Caddy saca el certificado TLS solo en el primer arranque. En un minuto la app
queda en `https://tudominio.com`. El primer comercio/usuario se crea desde
`/signup`.

## Operación

```bash
docker compose logs -f app        # ver logs de la app
docker compose ps                 # estado
docker compose down               # detener (los datos quedan en el volumen)
```

## Actualizar a una versión nueva

```bash
cd /opt/loyalty
git pull
docker compose up -d --build      # re-buildea y aplica migraciones nuevas
```

Las migraciones de Prisma corren solas al arrancar (`prisma migrate deploy`,
idempotente). Los datos de Postgres viven en el volumen `dbdata` y sobreviven a
los `down`/`up` y actualizaciones.

## Backups

```bash
docker compose exec db pg_dump -U loyalty loyalty > backup_$(date +%F).sql
```

## Nota: NEXT_PUBLIC_* se hornean en el build

`NEXT_PUBLIC_BETTER_AUTH_URL` y `NEXT_PUBLIC_VAPID_PUBLIC_KEY` se incrustan en el
bundle del cliente **durante el build**. El `docker-compose.yml` ya los pasa como
build args desde `PUBLIC_URL` y `VAPID_PUBLIC_KEY`. Si cambiás el dominio o la
clave pública VAPID, hay que **re-buildear** (`docker compose up -d --build`), no
alcanza con reiniciar.
