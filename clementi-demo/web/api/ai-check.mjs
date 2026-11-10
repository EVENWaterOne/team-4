import { clientIp, json, rateLimited, status } from './_lib/deepseek.mjs';

export default {
  async fetch(request) {
    if (request.method !== 'GET') return json(405, { configured: false, ok: false }, { allow: 'GET' });
    // A forced re-check reaches DeepSeek, so it is limited per visitor.
    const force = new URL(request.url).searchParams.get('force') === '1' && !rateLimited('check', clientIp(request), [{ ms: 60000, max: 3 }]);
    return json(200, await status(force));
  }
};
