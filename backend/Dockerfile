FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src

# the pipeline passes the git commit here so /health can report it
ARG APP_VERSION=dev
ENV APP_VERSION=$APP_VERSION
ENV NODE_ENV=production

EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s \
  CMD wget -qO- http://localhost:${PORT:-5000}/health || exit 1

USER node
CMD ["node", "src/server.js"]
