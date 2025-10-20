# Build stage
FROM node:18-alpine AS builder

# Instalar dependências do sistema necessárias
RUN apk add --no-cache libc6-compat

# Definir diretório de trabalho
WORKDIR /app

# Copiar arquivos de dependências
COPY package.json pnpm-lock.yaml ./

# Instalar pnpm
RUN npm install -g pnpm

# Instalar dependências (incluindo devDependencies para o build)
RUN pnpm install --frozen-lockfile

# Copiar código fonte
COPY . .

# Build da aplicação
RUN pnpm run build

# Remover devDependencies
RUN pnpm prune --prod

# Production stage
FROM node:18-alpine AS runner

# Criar usuário não-root para segurança
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

# Definir diretório de trabalho
WORKDIR /app

# Copiar dependências de produção do builder
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules

# Copiar código compilado
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist

# Copiar arquivos estáticos (HTML, CSS, JS)
COPY --from=builder --chown=nestjs:nodejs /app/src/views/public ./src/views/public

# Copiar package.json para referência
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./

# Mudar para usuário não-root
USER nestjs

# Expor porta padrão
EXPOSE 3000

# Definir variável de ambiente para produção
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Comando para iniciar a aplicação
CMD ["node", "dist/main.js"]
