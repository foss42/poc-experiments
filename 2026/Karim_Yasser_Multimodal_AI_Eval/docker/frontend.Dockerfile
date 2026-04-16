FROM ghcr.io/cirruslabs/flutter:stable AS builder
WORKDIR /app

# Switch to root to perform chown later if needed, but flutter expects to run as 'flutter' or 'cirrus'
COPY frontend /app/

# Build Flutter Web App
RUN flutter pub get
RUN flutter build web --release

# Serve with Nginx
FROM nginx:alpine
RUN rm -rf /usr/share/nginx/html/*
COPY --from=builder /app/build/web /usr/share/nginx/html

# Update nginx config to handle SPA routing if necessary
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
