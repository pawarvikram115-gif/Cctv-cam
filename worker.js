import { DurableObject } from "cloudflare:workers";

export class CctvRoom extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.ctx = ctx;
  }

  async fetch(request) {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("WebSocket required", { status: 426 });
    }

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];

    this.ctx.acceptWebSocket(server);

    return new Response(null, {
      status: 101,
      webSocket: client
    });
  }

  webSocketMessage(ws, message) {
    const sockets = this.ctx.getWebSockets();

    for (const socket of sockets) {
      if (socket !== ws) {
        try {
          socket.send(message);
        } catch {}
      }
    }
  }

  webSocketClose(ws) {
    try {
      ws.close();
    } catch {}
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/signal") {
      const room = url.searchParams.get("room") || "default";

      const id = env.CCTV_ROOM.idFromName(room);
      const stub = env.CCTV_ROOM.get(id);

      return stub.fetch(request);
    }

    return new Response("CCTV WebRTC Server OK");
  }
};
