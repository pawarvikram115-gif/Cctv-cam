export default {
  async fetch(request) {
    const html = `<!DOCTYPE html>
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
h1{
  padding:20px;
}
button{
  display:block;
  width:90%;
  max-width:400px;
  margin:20px auto;
  padding:20px;
  border:0;
  border-radius:15px;
  font-size:22px;
  font-weight:bold;
}
.camera{
  background:#2196f3;
  color:white;
}
.viewer{
  background:#4caf50;
  color:white;
}
video{
  width:95%;
  max-width:800px;
  margin-top:20px;
  background:#000;
  border-radius:12px;
}
#status{
  margin:20px;
  font-size:18px;
}
</style>
</head>

<body>

<h1>📷 CCTV CAMERA</h1>

<div id="menu">
  <button class="camera" onclick="startCamera()">
    📷 CAMERA
  </button>

  <button class="viewer" onclick="startViewer()">
    📺 VIEWER
  </button>
</div>

<div id="camera" style="display:none">
  <button onclick="goBack()">← BACK</button>
  <div id="status">Starting camera...</div>
  <video id="cameraVideo" autoplay muted playsinline></video>
</div>

<div id="viewer" style="display:none">
  <button onclick="goBack()">← BACK</button>
  <div id="viewerStatus">
    📺 Viewer ready
  </div>
  <video id="viewerVideo" autoplay playsinline controls></video>
</div>

<script>

let cameraStream = null;

function startCamera(){

  document.getElementById("menu").style.display="none";
  document.getElementById("camera").style.display="block";

  navigator.mediaDevices.getUserMedia({
    video:{
      facingMode:{
        ideal:"environment"
      },
      width:{
        ideal:1280
      },
      height:{
        ideal:720
      }
    },
    audio:true
  })
  .then(function(stream){

    cameraStream = stream;

    document.getElementById("cameraVideo").srcObject = stream;

    document.getElementById("status").innerHTML =
      "🟢 CAMERA ACTIVE";

  })
  .catch(function(error){

    document.getElementById("status").innerHTML =
      "❌ Camera permission required";

    console.log(error);

  });
}

function startViewer(){

  document.getElementById("menu").style.display="none";
  document.getElementById("viewer").style.display="block";

  document.getElementById("viewerStatus").innerHTML =
    "📺 VIEWER READY<br><br>" +
    "WebRTC connection will be added next.";

}

function goBack(){

  if(cameraStream){

    cameraStream.getTracks().forEach(function(track){
      track.stop();
    });

    cameraStream=null;
  }

  document.getElementById("cameraVideo").srcObject=null;

  document.getElementById("menu").style.display="block";
  document.getElementById("camera").style.display="none";
  document.getElementById("viewer").style.display="none";
}

</script>

</body>
</html>`;

    return new Response(html, {
      headers: {
        "content-type": "text/html; charset=UTF-8"
      }
    });
  }
};
