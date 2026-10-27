import { escapeHtml as esc } from './activities.js';
import { modulatedSignal, signalPath } from './physics.js';

const text = (x, y, label) => `<text x="${x}" y="${y}" text-anchor="middle">${esc(label)}</text>`;
const box = (x, y, width, label) => `<rect x="${x}" y="${y}" width="${width}" height="58" rx="5" class="signal-block"/>${text(x + width / 2, y + 35, label)}`;

export function questionDiagram(diagram) {
  if (!diagram) return '';
  let drawing, description = 'Diagram supplied with this question';
  switch (diagram.type) {
    case 'symbol':
      drawing = diagram.component === 'cell' ? '<path d="M130 120h130m0-65v130m35-100v70m0-35h150" class="wire"/>' : '<path d="M100 120h120m160 0h120" class="wire"/><rect x="220" y="88" width="160" height="64" class="wire"/>';
      description = 'An unlabelled circuit symbol for identification'; break;
    case 'circuit':
      drawing = `<path d="M120 102V45H460V85m0 70v55H120V138" class="wire"/><path d="M85 102h70m-55 36h40" class="wire"/><rect x="440" y="85" width="40" height="70" class="wire"/>${text(120, 178, `${diagram.voltage} V`)}${text(525, 125, `${diagram.resistance} Ω`)}`;
      description = `An ideal closed circuit: ${diagram.voltage} volt source and ${diagram.resistance} ohm resistor`; break;
    case 'cells':
      drawing = `<path d="M75 120H525" class="wire"/>${Array.from({ length: diagram.cells }, (_, i) => { const x = 80 + i * 145; return `<rect x="${x}" y="70" width="115" height="100" rx="8" class="signal-block"/>${text(x + 18, 112, '−')}${text(x + 95, 112, '+')}${text(x + 57, 147, '1.5 V')}`; }).join('')}${text(300, 220, 'Identical cells connected in series')}`;
      description = `${diagram.cells} 1.5 volt cells in series with the same polarity`; break;
    case 'waveform':
      drawing = `<path d="M30 120H570" class="axis"/><g transform="translate(30,10)"><path d="${signalPath(t => modulatedSignal(t, diagram.mode, 0.7).value, { width: 540, height: 220, amplitude: 50 })}" class="radio-path"/></g>${text(300, 245, 'Time → (schematic, not to scale)')}`;
      description = 'An unlabelled carrier waveform showing its height and cycle spacing over time'; break;
    case 'transmitter':
      drawing = `<path d="M20 145H580M235 52V116" class="wire"/>${box(15, 116, 125, 'Oscillator')}${box(170, 116, 125, 'X')}${box(325, 116, 125, 'RF amplifier')}${box(480, 116, 110, 'Antenna')}${text(235, 35, 'Message input')}`;
      description = 'Transmitter block diagram: oscillator, block X with a message input, RF amplifier and antenna'; break;
    case 'pattern': {
      let path = '';
      for (let i = 0; i <= 180; i++) {
        const angle = i / 180 * 2 * Math.PI;
        const r = diagram.pattern === 'dipole' ? 95 * Math.abs(Math.sin(angle)) : 10 + 105 * ((1 + Math.cos(angle)) / 2) ** 4;
        path += `${i ? 'L' : 'M'}${300 + r * Math.cos(angle)},${130 + r * Math.sin(angle)} `;
      }
      drawing = `<path d="M160 130H440M300 15V245" class="axis"/><path d="${path}Z" class="radiation-pattern"/>${text(300, 16, 'Up')}${text(300, 260, 'Down')}${text(125, 135, 'Left')}${text(475, 135, 'Right')}`;
      description = 'Antenna response pattern with up, down, left and right directions labelled'; break;
    }
    default: throw new Error(`Unknown question diagram: ${diagram.type}`);
  }
  return `<svg class="question-diagram" viewBox="0 0 600 275" role="img" aria-label="${esc(description)}">${drawing}</svg>`;
}
