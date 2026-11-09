const http=require('http'),https=require('https'),fs=require('fs'),path=require('path');
const root=path.join(__dirname,'dist'),port=Number(process.env.PORT||4201);
// Local DeepSeek key: DEEPSEEK_API_KEY, or the first line of deepseek-key.txt beside this file (git-ignored).
const keyFile=path.join(__dirname,'deepseek-key.txt');
const readKey=()=>{try{return fs.readFileSync(keyFile,'utf8').replace(/^﻿/,'').split(/\r?\n/)[0].trim();}catch{return '';}};
let apiKey=(process.env.DEEPSEEK_API_KEY||'').trim()||readKey();
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png'};

// Plain https (no global fetch), so any Node version that runs this file can reach DeepSeek.
// If a direct connection fails and a proxy is set (HTTPS_PROXY, or the Windows system proxy), it goes through that.
const tls=require('tls');
function envProxy(){const v=process.env.HTTPS_PROXY||process.env.https_proxy||process.env.HTTP_PROXY||process.env.http_proxy||'';try{return v?new URL(/^[a-z]+:\/\//i.test(v)?v:'http://'+v):null;}catch{return null;}}
function windowsProxy(){
  if(process.platform!=='win32')return null;
  try{const out=require('child_process').execSync('reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings"',{encoding:'utf8',windowsHide:true,timeout:3000});
    if(!/ProxyEnable\s+REG_DWORD\s+0x1/i.test(out))return null;const raw=(out.match(/ProxyServer\s+REG_SZ\s+(\S+)/i)||[])[1];if(!raw)return null;
    const pick=raw.includes('=')?(raw.split(';').map(x=>x.split('=')).find(([k])=>/^https$/i.test(k))||raw.split(';').map(x=>x.split('=')).find(([k])=>/^http$/i.test(k))||[])[1]:raw;
    return pick?new URL(/^[a-z]+:\/\//i.test(pick)?pick:'http://'+pick):null;}catch{return null;}
}
let route=envProxy();
function post(payload,timeoutMs,proxy){
  return new Promise(resolve=>{
    const data=JSON.stringify(payload);let done=false;const finish=v=>{if(!done){done=true;resolve(v);}};
    const options={host:'api.deepseek.com',path:'/chat/completions',method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(data),Authorization:'Bearer '+apiKey}};
    const send=extra=>{const req=https.request({...options,...extra},res=>{let text='';res.setEncoding('utf8');res.on('data',c=>{text+=c;});res.on('end',()=>{let body=null;try{body=JSON.parse(text);}catch{}finish({status:res.statusCode,body});if(extra.createConnection)res.socket?.destroy();});res.on('error',e=>finish({status:0,error:e}));});
      req.setTimeout(timeoutMs,()=>req.destroy(Object.assign(new Error('timeout'),{code:'ETIMEDOUT'})));req.on('error',e=>finish({status:0,error:e}));req.write(data);req.end();};
    if(!proxy)return send({});
    const tunnel=http.request({host:proxy.hostname,port:Number(proxy.port)||80,method:'CONNECT',path:'api.deepseek.com:443',headers:{Host:'api.deepseek.com:443'}});
    tunnel.setTimeout(timeoutMs,()=>tunnel.destroy(Object.assign(new Error('timeout'),{code:'ETIMEDOUT'})));
    tunnel.on('connect',(res,socket)=>{socket.on('error',()=>{});if(res.statusCode!==200){socket.destroy();return finish({status:0,error:Object.assign(new Error('proxy '+res.statusCode),{code:'PROXY_'+res.statusCode})});}send({agent:false,createConnection:()=>tls.connect({socket,servername:'api.deepseek.com'})});});
    tunnel.on('error',e=>finish({status:0,error:e}));tunnel.end();
  });
}
async function deepseek(payload,timeoutMs=40000){
  const r=await post(payload,timeoutMs,route);
  if(r.error&&!route){const proxy=windowsProxy();if(proxy){const viaProxy=await post(payload,timeoutMs,proxy);if(!viaProxy.error){route=proxy;console.log('已通过系统代理 '+proxy.host+' 连接 DeepSeek。');}return viaProxy.error?r:viaProxy;}}
  return r;
}
// One plain-language reason for every way the call can fail.
function reason(r){
  if(!apiKey)return '没有找到 Key（deepseek-key.txt）';
  if(r.error)return r.error.code==='ETIMEDOUT'?'连接 DeepSeek 超时，请检查网络':'连不上 api.deepseek.com（'+(r.error.code||r.error.message)+'），请检查网络或代理';
  const m=r.body?.error?.message||'';
  if(r.status===401)return 'Key 无效或已失效';
  if(r.status===402)return 'DeepSeek 账户余额不足';
  if(r.status===429)return 'DeepSeek 请求太频繁，请稍后再试';
  if(r.status>=500)return 'DeepSeek 服务暂时不可用';
  return 'DeepSeek 返回错误 '+r.status+(m?'：'+m:'');
}
// A real check: one tiny request. Success is kept for 10 minutes, a failure for 15 seconds.
let check=null;
async function aiCheck(force=false){
  if(!apiKey)return {configured:false,ok:false,error:reason({})};
  if(!force&&check&&Date.now()-check.at<(check.ok?600000:15000))return check.result;
  const r=await deepseek({model:'deepseek-chat',messages:[{role:'user',content:'ping'}],max_tokens:1},15000);
  const ok=r.status===200,result={configured:true,ok,...(ok?{}:{error:reason(r)})};check={at:Date.now(),ok,result};return result;
}

// A dropped connection must never take the game server down with it.
process.on('uncaughtException',e=>console.log('（已忽略的网络错误：'+(e?.code||e?.message||e)+'）'));
http.createServer(async(req,res)=>{const url=new URL(req.url,'http://localhost');const json=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
 if(url.pathname.startsWith('/api/')){const origin=req.headers.origin;if(origin&&origin!=='http://127.0.0.1:'+port&&origin!=='http://localhost:'+port)return json(403,{error:'Origin rejected'});
  if(url.pathname==='/api/ai-status'&&req.method==='GET')return json(200,{configured:!!apiKey,provider:'DeepSeek',model:'deepseek-chat'});
  if(url.pathname==='/api/ai-check'&&req.method==='GET')return json(200,await aiCheck(url.searchParams.has('force')));
  if(req.method!=='POST')return json(405,{error:'POST required'});let body='';try{for await(const c of req){body+=c;if(body.length>60000)return json(413,{error:'Request too large'});}const input=JSON.parse(body);
  if(url.pathname==='/api/ai-session'){apiKey=String(input.apiKey||'').trim();check=null;return json(200,{configured:!!apiKey});}
  if(url.pathname==='/api/dialogue'){if(!apiKey)return json(401,{error:reason({})});
   const r=await deepseek({model:'deepseek-chat',messages:input.messages,response_format:{type:'json_object'},max_tokens:1000});
   if(r.status===200){const choice=r.body?.choices?.[0];if(choice?.finish_reason==='length')return json(502,{error:'回复被截断，请重试。'});check={at:Date.now(),ok:true,result:{configured:true,ok:true}};return json(200,{text:choice?.message?.content||''});}
   const why=reason(r);console.log('DeepSeek 对话失败：'+why);return json(r.status&&r.status>=400?r.status:502,{error:why});}
  return json(404,{error:'Not found'});
 }catch(e){return json(400,{error:'请求格式不正确'});}}
 let file;try{file=path.resolve(root,'.'+(url.pathname==='/'?'/index.html':decodeURIComponent(url.pathname)));}catch{return json(400,{error:'Bad URL'});}if(file!==root&&!file.startsWith(root+path.sep))return json(403,{error:'Forbidden'});fs.readFile(file,(err,body)=>{if(err){res.writeHead(404);res.end('Not found');return;}res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(body);});
}).listen(port,'127.0.0.1',async()=>{
 console.log('Local: http://127.0.0.1:'+port);
 if(!apiKey){console.log('未找到 DeepSeek Key（deepseek-key.txt），居民使用离线对白。');return;}
 console.log('正在检查 DeepSeek 连接…');const r=await aiCheck(true);
 console.log(r.ok?'DeepSeek 已连接 ✓ 居民默认用 DeepSeek 对话。':'DeepSeek 没有连上：'+r.error+'。游戏会改用离线对白。');
});
