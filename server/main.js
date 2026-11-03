// Game server entry point: one process runs one Sumo Push match.
//   SUPABASE_URL=https://<ref>.supabase.co node server/main.js
// It listens for WebSocket connections on PORT (default 7777). On Edgegap the app version maps
// that port as "gameport" with TLS Upgrade, so browsers connect with wss://<fqdn>:<external port>.

import http from "node:http";
import { WebSocketServer } from "ws";
import { Room } from "./room.js";
import { describeDeployment, log, onEdgegap, selfStop } from "./edgegap.js";
import { supabaseEnabled } from "./supabase.js";
import { createGame } from "../game/server.js";

const gameName = "sumo";
const room = new Room(createGame());

const port = Number(process.env.PORT ?? 7777);
const server = http.createServer((req, res) => {
  // Plain HTTP answers with a status line: handy for curl and for Edgegap's port check.
  res.writeHead(200, { "content-type": "text/plain" });
  res.end(`${gameName} ${room.phase} ${room.humans().length} player(s)\n`);
});
new WebSocketServer({ server }).on("connection", (ws) => room.accept(ws));
server.listen(port, () => {
  log(`${gameName} server listening on :${port}`);
  log(describeDeployment());
  log(supabaseEnabled ? `supabase: players sign in with ${process.env.SUPABASE_URL}` : "supabase: off (SUPABASE_URL not set), anyone can join");
});

// Edgegap sends SIGTERM when the deployment stops (self-stop, dashboard, API or max duration).
for (const sig of ["SIGTERM", "SIGINT"]) {
  process.on(sig, () => {
    log(`${sig}: closing`);
    for (const p of room.humans()) p.ws?.close(1001, "server stopping");
    setTimeout(() => process.exit(0), 200);
  });
}
if (onEdgegap) process.on("uncaughtException", (err) => (console.error(err), selfStop("crash")));
