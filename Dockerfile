FROM oven/bun:1 as builder
WORKDIR /app

COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

# Stage 2: Produção (Imagem menor)
FROM oven/bun:1-alpine
WORKDIR /app

# Copia apenas o necessário do build anterior
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./

ENV NODE_ENV=production

# Comando para rodar a aplicação usando o Bun
CMD ["bun", "run", "dist/main.js"]