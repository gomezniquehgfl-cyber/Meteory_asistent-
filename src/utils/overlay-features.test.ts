import { test } from 'node:test';
import assert from 'node:assert';
import { fpsMonitor } from './fps-monitor.ts';
import { ScreenAccessibilityEngine } from './screen-accessibility-engine.ts';

test('fpsMonitor provides reading and subscriptions', () => {
  const reading = fpsMonitor.getCurrentReading();
  assert.ok(typeof reading.fps === 'number', 'FPS must be a number');
  assert.ok(['good', 'regular', 'low'].includes(reading.tier), 'Tier must be valid');
  assert.ok(reading.colorClass.startsWith('text-'), 'Must have valid tailwind text color class');

  let notified = false;
  const unsub = fpsMonitor.subscribe((r) => {
    assert.ok(typeof r.fps === 'number');
    notified = true;
  });
  assert.strictEqual(notified, true);
  unsub();
});

test('ScreenAccessibilityEngine extracts context snapshot', () => {
  const snapshot = ScreenAccessibilityEngine.extractScreenContext();
  assert.ok(typeof snapshot.appName === 'string');
  assert.ok(typeof snapshot.summaryText === 'string');
  assert.ok(Array.isArray(snapshot.elements));
  assert.ok(typeof snapshot.timestamp === 'number');
});
