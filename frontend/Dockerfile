FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
ARG VITE_API_BASE_URL=/api/v1
ARG VITE_BACKEND_ROOT_URL=
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_BACKEND_ROOT_URL=${VITE_BACKEND_ROOT_URL}

RUN npm run build

FROM nginx:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=20s --timeout=5s --retries=6 --start-period=20s CMD wget -qO- http://127.0.0.1/ >/dev/null 2>&1 || exit 1
