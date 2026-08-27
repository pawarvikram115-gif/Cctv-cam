import { DurableObject } from "cloudflare:workers";

export class CctvRoom extends DurableObject {
  async fetch(request) {
    return new Response("CCTV Room OK");
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/room") {
      const id = env.CCTV_ROOM.idFromName("main-room");
      const room = env.CCTV_ROOM.get(id);
      return room.fetch(request);
    }

    return new Response(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <title>CCTV Camera</title>
        <style>
          body {
            margin: 0;
            background: #111;
            color: white;
            font-family: Arial, sans-serif;
            text-align: center;
          }
          h1 {
            padding: 20px;
          }
          button {
            display: block;
            width: 80%;
            max-width: 500px;
            margin: 20px auto;
            padding: 25px;
            font-size: 24px;
            border: 0;
            border-radius: 15px;
            background: #2196f3;
            color: white;
          }
        </style>
      </head>
      <body>
        <h1>📷 CCTV CAMERA</h1>
        <button onclick="location.href='/camera'">📷 CAMERA</button>
        <button onclick="location.href='/viewer'">📺 VIEWER</button>
      </body>
      </html>
    `, {
      headers: {
        "content-type": "text/html;charset=UTF-8"
      }
    });
  }
};
