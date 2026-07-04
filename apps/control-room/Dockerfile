# Build from the repo root: docker build -f apps/control-room/Dockerfile .
FROM node:22-alpine
WORKDIR /app
COPY tsconfig.base.json ./
COPY apps/control-room/package.json apps/control-room/
WORKDIR /app/apps/control-room
RUN npm install
COPY apps/control-room/tsconfig.json apps/control-room/vite.config.ts apps/control-room/index.html ./
COPY apps/control-room/src ./src
RUN npm run build
EXPOSE 5173
CMD ["npm", "run", "preview"]
