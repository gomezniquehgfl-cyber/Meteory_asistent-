import { test } from 'node:test';
import assert from 'node:assert';
import {
  ALL_ANDROID_PERMISSIONS,
  AndroidPermissionsEngine,
  ANDROID_PACKAGE_NAME,
} from './android-permissions-engine.ts';

test('AndroidPermissionsEngine contains exactly 53 requested permissions', () => {
  assert.strictEqual(ALL_ANDROID_PERMISSIONS.length, 53, 'Must contain exactly 53 permissions');
});

test('All required key permissions are present in the list', () => {
  const ids = new Set(ALL_ANDROID_PERMISSIONS.map((p) => p.id));

  // Shizuku & core
  assert.ok(ids.has('moe.shizuku.manager.permission.API_V23'));
  assert.ok(ids.has('android.permission.BIND_ACCESSIBILITY_SERVICE'));
  assert.ok(ids.has('android.permission.WRITE_SECURE_SETTINGS'));
  assert.ok(ids.has('android.permission.SYSTEM_ALERT_WINDOW'));
  assert.ok(ids.has('android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS'));
  assert.ok(ids.has('android.permission.ACCESS_NOTIFICATION_POLICY'));
  assert.ok(ids.has('android.permission.PACKAGE_USAGE_STATS'));
  assert.ok(ids.has('android.permission.FOREGROUND_SERVICE_MEDIA_PROJECTION'));

  // Hardware & sensors
  assert.ok(ids.has('android.permission.CAMERA'));
  assert.ok(ids.has('android.permission.RECORD_AUDIO'));
  assert.ok(ids.has('android.permission.ACCESS_FINE_LOCATION'));
  assert.ok(ids.has('android.permission.ACCESS_COARSE_LOCATION'));

  // Telephony & comms
  assert.ok(ids.has('android.permission.READ_PHONE_STATE'));
  assert.ok(ids.has('android.permission.READ_SMS'));
  assert.ok(ids.has('android.permission.SEND_SMS'));
  assert.ok(ids.has('android.permission.READ_CONTACTS'));
  assert.ok(ids.has('android.permission.WRITE_CONTACTS'));

  // Media & storage
  assert.ok(ids.has('android.permission.READ_MEDIA_IMAGES'));
  assert.ok(ids.has('android.permission.READ_MEDIA_VIDEO'));
  assert.ok(ids.has('android.permission.READ_MEDIA_AUDIO'));

  // Bluetooth & Wi-Fi
  assert.ok(ids.has('android.permission.BLUETOOTH_SCAN'));
  assert.ok(ids.has('android.permission.BLUETOOTH_CONNECT'));
  assert.ok(ids.has('android.permission.NEARBY_WIFI_DEVICES'));
});

test('No permission starts as granted by default (zero simulation)', () => {
  const states = AndroidPermissionsEngine.loadStates();
  assert.strictEqual(states.length, 53);
  for (const s of states) {
    assert.strictEqual(s.status, 'not_granted', `Permission ${s.id} must not be marked granted without real probe`);
  }
});

test('buildIntentUri formats authentic Android intent URIs targeted to com.android.settings', () => {
  const accessibility = ALL_ANDROID_PERMISSIONS.find(
    (p) => p.id === 'android.permission.BIND_ACCESSIBILITY_SERVICE'
  )!;
  const uri = AndroidPermissionsEngine.buildIntentUri(accessibility);
  assert.strictEqual(uri, 'intent:#Intent;action=android.settings.ACCESSIBILITY_SETTINGS;package=com.android.settings;end');

  const overlay = ALL_ANDROID_PERMISSIONS.find(
    (p) => p.id === 'android.permission.SYSTEM_ALERT_WINDOW'
  )!;
  const overlayUri = AndroidPermissionsEngine.buildIntentUri(overlay);
  assert.ok(overlayUri.includes('action=android.settings.action.MANAGE_OVERLAY_PERMISSION'));
  assert.ok(overlayUri.includes(`data=package:${ANDROID_PACKAGE_NAME}`));
  assert.ok(overlayUri.includes('package=com.android.settings'));
});

test('generateAndroidManifestXml includes all 53 uses-permission tags', () => {
  const xml = AndroidPermissionsEngine.generateAndroidManifestXml();
  assert.ok(xml.includes('<manifest'));
  assert.ok(xml.includes('moe.shizuku.manager.permission.API_V23'));
  assert.ok(xml.includes('android.permission.BIND_ACCESSIBILITY_SERVICE'));
  const occurrences = (xml.match(/<uses-permission/g) || []).length;
  assert.strictEqual(occurrences, 53);
});

test('generateAdbGrantScript generates valid bash lines with adb commands', () => {
  const script = AndroidPermissionsEngine.generateAdbGrantScript();
  assert.ok(script.startsWith('#!/bin/bash'));
  assert.ok(script.includes('adb shell settings put secure enabled_accessibility_services'));
  assert.ok(script.includes('adb shell appops set'));
});
