import "dotenv/config";
import http from "http";
import { WebSocketServer } from "ws";
import { createApp } from "./app";
import { attachVoiceSessionServer } from "./ws/voiceSession";

const port = Number(process.env.PORT ?? 4000);

const app = createApp();
const server = http.createServer(app);

const wss = new WebSocketServer({ server, path: "/ws/tutor" });
attachVoiceSessionServer(wss);

server.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
  console.log(`Voice WebSocket available at ws://localhost:${port}/ws/tutor`);
});
