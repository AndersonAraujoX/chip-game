// State-vector QAOA, p=1. Reference: https://arxiv.org/abs/1411.4028
// Bit i encodes mapping entry i (least significant bit first).
const QAOA = (() => {
  const MAX_QUBITS = 15;
  const supported = n => Number.isInteger(n) && n > 0 && n <= MAX_QUBITS;
  function validate(n) {
    if (!supported(n)) throw new RangeError('QAOA requires 1–15 qubits.');
  }
  function state(energies, gamma, beta) {
    const n = Math.log2(energies.length);
    validate(n);
    const re = new Float64Array(energies.length);
    const im = new Float64Array(energies.length);
    const amplitude = 1 / Math.sqrt(energies.length);
    for (let k = 0; k < re.length; k++) {
      re[k] = amplitude * Math.cos(gamma * energies[k]);
      im[k] = -amplitude * Math.sin(gamma * energies[k]);
    }
    const c = Math.cos(beta), s = Math.sin(beta);
    for (let q = 0; q < n; q++) {
      const bit = 2 ** q;
      for (let k = 0; k < re.length; k++) {
        if (k & bit) continue;
        const j = k | bit;
        const ar = re[k], ai = im[k], br = re[j], bi = im[j];
        re[k] = c * ar + s * bi;
        im[k] = c * ai - s * br;
        re[j] = c * br + s * ai;
        im[j] = c * bi - s * ar;
      }
    }
    const probabilities = re.map((v, k) => v * v + im[k] * im[k]);
    const expectation = probabilities.reduce((sum, p, k) => sum + p * energies[k], 0);
    return { probabilities, expectation };
  }
  async function solve(n, cost, { shots = 2048, random = Math.random, onProgress = () => {} } = {}) {
    validate(n); // Before allocating exponential memory or evaluating costs.
    if (!Number.isInteger(shots) || shots < 1) throw new RangeError('Invalid shots');
    const energies = new Float64Array(2 ** n);
    for (let k = 0; k < energies.length; k++) {
      energies[k] = cost(Array.from({ length: n }, (_, i) => (k >> i) & 1));
      if (!Number.isFinite(energies[k])) throw new Error('Non-finite QUBO energy');
      if (k % 256 === 0) await new Promise(resolve => setTimeout(resolve, 0));
    }
    // Scale phases to avoid highly oscillatory parameter search; report original energies.
    const scale = Math.max(1, ...energies.map(Math.abs));
    const scaled = energies.map(e => e / scale);
    let best = { expectation: Infinity };
    let gamma = 0, beta = 0;
    for (let g = 0; g < 12; g++) {
      for (let b = 0; b < 8; b++) {
        const trialGamma = g * Math.PI / 3, trialBeta = b * Math.PI / 8;
        const trial = state(scaled, trialGamma, trialBeta);
        if (trial.expectation < best.expectation) {
          best = trial; gamma = trialGamma; beta = trialBeta;
        }
      }
      onProgress(Math.round((g + 1) / 12 * 75));
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    for (let step = 0.3; step > 0.01; step /= 2) {
      for (const [dg, db] of [[step, 0], [-step, 0], [0, step], [0, -step]]) {
        const trial = state(scaled, gamma + dg, beta + db);
        if (trial.expectation < best.expectation) {
          best = trial; gamma += dg; beta += db;
        }
      }
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    const cumulative = new Float64Array(energies.length);
    best.probabilities.reduce((sum, p, k) => (cumulative[k] = sum + p), 0);
    let measured = 0, bestEnergy = Infinity;
    for (let shot = 0; shot < shots; shot++) {
      const draw = random() * cumulative[cumulative.length - 1];
      let lo = 0, hi = cumulative.length - 1;
      while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if (draw < cumulative[mid]) hi = mid; else lo = mid + 1;
      }
      if (energies[lo] < bestEnergy) { measured = lo; bestEnergy = energies[lo]; }
    }
    onProgress(100);
    return { bits: Array.from({ length: n }, (_, i) => (measured >> i) & 1),
      bestEnergy, expectation: best.expectation * scale, gamma: gamma / scale, beta, shots };
  }
  return { MAX_QUBITS, supported, state, solve };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = QAOA;
