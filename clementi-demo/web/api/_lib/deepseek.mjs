// Shared server code for the public web build. Only runs on the server (Vercel Functions).
// The DeepSeek key lives in the DEEPSEEK_API_KEY environment variable and never reaches the browser.
import PROMPTS from './prompts.mjs';

const BASE = (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/+$/, '');
const MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-flash';
const apiKey = () => String(process.env.DEEPSEEK_API_KEY || '').trim();

export const configured = () => !!apiKey();

// Request size caps, in characters. A real dialogue request is about 6 KB; the game sends at most the last
// 6 exchanges and caps typed questions at 600 characters. bodyBytes allows for 4-byte UTF-8 characters.
export const LIMITS = { body: 40000, bodyBytes: 160000, user: 32000, question: 600 };

const MESSAGES = {
  zh: {
    origin: '只接受本站页面的请求。',
    method: '请求方式不对。',
    tooBig: '请求太大。',
    bad: '请求格式不对。',
    prompt: '页面版本已更新，请刷新页面后再试。',
    rate: '对话太频繁了，请稍等一会儿再试。',
    noKey: '网站还没有配置 DeepSeek Key，可以先用离线对白。',
    key: 'Key 无效或已失效',
    balance: 'DeepSeek 账户余额不足',
    busy: 'DeepSeek 请求太频繁，请稍后再试',
    down: 'DeepSeek 服务暂时不可用',
    timeout: '连接 DeepSeek 超时，请稍后再试',
    rejected: 'DeepSeek 拒绝了这次请求',
    truncated: '回复被截断，请重试。',
    empty: 'DeepSeek 返回了空回复，请重试。',
    filtered: '这句没能生成，换个说法再试。'
  },
  en: {
    origin: 'Only requests from this site are accepted.',
    method: 'Wrong request method.',
    tooBig: 'The request is too large.',
    bad: 'The request is malformed.',
    prompt: 'The page has been updated. Refresh and try again.',
    rate: 'Too many messages. Wait a moment and try again.',
    noKey: 'This site has no DeepSeek key yet. Offline dialogue still works.',
    key: 'The key is invalid or expired',
    balance: 'The DeepSeek account has no balance left',
    busy: 'DeepSeek is rate limiting requests. Try again shortly',
    down: 'DeepSeek is temporarily unavailable',
    timeout: 'DeepSeek timed out. Try again shortly',
    rejected: 'DeepSeek rejected the request',
    truncated: 'The reply was cut off. Try again.',
    empty: 'DeepSeek returned an empty reply. Try again.',
    filtered: 'That line could not be generated. Try asking another way.'
  }
};
export const say = (lang, id) => (MESSAGES[lang] || MESSAGES.zh)[id];

export function json(status, data, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers }
  });
}

// Vercel sets x-real-ip / x-forwarded-for to the visitor's address.
export function clientIp(request) {
  const h = request.headers;
  return String(h.get('x-real-ip') || (h.get('x-forwarded-for') || '').split(',')[0] || 'unknown').trim();
}

// Browsers always send Origin on a POST from fetch(); it must be this site.
export function sameOrigin(request) {
  const origin = request.headers.get('origin');
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  if (!origin || !host) return false;
  try { return new URL(origin).host === host; } catch { return false; }
}

// Per-instance sliding-window limiter. It is a speed bump, not a global quota:
// the DeepSeek account balance is the hard spending cap.
const hits = new Map();
const PRUNE_MS = 3600000; // the longest window any bucket uses
export function rateLimited(bucket, ip, rules) {
  const now = Date.now();
  const id = bucket + '|' + ip;
  const longest = Math.max(...rules.map(r => r.ms));
  const list = (hits.get(id) || []).filter(t => now - t < longest);
  const over = rules.some(r => list.filter(t => now - t < r.ms).length >= r.max);
  if (!over) list.push(now);
  hits.set(id, list);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.length || now - v[v.length - 1] > PRUNE_MS) hits.delete(k);
  return over;
}

// Only the game's own two system prompts (Chinese and English) are forwarded.
export function validDialogue(input) {
  const messages = input?.messages;
  if (!Array.isArray(messages) || messages.length !== 2) return { error: 'bad' };
  const [system, user] = messages;
  if (system?.role !== 'system' || user?.role !== 'user') return { error: 'bad' };
  if (typeof system.content !== 'string' || !PROMPTS.includes(system.content)) return { error: 'prompt' };
  if (typeof user.content !== 'string' || user.content.length > LIMITS.user) return { error: 'tooBig' };
  let payload;
  try { payload = JSON.parse(user.content); } catch { return { error: 'bad' }; }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return { error: 'bad' };
  if (payload.question != null && (typeof payload.question !== 'string' || payload.question.length > LIMITS.question)) return { error: 'bad' };
  return { messages: [{ role: 'system', content: system.content }, { role: 'user', content: user.content }], lang: payload.responseLanguage === 'English' ? 'en' : 'zh' };
}

export class UpstreamError extends Error {
  constructor(status, reason) { super(reason); this.status = status; this.reason = reason; }
}

function statusReason(status) {
  if (status === 401) return 'key';
  if (status === 402) return 'balance';
  if (status === 429) return 'busy';
  if (status >= 500) return 'down';
  return 'rejected';
}

async function call(path, { method = 'GET', body, timeoutMs }) {
  let response;
  try {
    response = await fetch(BASE + path, {
      method,
      headers: { Authorization: 'Bearer ' + apiKey(), 'Content-Type': 'application/json', Accept: 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(timeoutMs)
    });
  } catch (error) {
    throw new UpstreamError(504, error?.name === 'TimeoutError' || error?.name === 'AbortError' ? 'timeout' : 'down');
  }
  // A timeout can also fire while the body is still arriving (DeepSeek keeps busy connections open with blank lines).
  let data = null;
  try { data = await response.json(); } catch (error) {
    if (response.ok) throw new UpstreamError(504, error?.name === 'TimeoutError' || error?.name === 'AbortError' ? 'timeout' : 'down');
  }
  if (!response.ok) {
    console.error('deepseek', path, response.status);
    throw new UpstreamError(response.status === 401 || response.status === 402 || response.status === 429 ? response.status : 502, statusReason(response.status));
  }
  return data;
}

// One dialogue beat. Mirrors server.cjs, with the current model id and thinking turned off.
export async function dialogue(messages, budgetMs = 50000) {
  const started = Date.now();
  const body = { model: MODEL, messages, response_format: { type: 'json_object' }, max_tokens: 1000, thinking: { type: 'disabled' }, stream: false };
  for (let attempt = 0; attempt < 2; attempt++) {
    const left = budgetMs - (Date.now() - started);
    const data = await call('/chat/completions', { method: 'POST', body, timeoutMs: Math.max(5000, left) });
    const choice = data?.choices?.[0];
    const text = choice?.message?.content ?? '';
    if (choice?.finish_reason === 'length' && String(text).trim()) throw new UpstreamError(502, 'truncated');
    if (choice?.finish_reason === 'content_filter') throw new UpstreamError(502, 'filtered');
    if (choice?.finish_reason === 'insufficient_system_resource') throw new UpstreamError(503, 'down');
    if (String(text).trim()) return String(text);
    // JSON mode can occasionally return only whitespace; retry once if there is time.
    if (budgetMs - (Date.now() - started) < 15000) break;
  }
  throw new UpstreamError(502, 'empty');
}

// Key and balance check, plus a one-token request to confirm the model id works.
// Cached per instance so page loads do not each reach DeepSeek; concurrent checks share one request.
// A one-off busy/down/timeout does not replace a recent success, and is kept only briefly.
const TRANSIENT = ['busy', 'down', 'timeout'];
let cached = null, pending = null;
export async function status(force = false) {
  if (!configured()) return { configured: false, ok: false };
  if (cached && !force && Date.now() - cached.at < cached.ttl) return cached.value;
  if (pending) return pending;
  pending = (async () => {
    let value, ttl = 10 * 60000;
    try {
      const balance = await call('/user/balance', { timeoutMs: 8000 });
      if (balance && balance.is_available === false) throw new UpstreamError(402, 'balance');
      const ping = await call('/chat/completions', { method: 'POST', body: { model: MODEL, messages: [{ role: 'user', content: 'ping' }], max_tokens: 1, thinking: { type: 'disabled' }, stream: false }, timeoutMs: 15000 });
      if (!Array.isArray(ping?.choices)) throw new UpstreamError(502, 'down');
      value = { configured: true, ok: true };
    } catch (error) {
      const reason = error?.reason || 'down';
      const transient = TRANSIENT.includes(reason);
      if (transient && cached?.value.ok && Date.now() - cached.at < 30 * 60000) return cached.value;
      value = { configured: true, ok: false, error: say('zh', reason), errorEn: say('en', reason) };
      ttl = transient ? 15000 : 60000;
    }
    cached = { at: Date.now(), ttl, value };
    return value;
  })().finally(() => { pending = null; });
  return pending;
}
