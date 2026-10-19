import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ensureJarvisHonorific,
  detectMeteoryWakeWord,
  extractCommandAfterWakeWord,
  cleanVoiceTextForSpeech,
  processLocalNeuralResponse
} from './assistant-logic.ts';

test('extractCommandAfterWakeWord extracts pure user command with Hey Meteory and custom hotwords', () => {
  assert.equal(extractCommandAfterWakeWord('Hey Meteory cuánta batería tengo'), 'cuánta batería tengo');
  assert.equal(extractCommandAfterWakeWord('Meteory cuánta batería tengo'), 'cuánta batería tengo');
  assert.equal(extractCommandAfterWakeWord('Oye Meteory, qué hora es'), 'qué hora es');
  assert.equal(extractCommandAfterWakeWord('Meteory'), '');
  assert.equal(extractCommandAfterWakeWord('Jarvis diagnostica el sistema', 'Jarvis'), 'diagnostica el sistema');
});

test('detectMeteoryWakeWord identifies Hey Meteory and custom hotwords', () => {
  assert.equal(detectMeteoryWakeWord('Hey Meteory que hora es'), true);
  assert.equal(detectMeteoryWakeWord('Meteory enciende la luz'), true);
  assert.equal(detectMeteoryWakeWord('Oye Meteory que hora es'), true);
  assert.equal(detectMeteoryWakeWord('Meteori activa los motores'), true);
  assert.equal(detectMeteoryWakeWord('Asistente Meteory reporte'), true);
  assert.equal(detectMeteoryWakeWord('Jarvis reporte táctico', 'Jarvis'), true);
  assert.equal(detectMeteoryWakeWord('buenos dias computadora'), false);
});

test('cleanVoiceTextForSpeech removes markdown symbols', () => {
  const input = '**Atención**: `código` en *proceso*.';
  const cleaned = cleanVoiceTextForSpeech(input);
  assert.equal(cleaned, 'Atención: código en proceso.');
});

test('processLocalNeuralResponse reports real battery telemetry in background', () => {
  const mockTelemetry = {
    batteryLevel: 85,
    isCharging: true,
    exactLocalTime: '05:45 PM',
    exactLocalDate: 'domingo, 18 de octubre de 2026',
    timezone: 'America/Mexico_City',
    isOnline: true,
    screenResolution: '1920x1080',
    platform: 'Linux x86_64',
  };

  const batRes = processLocalNeuralResponse('cuánta batería tengo', 'Niquel', mockTelemetry);
  assert.ok(batRes.includes('Señor Niquel'));
  assert.ok(batRes.includes('85%'));
  assert.ok(batRes.includes('conectado'));

  const timeRes = processLocalNeuralResponse('qué hora es', 'Niquel', mockTelemetry);
  assert.ok(timeRes.includes('Señor Niquel'));
  assert.ok(timeRes.includes('05:45 PM'));
});

test('processLocalNeuralResponse generates accurate offline response with honorific', () => {
  const response = processLocalNeuralResponse('estado del sistema', 'Niquel');
  assert.ok(response.includes('Señor Niquel'));
  assert.ok(response.includes('100%'));

  const mathRes = processLocalNeuralResponse('calcula 25 * 4', 'Niquel');
  assert.ok(mathRes.includes('Señor Niquel'));
  assert.ok(mathRes.includes('100'));
});
