FROM node:20-slim AS base
RUN npm install -g pnpm
WORKDIR /app
COPY package.json .
COPY pnpm-lock.yaml .
RUN pnpm install --frozen-lockfile

# FROM gcr.io/distroless/nodejs20-debian12:nonroot
FROM node:20-slim
WORKDIR /app
COPY --from=base --chown=nonroot:nonroot /app/node_modules ./node_modules
COPY . .
# USER nonroot
USER node
# ENTRYPOINT ["/nodejs/bin/node", "index.js"]
ENTRYPOINT ["node", "index.js"]
