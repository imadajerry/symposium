# Multi-stage Dockerfile for React Vite Frontend
# Build Stage
FROM node:20-alpine AS build
WORKDIR /app

# Cache dependencies
COPY package*.json ./
RUN npm ci

# Copy sources
COPY . .

# Build argument allowing custom API URL (defaults to relative /api for reverse proxy)
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# Runtime Stage (Nginx)
FROM nginx:alpine
WORKDIR /usr/share/nginx/html

# Clean default nginx files
RUN rm -rf ./*

# Copy built frontend assets
COPY --from=build /app/dist .

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
