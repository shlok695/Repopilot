FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG VITE_API_BASE_URL=
ARG VITE_MOCK_API=false
ARG VITE_APP_TITLE=RepoPilot
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_MOCK_API=$VITE_MOCK_API
ENV VITE_APP_TITLE=$VITE_APP_TITLE

RUN npm run build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
