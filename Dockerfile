# Imagen de la app (Next.js + Prisma). Build y runtime en una sola etapa:
# mantiene node_modules completo para poder correr `prisma migrate deploy` al
# arrancar el contenedor. Simple y confiable para self-hosting.
FROM node:22-alpine

# Prisma en Alpine necesita openssl.
RUN apk add --no-cache openssl
RUN corepack enable

WORKDIR /app

# Deps primero (mejor caché).
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Código.
COPY . .

# Las NEXT_PUBLIC_* se HORNEAN en el bundle durante `next build`: deben estar
# presentes acá, no solo en runtime. Se pasan como build args desde compose.
ARG NEXT_PUBLIC_BETTER_AUTH_URL
ARG NEXT_PUBLIC_VAPID_PUBLIC_KEY
ENV NEXT_PUBLIC_BETTER_AUTH_URL=$NEXT_PUBLIC_BETTER_AUTH_URL
ENV NEXT_PUBLIC_VAPID_PUBLIC_KEY=$NEXT_PUBLIC_VAPID_PUBLIC_KEY

RUN pnpm prisma generate && pnpm build

ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

# Aplica migraciones pendientes y arranca. `migrate deploy` es idempotente:
# no hace nada si la base ya está al día.
CMD ["sh", "-c", "pnpm prisma migrate deploy && pnpm start"]
