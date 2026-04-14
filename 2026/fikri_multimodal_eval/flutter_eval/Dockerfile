# Stage 1 — Flutter web builder
FROM ghcr.io/cirruslabs/flutter:3.41.0 AS builder
WORKDIR /app

# Cache pub dependencies separately from source
COPY pubspec.yaml pubspec.lock ./
RUN flutter pub get

# Build release web app
COPY . .
RUN flutter build web --release --no-tree-shake-icons

# Stage 2 — Nginx alpine static server
FROM nginx:alpine
COPY --from=builder /app/build/web /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
