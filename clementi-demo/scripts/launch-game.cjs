'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const gameDir = path.resolve(__dirname, '..');
const port = 4201;
const url = `http://127.0.0.1:${port}/`;
const branch = 'codex/clementi-interaction-upgrade-2026-11-03';

// Everything the launcher says also goes to launch-log.txt, so a window that closes can still be read.
const logFile = path.join(gameDir, 'launch-log.txt');
for (const name of ['log', 'error']) {
  const write = console[name].bind(console);
  console[name] = (...args) => { write(...args); try { fs.appendFileSync(logFile, args.join(' ') + '\n', 'utf8'); } catch (_) {} };
}
console.log(`Node ${process.version} · ${process.platform} · ${gameDir}`);
const pauseBeforeClose = ms => new Promise(resolve => setTimeout(resolve, ms));

function probe() {
  return new Promise(resolve => {
    let received = false;
    const request = http.get(`${url}ai-integration.json`, response => {
      received = true;
      let body = '';
      response.setEncoding('utf8');
      response.on('data', chunk => {
        body += chunk;
        if (body.length > 4096) response.destroy();
      });
      response.on('end', () => {
        let identity;
        try { identity = JSON.parse(body); } catch (_) { /* Another local service. */ }
        resolve({ busy: true, match: response.statusCode === 200 && identity?.id === 'clementi-resident-ai'
          && identity.sourceBranch === branch && identity.version === 1 });
      });
      response.on('error', () => resolve({ busy: true, match: false }));
    });
    request.setTimeout(1500, () => request.destroy());
    request.on('error', error => resolve({ busy: received || error.code !== 'ECONNREFUSED', match: false }));
  });
}

// A service started before deepseek-key.txt existed has no key; hand it the local key.
function request(method, pathname, body) {
  return new Promise(resolve => {
    const data = body ? JSON.stringify(body) : '';
    const req = http.request({ host: '127.0.0.1', port, path: pathname, method, headers: data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {} }, response => {
      let text = ''; response.setEncoding('utf8'); response.on('data', c => { text += c; }); response.on('end', () => { try { resolve(JSON.parse(text)); } catch (_) { resolve(null); } });
    });
    req.setTimeout(pathname.startsWith('/api/ai-check') ? 20000 : 1500, () => req.destroy()); req.on('error', () => resolve(null)); if (data) req.write(data); req.end();
  });
}
async function shareKey() {
  let key = process.env.DEEPSEEK_API_KEY || '';
  if (!key) { try { key = fs.readFileSync(path.join(gameDir, 'deepseek-key.txt'), 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/)[0].trim(); } catch (_) {} }
  const status = await request('GET', '/api/ai-status');
  if (!status?.configured && key) await request('POST', '/api/ai-session', { apiKey: key });
  // A real check: the server sends DeepSeek one tiny request and reports the reason if it fails.
  const check = await request('GET', '/api/ai-check?force=1');
  if (!check || !('ok' in check)) { console.log('正在运行的是旧版游戏服务，无法检查 DeepSeek。请关闭所有旧的游戏窗口，再重新运行“启动游戏.cmd”。'); return; }
  console.log(check.ok ? 'DeepSeek 已连接 ✓ 居民默认用 DeepSeek 对话。' : 'DeepSeek 没有连上：' + (check.error || '原因未知') + '。游戏会改用离线对白。');
}

function openBrowser() {
  console.log(`打开金文泰 AI 整合版：${url}`);
  const browser = spawn('rundll32.exe', ['url.dll,FileProtocolHandler', url], {
    windowsHide: true, stdio: 'ignore'
  });
  browser.on('error', () => console.log(`请手动在浏览器打开：${url}`));
  browser.unref();
}

async function main() {
  const existing = await probe();
  if (existing.match) {
    console.log('金文泰 AI 游戏已经在运行（另一个黑色窗口），直接打开网页。');
    await shareKey();
    openBrowser();
    console.log('此窗口 8 秒后自动关闭；游戏服务在原来的窗口里继续运行。');
    await pauseBeforeClose(8000);
    return;
  }
  if (existing.busy) {
    console.error('端口 4201 已被其他程序占用，未打开该页面。请关闭占用程序后重试。');
    process.exitCode = 1;
    return;
  }
  console.log('正在启动 Downstairs · 金文泰（居民 AI 整合版）…');
  console.log(`主体分支：${branch} / clementi-demo`);
  console.log('游玩时请保留此窗口。关闭窗口或按 Ctrl+C 可停止本次启动的服务。');
  const server = spawn(process.execPath, [path.join(gameDir, 'server.cjs')], {
    cwd: gameDir, env: { ...process.env, PORT: String(port) },
    stdio: ['inherit', 'pipe', 'inherit'], windowsHide: true
  });
  let output = '', checking = false;
  const startupTimer = setTimeout(() => {
    console.error('游戏服务未能及时启动，请查看上方提示。');
    process.exitCode = 1;
    server.kill();
  }, 10000);
  server.stdout.on('data', async chunk => {
    process.stdout.write(chunk);
    try { fs.appendFileSync(logFile, chunk.toString(), 'utf8'); } catch (_) {}
    output = (output + chunk.toString()).slice(-4096);
    if (!checking && output.includes(`Local: ${url.slice(0, -1)}`)) {
      checking = true;
      const ready = await probe();
      clearTimeout(startupTimer);
      if (ready.match) openBrowser();
      else {
        console.error('游戏版本校验失败，未打开页面。请确认 clementi-demo 文件完整。');
        process.exitCode = 1;
        server.kill();
      }
    }
  });
  server.on('error', error => {
    clearTimeout(startupTimer);
    console.error(`启动失败：${error.message}`);
    process.exitCode = 1;
  });
  server.on('exit', code => {
    clearTimeout(startupTimer);
    process.exitCode = process.exitCode || code || 0;
  });
  process.on('SIGINT', () => server.kill());
  process.on('SIGTERM', () => server.kill());
}

if (require.main === module) main().catch(error => {
  console.error(`启动失败：${error.message}`);
  process.exitCode = 1;
});
module.exports = { probe, main };
