FROM node:24-bookworm-slim
WORKDIR /app
COPY --chown=node:node package.json package-lock.json ./
RUN --mount=type=secret,id=build_ca \
    if [ -f /run/secrets/build_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/build_ca; fi; \
    npm ci --no-audit --no-fund && npm cache clean --force
COPY --chown=node:node tsconfig.json ./
COPY --chown=node:node apps ./apps
COPY --chown=node:node migrations ./migrations
COPY --chown=node:node scripts ./scripts
ENV HOST=0.0.0.0
ENV PORT=8080
USER node
EXPOSE 8080
# Simulation/test-account deployment only. ADMIN_TOKEN is required at runtime.
CMD ["npm", "start"]
