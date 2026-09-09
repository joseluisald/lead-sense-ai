# ETAPA 1: Construção (Builder)
FROM oven/bun:1 AS builder
WORKDIR /app
COPY package.json bun.lockb* ./
RUN bun install
COPY . .

# Argumentos e variáveis de ambiente no build
ARG PUBLIC_API_URL
ENV PUBLIC_API_URL=$PUBLIC_API_URL

RUN bun run build

# ETAPA 2: Execução (Runner para SSR)
FROM oven/bun:1-alpine
WORKDIR /app

# Copia apenas os arquivos necessários da etapa de build
COPY --from=builder /app/dist ./dist

# Configura as variáveis de ambiente necessárias para o servidor Astro
ENV HOST=0.0.0.0
ENV PORT=80

# Expõe a porta
EXPOSE 80

# Inicia o servidor SSR do Astro gerado na build
CMD ["bun", "./dist/server/entry.mjs"]