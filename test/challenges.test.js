import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { activityFor } from '../src/activities.js';
import { createChallenge, evaluateChallenge, challengeDiagram } from '../src/challenges.js';

const activity = (stem, module) => activityFor({ stem }, module);

test('shack-safety task explains the trailing cable actually shown in its diagram', () => {
  const challenge = createChallenge(activity('Shack_Safety', 8), 2, 0);
  assert.match(challenge.prompt, /trailing cable/);
  assert.match(challenge.solution, /access route/);
  assert.doesNotMatch(challenge.prompt, /Equipment is open/);
});

test('scientific notation accepted by the number input is marked as the equivalent finite value', () => {
  const challenge = createChallenge(activity('Large_and_Small_Units', 2), 2, 0);
  assert.equal(evaluateChallenge(challenge, challenge.initial, '2.5e2').correct, true);
  assert.equal(evaluateChallenge(challenge, challenge.initial, '2.5E+2').correct, true);
  assert.equal(evaluateChallenge(challenge, challenge.initial, '1e999').correct, false);
  assert.equal(evaluateChallenge(challenge, challenge.initial, '2.5e2 mA').correct, false);
});

test('all 86 ordered topics have solvable transfer tasks without accepting their starting arrangement', async () => {
  const course = JSON.parse(await readFile(new URL('../public/course.json', import.meta.url), 'utf8'));
  const documents = new Map(course.documents.map(document => [document.id, document]));
  const kinds = new Set();
  let count = 0;
  for (const module of course.modules) for (const id of module.topics) {
    const model = activityFor(documents.get(id), module.number);
    kinds.add(model.kind);
    for (let seed = 0; seed < 6; seed++) for (let level = 0; level < 3; level++) {
      const challenge = createChallenge(model, level, seed);
      assert.ok(challenge.prompt.length > 50, id);
      assert.equal(challenge.hints.length, 2, id);
      assert.ok(challenge.solution.length > 50, id);
      assert.equal(evaluateChallenge(challenge, challenge.initial, '').correct, false, id);
      assert.equal(evaluateChallenge(challenge, { ...challenge.initial, ...challenge.target }, challenge.answer).correct, true, id);
      const diagram = challengeDiagram(challenge);
      assert.match(diagram, /^<svg/);
      assert.doesNotMatch(diagram, /undefined|NaN|topic-focus/, id);
    }
    count++;
  }
  assert.equal(count, 86);
  assert.equal(kinds.size, 42);
});

test('varied numerical givens are independently checked and diagrams do not reveal answers', () => {
  const resistor = createChallenge(activity('Resistance', 2), 2, 0);
  assert.equal(resistor.answer, 1.5);
  assert.equal(evaluateChallenge(resistor, {}, '1.5').correct, true);
  assert.equal(evaluateChallenge(resistor, {}, '1.49').correct, false);
  assert.equal(resistor.unit, 'A');
  assert.equal(createChallenge(activity('Resistance', 2), 2, 2).answer, 4);
  assert.equal(createChallenge(activity('Batteries', 2), 2, 0).answer, 4.5);
  assert.equal(createChallenge(activity('Batteries', 2), 2, 1).answer, 6);
  assert.equal(createChallenge(activity('Batteries', 2), 2, 2).answer, 0.5);
  assert.equal(createChallenge(activity('Batteries', 2), 2, 3).answer, 0);
  assert.equal(evaluateChallenge(createChallenge(activity('Batteries', 2), 2, 3), {}, '0').correct, true);
  assert.equal(createChallenge(activity('Formula_Resistance', 2), 2, 1).answer, 12);
  assert.equal(createChallenge(activity('Formula_Resistance', 2), 2, 1).unit, 'Ω');
  assert.equal(createChallenge(activity('Amateur_Radio_Bands', 1), 2, 0).answer, 0.5);
  assert.equal(createChallenge(activity('Frequency_and_Wavelength', 1), 2, 0).answer, 2);
  const feeder = createChallenge(activity('Feeders', 4), 2, 0);
  assert.equal(evaluateChallenge(feeder, {}, '5.012').correct, true);
  assert.equal(evaluateChallenge(feeder, {}, '5.1').correct, false);
  assert.match(challengeDiagram(resistor), /\? A/);
  assert.doesNotMatch(challengeDiagram(resistor), /1\.5 A/);
  assert.equal(resistor.controls.length, 0);
  assert.notEqual(resistor.id, createChallenge(activity('Resistance', 2), 2, 1).id);
});

test('numeric input rejects absent, non-finite and incorrectly labelled values', () => {
  const challenge = createChallenge(activity('Resistance', 2), 1, 0);
  for (const answer of ['', ' ', null, undefined, NaN, Infinity, 'Infinity', '0x1.8', '1.5 A', '1,5', {}, []]) assert.equal(evaluateChallenge(challenge, {}, answer).correct, false, String(answer));
  assert.equal(evaluateChallenge(challenge, {}, ' 1.500 ').correct, true);
  assert.equal(evaluateChallenge(challenge, {}, 1.5).correct, true);
});

test('action tasks preserve fixed givens and distinguish the requested transmitter fault', () => {
  const radio = createChallenge(activity('The_Basics_of_Amateur_Radio', 1), 2);
  assert.equal(radio.initial.distance, 2);
  assert.equal(radio.initial.transmitter, 'off');
  const interference = createChallenge(activity('Interference', 7), 2);
  assert.equal(interference.initial.power, 3);
  assert.equal(evaluateChallenge(interference, { power: 2, filter: 'on' }).correct, false);
  assert.equal(evaluateChallenge(interference, { power: 3, filter: 'on' }).correct, true);
  const message = createChallenge(activity('Radio_Signals', 3), 2, 0);
  const oscillator = createChallenge(activity('Radio_Signals', 3), 2, 1);
  assert.equal(evaluateChallenge(message, { missing: 'oscillator' }).correct, false);
  assert.equal(evaluateChallenge(message, { missing: 'modulator' }).correct, true);
  assert.equal(evaluateChallenge(oscillator, { missing: 'modulator' }).correct, false);
  assert.equal(evaluateChallenge(oscillator, { missing: 'oscillator' }).correct, true);
});

test('outcome tasks accept alternative valid states but validate controls and givens', () => {
  const bandplan = createChallenge(activity('Band_Plans', 6), 2, 1);
  assert.equal(bandplan.kind, 'bandplan');
  assert.equal(evaluateChallenge(bandplan, { centre: 40, width: 20 }).correct, true);
  assert.equal(evaluateChallenge(bandplan, { centre: 75, width: 20 }).correct, false);
  assert.equal(evaluateChallenge(bandplan, { centre: 40, width: 5 }).correct, false);
  assert.equal(evaluateChallenge(bandplan, { centre: -40, width: 20 }).correct, false);
  assert.equal(evaluateChallenge(bandplan, { centre: 41, width: 20 }).correct, false);
  const satellite = createChallenge(activity('Satellites_and_ISS', 9), 2);
  assert.equal(satellite.kind, 'satellite');
  assert.equal(evaluateChallenge(satellite, { position: 10 }).correct, true);
  assert.equal(evaluateChallenge(satellite, { position: 170 }).correct, true);
  assert.equal(evaluateChallenge(satellite, { position: 0 }).correct, false);
  assert.equal(evaluateChallenge(satellite, { position: 180 }).correct, false);
  assert.equal(evaluateChallenge(satellite, { position: NaN }).correct, false);
  assert.equal(evaluateChallenge(satellite, null).correct, false);
});

test('invalid task parameters are rejected rather than creating an unmarked fallback', () => {
  const model = activity('Batteries', 2);
  assert.throws(() => createChallenge(model, 3), RangeError);
  assert.throws(() => createChallenge(model, 1, -1), RangeError);
  assert.throws(() => createChallenge({ kind: 'invented', controls: [] }), /No transfer challenge/);
});
