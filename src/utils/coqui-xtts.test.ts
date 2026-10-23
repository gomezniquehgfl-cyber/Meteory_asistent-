import test from 'node:test';
import assert from 'node:assert';
import { COQUI_XTTS_CONFIG, CoquiXTTSEngine } from './coqui-xtts.ts';

test('Coqui XTTS v2 configuration is correct', () => {
  assert.strictEqual(COQUI_XTTS_CONFIG.version, 'v2.0.2');
  assert.strictEqual(COQUI_XTTS_CONFIG.modelFile, 'xtts_v2.0.2_4bit_q4_0.gguf');
  assert.strictEqual(COQUI_XTTS_CONFIG.sizeMB, 500);
});

test('CoquiXTTSEngine.speak handles empty text gracefully', async () => {
  let ended = false;
  const result = await CoquiXTTSEngine.speak('', undefined, () => {
    ended = true;
  });
  assert.strictEqual(result, true);
  assert.strictEqual(ended, true);
});
