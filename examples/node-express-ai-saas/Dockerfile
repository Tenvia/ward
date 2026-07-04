# Build from the repo root: docker build -f examples/node-express-ai-saas/Dockerfile .
FROM node:22-alpine
WORKDIR /app
COPY tsconfig.base.json ./
COPY examples/node-express-ai-saas/package.json examples/node-express-ai-saas/
WORKDIR /app/examples/node-express-ai-saas
RUN npm install
COPY examples/node-express-ai-saas/tsconfig.json ./
COPY examples/node-express-ai-saas/src ./src
ENV PORT=4401
EXPOSE 4401
CMD ["npm", "run", "start"]
