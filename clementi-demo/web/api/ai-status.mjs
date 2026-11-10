import { configured, json } from './_lib/deepseek.mjs';

// Older pages ask this endpoint whether a key exists. It never reaches DeepSeek.
export default {
  fetch() { return json(200, { configured: configured() }); }
};
