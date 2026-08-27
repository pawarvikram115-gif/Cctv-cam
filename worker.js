import { DurableObject } from "cloudflare:workers";

const HTML = `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>CCTV Camera</title>
<style>
body{
  margin:0;
  background:#111;
  color:white;
  font-family:Arial,sans-serif;
  text-align:center;
}
h1{font-size:34px;margin:35px 0}
button{
  display:block;
  width:85%;
  max-width:600px;
  margin:20px auto;
  padding:25px;
  border:0;
  border-radius:20px;
  font-size:28px;
  font-weight:bold;
  color:white;
  background:#2196f3;
}
input{
  width:80%;
  max-width:500px;
  padding:18px;
  border-radius:12px;
  border:0;
  font-size:20px;
  text-align:center;
}
video{
  width:92%;
  max-width:900px;
  background:#000;
  border-radius:15px;
  margin-top:20px;
}
.status{
  font-size:20px;
  margin:20px;
  color:#00ff66;
}
.back{background:#555;font-size:22px}
</style>
</head>
<body>

<h1>📹 CCTV CAMERA</h1>

<input id="room" value="main-room" placeholder="Room ID">

<button onclick="startCamera()">📷 CAMERA</button>
<button onclick="startViewer()">📺 VIEWER</button>

<div id="status" class="status"></div>
<video id="video" autoplay playsinline controls></video>

<script>
const video = document.getElementById("video");
const statusBox = document.getElementById("status");

function status(t){
  statusBox.innerText=t;
}

function room(){
  return document.getElementById("room").value.trim() || "main-room";
}

function waitIce(pc){
  return new Promise(resolve=>{
    if(pc.iceGatheringState==="complete"){
      resolve();
      return;
    }
    pc.addEventListener("icegatheringstatechange",()=>{
      if(pc.iceGatheringState==="complete") resolve();
    });
  });
}

async function startCamera(){

  try{

    status("📷 Camera permission मागत आहे...");

    const stream = await navigator.mediaDevices.getUserMedia({
      video:{
        facingMode:{ideal:"environment"},
        width:{ideal:1280},
        height:{ideal:720}
      },
      audio:true
    });

    video.srcObject=stream;
    video.muted=true;

    status("📷 Camera चालू आहे... Viewer ची वाट पाहत आहे.");

    const pc = new RTCPeerConnection({
      iceServers:[
        {urls:"stun:stun.l.google.com:19302"},
        {urls:"stun:stun.cloudflare.com:3478"}
      ]
    });

    stream.getTracks().forEach(track=>{
      pc.addTrack(track,stream);
    });

    const offer=await pc.createOffer();
    await pc.setLocalDescription(offer);

    await waitIce(pc);

    await fetch("/signal/"+encodeURIComponent(room())+"/offer",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify(pc.localDescription)
    });

    status("🟢 CAMERA READY — Viewer connect होण्याची वाट पाहत आहे.");

    let connected=false;

    while(!connected){

      await new Promise(r=>setTimeout(r,1500));

      const r=await fetch(
        "/signal/"+encodeURIComponent(room())+"/answer"
      );

      if(r.ok){

        const answer=await r.json();

        if(answer && !pc.currentRemoteDescription){

          await pc.setRemoteDescription(answer);

          status("🟢 LIVE — Camera Viewer ला दिसत आहे.");
          connected=true;
        }
      }
    }

    pc.onconnectionstatechange=()=>{
      status("Camera: "+pc.connectionState);
    };

  }catch(e){
    status("❌ Camera Error: "+e.message);
  }
}

async function startViewer(){

  try{

    status("📺 Camera शोधत आहे...");

    const pc=new RTCPeerConnection({
      iceServers:[
        {urls:"stun:stun.l.google.com:19302"},
        {urls:"stun:stun.cloudflare.com:3478"}
      ]
    });

    pc.ontrack=e=>{
      if(e.streams && e.streams[0]){
        video.srcObject=e.streams[0];
        video.play().catch(()=>{});
        status("🟢 LIVE CCTV");
      }
    };

    pc.onconnectionstatechange=()=>{
      status("Viewer: "+pc.connectionState);
    };

    let offer=null;

    while(!offer){

      await new Promise(r=>setTimeout(r,1000));

      const r=await fetch(
        "/signal/"+encodeURIComponent(room())+"/offer"
      );

      if(r.ok){
        offer=await r.json();
      }
    }

    await pc.setRemoteDescription(offer);

    const answer=await pc.createAnswer();

    await pc.setLocalDescription(answer);

    await waitIce(pc);

    await fetch("/signal/"+encodeURIComponent(room())+"/answer",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify(pc.localDescription)
    });

    status("📺 Connecting to camera...");

  }catch(e){
    status("❌ Viewer Error: "+e.message);
  }
}
</script>

</body>
</html>`;

export class CctvRoom extends DurableObject {

  constructor(ctx, env) {
    super(ctx, env);
    this.ctx = ctx;
    this.env = env;
  }

  async fetch(request) {

    const url = new URL(request.url);
    const path = url.pathname;

    if(request.method === "POST" && path.endsWith("/offer")){

      const offer = await request.json();

      await this.ctx.storage.put("offer", offer);
      await this.ctx.storage.delete("answer");

      return new Response("OK");
    }

    if(request.method === "GET" && path.endsWith("/offer")){

      const offer = await this.ctx.storage.get("offer");

      if(!offer){
        return new Response("Not ready",{status:404});
      }

      return Response.json(offer);
    }

    if(request.method === "POST" && path.endsWith("/answer")){

      const answer = await request.json();

      await this.ctx.storage.put("answer", answer);

      return new Response("OK");
    }

    if(request.method === "GET" && path.endsWith("/answer")){

      const answer = await this.ctx.storage.get("answer");

      if(!answer){
        return new Response("Not ready",{status:404});
      }

      return Response.json(answer);
    }

    if(path.endsWith("/reset")){

      await this.ctx.storage.deleteAll();

      return new Response("Room reset");
    }

    return new Response("CCTV Room OK");
  }
}

export default {

  async fetch(request, env) {

    const url = new URL(request.url);

    // Main screen
    if(url.pathname === "/" || url.pathname === ""){

      return new Response(HTML,{
        headers:{
          "Content-Type":"text/html;charset=UTF-8"
        }
      });
    }

    // Camera / Viewer signal
    if(url.pathname.startsWith("/signal/")){

      const parts=url.pathname.split("/");

      const roomName=decodeURIComponent(parts[2] || "main-room");

      const id=env.CCTV_ROOM.idFromName(roomName);

      const room=env.CCTV_ROOM.get(id);

      return room.fetch(request);
    }

    return new Response("Not Found",{status:404});
  }
};
