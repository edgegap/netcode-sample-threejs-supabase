#!/usr/bin/env node
// Local test, no Supabase and no Edgegap: starts the game server with short timers, plays a full
// match with two headless players and checks the phases and the result.
//   node tools/test-local.mjs
// Against a running container instead: TEST_URL=ws://localhost:7777 node tools/test-local.mjs

import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { playSession } from "./lib/bot.mjs";

const root = resolve(import.meta.dirname, "..");
let server = null;
let url = process.env.TEST_URL;
if (!url) {
  url = "ws://127.0.0.1:7790";
  const env = { ...process.env, PORT: "7790", WAIT_SECONDS: "2", COUNTDOWN_SECONDS: "1", RESULTS_SECONDS: "1", MATCH_SECONDS: "40" };
  delete env.SUPABASE_URL; // anyone can join without Supabase
  server = spawn(process.execPath, ["server/main.js"], { cwd: root, env });
  server.stderr.on("data", (d) => process.stderr.write(d));
  await new Promise((r) => setTimeout(r, 400));
}

const until = (rep) => rep.phases.includes("over") && rep.result;
const t0 = Date.now();
const reports = await Promise.all(["alice", "bob"].map((name) => playSession({ url, name, maxSeconds: 90, until })));
server?.kill();

const problems = [];
for (const r of reports) {
  if (r.error) problems.push(`${r.name}: ${r.error}`);
  for (const p of ["waiting", "countdown", "playing", "over"]) if (!r.phases.includes(p)) problems.push(`${r.name}: never saw ${p}`);
  if (!r.result?.winner) problems.push(`${r.name}: no result`);
}
const { result, players, states } = reports[0];
console.log(
  `${problems.length ? "FAIL" : "PASS"} sumo ${((Date.now() - t0) / 1000).toFixed(1)}s, ${players.length} players ` +
    `(${players.filter((p) => p.bot).length} bots), ${states} states, result: ${result?.winner ?? "-"}`
);
for (const p of problems) console.log(`     - ${p}`);
process.exit(problems.length ? 1 : 0);
