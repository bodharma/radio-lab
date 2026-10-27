const TAU = Math.PI * 2;

function positive(value, name) {
  if (!Number.isFinite(value) || value <= 0) throw new RangeError(`${name} must be positive.`);
}

export function circuit(voltage, resistance) {
  positive(voltage, 'Voltage');
  positive(resistance, 'Resistance');
  return { current: voltage / resistance, power: voltage * voltage / resistance };
}

export function wavelength(frequencyMHz) {
  positive(frequencyMHz, 'Frequency');
  return 300 / frequencyMHz;
}

export function antennaElementLength(frequencyMHz, fraction = 0.25) {
  positive(fraction, 'Wavelength fraction');
  if (fraction > 1) throw new RangeError('Use an element fraction no greater than one wavelength.');
  return wavelength(frequencyMHz) * fraction;
}

export function batteryPack(cells, connected = true) {
  if (!Number.isInteger(cells) || cells < 1 || cells > 4) throw new RangeError('Choose one to four identical cells.');
  const voltage = 1.5 * cells;
  const load = connected ? circuit(voltage, 6) : { current: 0, power: 0 };
  return { voltage, ...load };
}

export function lampCircuit(layout, broken = false) {
  if (!['series', 'parallel'].includes(layout)) throw new RangeError('Unknown circuit layout.');
  const currents = layout === 'series' ? (broken ? [0, 0] : [0.5, 0.5]) : (broken ? [0, 1] : [1, 1]);
  return { currents, totalCurrent: layout === 'series' ? currents[0] : currents[0] + currents[1] };
}

export function effectiveRadiatedPower(power, gainDbd) {
  positive(power, 'Power');
  if (!Number.isFinite(gainDbd)) throw new RangeError('Gain must be finite.');
  return power * 10 ** (gainDbd / 10);
}

export function polarisationCoupling(angleDegrees) {
  if (!Number.isFinite(angleDegrees) || angleDegrees < 0 || angleDegrees > 90) throw new RangeError('Choose an angle from 0 to 90 degrees.');
  return angleDegrees === 90 ? 0 : Math.cos(angleDegrees * Math.PI / 180) ** 2;
}

export function waveExtent(frequencyMHz) {
  positive(frequencyMHz, 'Frequency');
  return frequencyMHz <= 30 ? 200 : frequencyMHz <= 300 ? 10 : 0.5;
}

export function signalsOverlap(centre, width, otherCentre = 75, otherWidth = 10) {
  if (![centre, width, otherCentre, otherWidth].every(Number.isFinite) || width <= 0 || otherWidth <= 0) throw new RangeError('Invalid spectrum intervals.');
  return Math.max(centre - width / 2, otherCentre - otherWidth / 2) < Math.min(centre + width / 2, otherCentre + otherWidth / 2);
}

export function reflectedFraction(swr) {
  if (!Number.isFinite(swr) || swr < 1) throw new RangeError('SWR must be at least 1.');
  return ((swr - 1) / (swr + 1)) ** 2;
}

export function powerAfterLoss(power, lossDb) {
  positive(power, 'Power');
  if (!Number.isFinite(lossDb) || lossDb < 0) throw new RangeError('Loss must be non-negative.');
  return power * 10 ** (-lossDb / 10);
}

export function modulatedSignal(time, mode, depth) {
  if (!Number.isFinite(time) || !['am', 'fm'].includes(mode) || !Number.isFinite(depth) || depth < 0 || depth > 1) {
    throw new RangeError('Invalid waveform parameters.');
  }
  const message = Math.sin(TAU * time);
  const envelope = mode === 'am' ? 1 + depth * message : 1;
  const phase = TAU * 14 * time - (mode === 'fm' ? 3 * depth * Math.cos(TAU * time) : 0);
  return { value: envelope * Math.sin(phase), envelope, frequency: mode === 'fm' ? 14 + 3 * depth * message : 14 };
}

export function signalPath(sample, { width = 640, height = 190, amplitude = 70, count = 900 } = {}) {
  const points = [];
  for (let i = 0; i <= count; i++) {
    const x = i / count;
    points.push(`${i ? 'L' : 'M'}${(x * width).toFixed(2)},${(height / 2 - sample(x) * amplitude).toFixed(2)}`);
  }
  return points.join(' ');
}
