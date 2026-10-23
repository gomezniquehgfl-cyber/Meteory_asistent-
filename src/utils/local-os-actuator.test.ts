import test from 'node:test';
import assert from 'node:assert/strict';
import { LocalOSActuator } from './local-os-actuator.ts';
import { processLocalNeuralResponse } from './assistant-logic.ts';

test('LocalOSActuator.isOSDirective detects power saver and system terminal commands', () => {
  assert.equal(LocalOSActuator.isOSDirective('activa el modo ahorro de batería'), true);
  assert.equal(LocalOSActuator.isOSDirective('activar ahorro de energia'), true);
  assert.equal(LocalOSActuator.isOSDirective('desactivar modo ahorro de bateria'), true);
  assert.equal(LocalOSActuator.isOSDirective('optimiza la memoria ram'), true);
  assert.equal(LocalOSActuator.isOSDirective('ejecuta en terminal: uname -a'), true);
  assert.equal(LocalOSActuator.isOSDirective('terminal: df -h'), true);
  assert.equal(LocalOSActuator.isOSDirective('¿cuál es la capital de Francia?'), false);
  assert.equal(LocalOSActuator.isOSDirective('hola meteory'), false);
});

test('processLocalNeuralResponse differentiates battery status from battery saving directive', () => {
  const saveReply = processLocalNeuralResponse('activa el modo ahorro de batería', 'Niquel');
  assert.ok(saveReply.includes('Señor Niquel'));
  assert.ok(saveReply.includes('ahorro de energía ejecutada con éxito'));

  const statusReply = processLocalNeuralResponse('cuánta batería tengo', 'Niquel', { batteryLevel: 78, isOnline: true } as any);
  assert.ok(statusReply.includes('Señor Niquel'));
  assert.ok(statusReply.includes('78%'));
});
