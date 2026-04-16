# Build stage
FROM --platform=linux/arm64 node:22-slim AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# Production stage
FROM --platform=linux/arm64 node:22-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY --from=builder /app/dist/ ./dist/
ENV PORT=8000
ENV HOST=0.0.0.0
EXPOSE 8000
CMD ["node", "dist/index.js"]
