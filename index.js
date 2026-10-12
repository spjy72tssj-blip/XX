const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, delay, Browsers } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;

app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html><head><title>APPLE-MD Pair</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
body{background:#0a0a0a;color:#fff;font-family:sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0}
.card{background:#1a1a1a;padding:30px;border-radius:20px;width:90%;max-width:380px;text-align:center;border:1px solid #333}
input{width:92%;padding:14px;border-radius:10px;border:1px solid #333;background:#000;color:#fff;margin:15px 0;font-size:16px}
button{width:100%;padding:14px;border-radius:10px;border:none;background:#25D366;color:#000;font-weight:bold;font-size:16px;cursor:pointer}
#code{margin-top:20px;font-size:28px;letter-spacing:3px;color:#25D366;font-weight:bold}
</style></head>
<body>
<div class="card">
<h2>🍎 APPLE-MD</h2>
<p style="color:#aaa">Enter WhatsApp number with country code</p>
<input id="num" placeholder="2289XXXXXXXX" />
<button onclick="getCode()">Get Pair Code</button>
<div id="code"></div>
<p id="msg" style="font-size:13px;color:#888;margin-top:15px"></p>
</div>
<script>
async function getCode(){
  const n=document.getElementById('num').value;
  if(!n) return alert('Enter number');
  document.getElementById('msg').innerText='Generating... wait 15s';
  document.getElementById('code').innerText='';
  const res=await fetch('/pair?number='+n);
  const data=await res.json();
  if(data.code){document.getElementById('code').innerText=data.code;document.getElementById('msg').innerText='WhatsApp > Linked Devices > Link with phone number';}
  else{document.getElementById('msg').innerText=data.error||'Error, retry';}
}
</script>
</body></html>`);
});

app.get('/pair', async (req,res)=>{
  let num=(req.query.number||'').replace(/[^0-9]/g,'');
  if(!num) return res.json({error:'Enter number'});
  const dir='./auth_'+Date.now();
  fs.mkdirSync(dir);
  try{
    const { state, saveCreds } = await useMultiFileAuthState(dir);
    const sock=makeWASocket({auth:state,logger:pino({level:'silent'}),browser:Browsers.macOS('Safari'),printQRInTerminal:false});
    sock.ev.on('creds.update',saveCreds);
    if(!sock.authState.creds.registered){
      await delay(3000);
      const code=await sock.requestPairingCode(num);
      res.json({code});
    }else{res.json({error:'Already registered'});}
    setTimeout(()=>{try{fs.rmSync(dir,{recursive:true,force:true})}catch{}}, 60000);
  }catch(e){res.json({error:e.message}); try{fs.rmSync(dir,{recursive:true,force:true})}catch{}}
});

app.listen(PORT,()=>console.log('Running on '+PORT));
