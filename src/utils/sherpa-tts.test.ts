import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SHERPA_PACKAGE_NAME,
  SHERPA_ENGINE_NAME,
  SHERPA_PIPER_MODELS,
  SherpaTTSEngine,
} from './sherpa-tts.ts';
import { NEURAL_VOICES } from './speech.ts';

test('SherpaTTS constants and package identifiers are properly configured', () => {
  assert.equal(SHERPA_PACKAGE_NAME, 'org.woheller69.ttsengine');
  assert.equal(SHERPA_ENGINE_NAME, 'SherpaTTS v3.4');
  assert.ok(SHERPA_PIPER_MODELS.includes('es_ES-carlfm-x_low'));
  assert.ok(SHERPA_PIPER_MODELS.includes('es_ES-davefx-low'));
  assert.ok(SHERPA_PIPER_MODELS.includes('es_MX-ald-low'));
});

test('NEURAL_VOICES includes SherpaTTS v3.4 local offline entry', () => {
  const sherpaVoice = NEURAL_VOICES.find((v) => v.id === 'sherpa-tts-local');
  assert.ok(sherpaVoice, 'sherpa-tts-local voice must exist in NEURAL_VOICES');
  assert.ok(sherpaVoice?.desc.includes('org.woheller69.ttsengine'));
  assert.ok(sherpaVoice?.desc.includes('Piper low / x_low'));
});

test('SherpaTTSEngine.findSherpaVoice handles missing window gracefully', () => {
  const voice = SherpaTTSEngine.findSherpaVoice();
  assert.equal(voice, null);
});
