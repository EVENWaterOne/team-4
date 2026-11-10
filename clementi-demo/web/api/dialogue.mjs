import { LIMITS, UpstreamError, clientIp, configured, dialogue, json, rateLimited, sameOrigin, say, validDialogue } from './_lib/deepseek.mjs';

export default {
  async fetch(request) {
    if (request.method !== 'POST') return json(405, { error: say('zh', 'method') }, { allow: 'POST' });
    if (!sameOrigin(request)) return json(403, { error: say('zh', 'origin') });
    if (!/^application\/json\b/i.test(request.headers.get('content-type') || '')) return json(415, { error: say('zh', 'bad') });
    if (Number(request.headers.get('content-length') || 0) > LIMITS.bodyBytes) return json(413, { error: say('zh', 'tooBig') });
    const raw = await request.text();
    if (raw.length > LIMITS.body) return json(413, { error: say('zh', 'tooBig') });
    let input;
    try { input = JSON.parse(raw); } catch { return json(400, { error: say('zh', 'bad') }); }
    const checked = validDialogue(input);
    const lang = checked.lang || 'zh';
    if (checked.error) return json(checked.error === 'tooBig' ? 413 : checked.error === 'prompt' ? 409 : 400, { error: say(lang, checked.error) });
    if (rateLimited('dialogue', clientIp(request), [{ ms: 60000, max: 15 }, { ms: 3600000, max: 240 }])) return json(429, { error: say(lang, 'rate') }, { 'retry-after': '30' });
    if (!configured()) return json(503, { error: say(lang, 'noKey') });
    try {
      return json(200, { text: await dialogue(checked.messages) });
    } catch (error) {
      if (error instanceof UpstreamError) {
        if (error.reason === 'timeout' || error.reason === 'down') console.error('dialogue', error.reason);
        return json(error.status, { error: say(lang, error.reason) });
      }
      console.error('dialogue failed', error?.name);
      return json(502, { error: say(lang, 'down') });
    }
  }
};
