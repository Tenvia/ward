# Build from the repo root: docker build -f examples/docker-agent/Dockerfile -t ward-example-agent .
FROM node:22-alpine
WORKDIR /app
COPY tsconfig.base.json ./
COPY examples/docker-agent/package.json examples/docker-agent/
WORKDIR /app/examples/docker-agent
RUN npm install
COPY examples/docker-agent/tsconfig.json ./
COPY examples/docker-agent/src ./src
ENV WARD_BASE_URL=http://host.docker.internal:4317
CMD ["npm", "run", "start"]
