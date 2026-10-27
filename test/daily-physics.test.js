import test from 'node:test';
import assert from 'node:assert/strict';
import { antennaElementLength, batteryPack, lampCircuit, effectiveRadiatedPower, polarisationCoupling, signalsOverlap, waveExtent } from '../src/physics.js';
import { activityFor, initialValues, readings, drawActivity } from '../src/activities.js';

test('familiar radio frequencies have the correctly scaled ideal quarter-wave elements', () => {
  assert.equal(antennaElementLength(100), 0.75);
  assert.equal(antennaElementLength(2400), 0.03125);
  assert.equal(antennaElementLength(2400) * 24, antennaElementLength(100));
  assert.ok(Math.abs(antennaElementLength(145) - 0.5172413793) < 1e-9);
});

test('series cell voltages add while an open load draws no current', () => {
  assert.equal(batteryPack(3).voltage, 4.5);
  assert.equal(batteryPack(2).current, 0.5);
  assert.equal(batteryPack(2, false).current, 0);
  assert.equal(batteryPack(2, false).voltage, 3);
  assert.throws(() => batteryPack(1.5), RangeError);
});

test('an open series lamp stops both loads, while an intact parallel branch still works', () => {
  assert.deepEqual(lampCircuit('series', true).currents, [0, 0]);
  assert.deepEqual(lampCircuit('parallel', true).currents, [0, 1]);
  assert.equal(lampCircuit('parallel', false).totalCurrent, 2);
});

test('gain uses the power ratio and ideal crossed linear polarisations have zero coupling', () => {
  assert.equal(effectiveRadiatedPower(10, 10), 100);
  assert.equal(polarisationCoupling(0), 1);
  assert.equal(polarisationCoupling(90), 0);
  assert.ok(Math.abs(polarisationCoupling(45) - 0.5) < 1e-12);
});

test('spectrum overlap includes signal width rather than comparing centres alone', () => {
  assert.equal(signalsOverlap(60, 5), false);
  assert.equal(signalsOverlap(60, 30), true);
  assert.equal(signalsOverlap(60, 20), false);
});

test('the wave drawing uses explicit metre-scale windows across the example bands', () => {
  assert.equal(waveExtent(7), 200);
  assert.equal(waveExtent(100), 10);
  assert.equal(waveExtent(2400), 0.5);
});

test('feeder dissipation and reflected power have different visual mechanisms', () => {
  const feeder = activityFor({ stem: 'Feeders' }, 4);
  const matching = activityFor({ stem: 'Antenna_Matching_and_SWR' }, 4);
  const feederValues = { ...initialValues(feeder), loss: 3 };
  const matchValues = { ...initialValues(matching), swr: 3 };
  assert.match(drawActivity(feeder, feederValues, feederValues), /loss-heat/);
  assert.doesNotMatch(drawActivity(feeder, feederValues, feederValues), /return-wire/);
  assert.match(drawActivity(matching, matchValues, matchValues), /return-wire/);
});

test('protective earth guidance is not mistaken for the RF exposure topic', () => {
  const earth = activityFor({ stem: 'Mains_and_RF_Earths' }, 8);
  assert.match(readings(earth, initialValues(earth)).detail, /Protective mains earth/);
  assert.match(readings(earth, { safe: 'safe' }).detail, /Never remove protective earth/);
});

test('specific antenna types retain their physical identity and corresponding size', () => {
  const quarter = activityFor({ stem: 'Antenna_type_14_Wave_Ground_Plane' }, 4);
  const fiveEighths = activityFor({ stem: 'Antenna_type_58_Wave_Ground_Plane' }, 4);
  assert.equal(initialValues(quarter).type, 'vertical');
  assert.equal(quarter.controls.some(c => c.key === 'type'), false);
  assert.equal(readings(quarter, initialValues(quarter)).value, 5);
  assert.equal(readings(fiveEighths, initialValues(fiveEighths)).value, 12.5);
  const generic = activityFor({ stem: 'Antennas' }, 4);
  assert.equal(readings(generic, { ...initialValues(generic), type: 'vertical' }).value, 5);
});
