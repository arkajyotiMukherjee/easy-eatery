FROM node:24-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci && npm cache clean --force
COPY tsconfig.json ./
COPY apps ./apps
COPY migrations ./migrations
COPY scripts ./scripts
ENV HOST=0.0.0.0
ENV PORT=8080
USER node
EXPOSE 8080
# Simulation/test-account deployment only. ADMIN_TOKEN is required at runtime.
CMD ["npm", "start"]
