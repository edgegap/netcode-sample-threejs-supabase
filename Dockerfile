# Game server image: one container = one Sumo Push match on Edgegap.
#   docker build --platform linux/amd64 -t registry.edgegap.com/<project>/sumo-supabase:<tag> .
#   docker run --rm -p 7777:7777 -e SUPABASE_URL=https://<ref>.supabase.co registry.edgegap.com/<project>/sumo-supabase:<tag>
FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production PORT=7777
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY server ./server
COPY game/server.js ./game/server.js
# Internal port. The app version maps it as "gameport", protocol WS, TLS Upgrade on.
EXPOSE 7777/tcp
USER node
# Node is PID 1, so it receives Edgegap's SIGTERM directly.
CMD ["node", "server/main.js"]
