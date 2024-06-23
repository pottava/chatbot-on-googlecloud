FROM node:20-slim AS base
RUN npm install -g pnpm
WORKDIR /app
COPY package.json .
COPY pnpm-lock.yaml .
RUN pnpm install --frozen-lockfile

# FROM gcr.io/distroless/nodejs20-debian12:nonroot
FROM node:20-slim
WORKDIR /app
COPY --from=base --chown=node:node /app/node_modules ./node_modules
COPY . .
ENV VAIS_LOCATION="global" \
    VAIS_SUMMARY_MODEL="gemini-1.0-pro-002/answer_gen/v1" \
    VAIS_SERVER_CONFIG="default_config" \
    VAIS_COLLECTION_ID="default_collection" \
    VAIS_DATASTORE_ID="" \
    BQ_DATASET_ID="" \
    BQ_TABLE_ID="qna" \
    GOOGLE_CLOUD_PROJECT=""
# USER nonroot
USER node
# ENTRYPOINT ["/nodejs/bin/node", "index.js"]
ENTRYPOINT ["node", "index.js"]
