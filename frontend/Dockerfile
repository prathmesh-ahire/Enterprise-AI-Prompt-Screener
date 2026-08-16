# todo.md Phase 33.3 - multi-stage build. VITE_API_BASE_URL is a build ARG, not a runtime
# environment variable: Vite bakes import.meta.env.* into the static bundle at build time,
# so a docker-compose `environment:` entry at container start would have no effect (see the
# Tech Stack Note in todo.md). Served with `serve`, a lightweight static file server, since
# the output is a plain static SPA build with no server-side logic.
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN npm run build

FROM node:20-alpine
WORKDIR /app
RUN npm install -g serve
COPY --from=build /app/dist ./dist
EXPOSE 5173
CMD ["serve", "-s", "dist", "-l", "5173"]
