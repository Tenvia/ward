# Build from the repo root: docker build -f apps/api/Dockerfile .
#
# Multi-stage: stage 1 builds the Control Room (Node/Vite is internal
# build tooling only — users never run npm); stage 2 is the runtime
# image, which serves the API and the bundled Control Room on one port.

FROM node:22-alpine AS ui-build
WORKDIR /app
COPY tsconfig.base.json ./
COPY apps/control-room/package.json apps/control-room/
WORKDIR /app/apps/control-room
RUN npm install
COPY apps/control-room/tsconfig.json apps/control-room/vite.config.ts apps/control-room/index.html ./
COPY apps/control-room/src ./src
RUN npm run build

FROM node:22-alpine
LABEL org.opencontainers.image.source="https://github.com/jenksed/ward"
LABEL org.opencontainers.image.description="Ward tenant containment API and bundled Control Room"
LABEL org.opencontainers.image.licenses="UNLICENSED"
WORKDIR /app
COPY tsconfig.base.json ./
COPY apps/api/package.json apps/api/
WORKDIR /app/apps/api
RUN npm install
COPY apps/api/tsconfig.json ./
COPY apps/api/src ./src
COPY --from=ui-build /app/apps/control-room/dist ./ui
COPY openapi ./openapi
ENV PORT=4317
ENV WARD_UI_DIR=ui
EXPOSE 4317
CMD ["npm", "run", "start"]
