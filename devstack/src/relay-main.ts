// Just the relay (no chain, no server): links the phone's built-in network to the web console on this laptop.
//   pnpm --dir devstack relay       then start the phone with EXPO_PUBLIC_API_URL=http://<this laptop's LAN IP>:8787
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { relayApp } from "./relay";
import { lanIp } from "./stack";

const port = Number(process.env.API_PORT ?? 8787);
const root = new Hono();
root.route("/dev/relay", relayApp());
serve({ fetch: root.fetch, port, hostname: "0.0.0.0" });
const lan = lanIp();
console.log(`ChainBrain relay on http://localhost:${port}${lan ? ` (phone: http://${lan}:${port})` : ""}`);
console.log(`  Phone:  EXPO_PUBLIC_API_URL=http://${lan ?? "<laptop-ip>"}:${port} npx expo start   (built-in network, linked)`);
console.log(`  Web:    pnpm --dir web dev   (the console finds the phone by itself)`);
