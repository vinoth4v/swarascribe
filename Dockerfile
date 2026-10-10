# Self-hosted build (Coolify): the static app plus its /api functions on a small Node server (deploy/server.mjs).
FROM node:24-bookworm-slim
ENV NODE_ENV=production PORT=3000
WORKDIR /app
COPY . /app
ARG SUPABASE_URL
ARG SUPABASE_ANON_KEY
RUN SUPABASE_URL="$SUPABASE_URL" SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY" node deploy/use-supabase.mjs /app/index.html \
 && rm -rf /app/test /app/tools /app/*.pptx /app/*.pdf /app/.git
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD node -e "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node","/app/deploy/server.mjs"]
