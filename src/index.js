import { DurableObject } from "cloudflare:workers";

export class NobarRoomDO extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
  }

  async fetch(request) {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Nobar Room aktif");
    }

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];

    this.ctx.acceptWebSocket(server);

    server.send(JSON.stringify({
      type: "connected",
      message: "Berhasil terhubung ke ZarStream Nobar"
    }));

    return new Response(null, {
      status: 101,
      webSocket: client
    });
  }

  async webSocketMessage(ws, message) {
    for (const socket of this.ctx.getWebSockets()) {
      try {
        socket.send(
          typeof message === "string"
            ? message
            : new TextDecoder().decode(message)
        );
      } catch (error) {
        console.error(error);
      }
    }
  }

  async webSocketClose(ws, code, reason, wasClean) {
    console.log("WebSocket ditutup:", code, reason, wasClean);
  }

  async webSocketError(ws, error) {
    console.error("WebSocket error:", error);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/room/")) {
      const roomName = url.pathname
        .slice("/room/".length)
        .trim();

      if (!roomName) {
        return new Response("Room ID kosong", {
          status: 400
        });
      }

      const id = env.NOBAR_ROOM.idFromName(roomName);
      const room = env.NOBAR_ROOM.get(id);

      return room.fetch(request);
    }

    return new Response("ZarStream Nobar Realtime aktif");
  }
};
