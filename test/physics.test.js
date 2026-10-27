import test from 'node:test';
import assert from 'node:assert/strict';
import { circuit, wavelength, reflectedFraction, powerAfterLoss, modulatedSignal } from '../src/physics.js';

test('doubling resistance halves current and power at fixed voltage', () => {
  assert.deepEqual(circuit(12, 6), { current: 2, power: 24 });
  assert.deepEqual(circuit(12, 12), { current: 1, power: 12 });
  assert.throws(() => circuit(12, 0), RangeError);
  assert.throws(() => circuit(Infinity, 3), RangeError);
});

test('frequency and wavelength are inversely related with explicit MHz/metre units', () => {
  assert.equal(wavelength(3), 100);
  assert.equal(wavelength(6), 50);
  assert.throws(() => wavelength(-1), RangeError);
});

test('SWR reflection and feeder loss conserve the relevant power budget', () => {
  assert.equal(reflectedFraction(1), 0);
  assert.equal(reflectedFraction(3), 0.25);
  assert.equal(powerAfterLoss(10, 10), 1);
  assert.throws(() => reflectedFraction(0), RangeError);
});

test('AM changes amplitude while FM changes instantaneous frequency around its carrier', () => {
  assert.equal(modulatedSignal(0.25, 'am', 0.6).envelope, 1.6);
  assert.equal(modulatedSignal(0.75, 'am', 0.6).envelope, 0.4);
  assert.equal(modulatedSignal(0.25, 'fm', 0.6).envelope, 1);
  assert.ok(modulatedSignal(0.25, 'fm', 0.6).frequency > 14);
  assert.ok(modulatedSignal(0.75, 'fm', 0.6).frequency < 14);
  for (const mode of ['am', 'fm']) assert.equal(modulatedSignal(0.25, mode, 0).frequency, 14);
});
