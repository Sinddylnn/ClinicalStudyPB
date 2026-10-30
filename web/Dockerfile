# syntax=docker/dockerfile:1

# <-------------------DEPENDÊNCIAS DA WEB------------------->
# Mesma versão indicada em .nvmrc
FROM node:24.22.0-bookworm-slim
RUN mkdir -p /app && chown node:node /app
WORKDIR /app
USER node
COPY --chown=node:node package.json package-lock.json ./
RUN --mount=type=cache,target=/home/node/.npm,uid=1000,gid=1000 npm ci

# <-------------------SERVIDOR LOCAL DO VITE------------------->
# Código incluído na imagem para uma execução reproduzível após o build
COPY --chown=node:node . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173", "--strictPort"]
