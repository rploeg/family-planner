FROM node:20-bookworm-slim

# Build arguments for version tracking
ARG BUILD_COMMIT=unknown
ARG BUILD_DATE=unknown

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . ./

ENV NODE_ENV=production
ENV BUILD_COMMIT=${BUILD_COMMIT}
ENV BUILD_DATE=${BUILD_DATE}
EXPOSE 3002

CMD ["node", "server.js"]