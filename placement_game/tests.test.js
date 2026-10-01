// placement_game/tests.test.js - Unit tests for Floorplanning Game & i18n
const test = require('node:test');
const assert = require('node:assert');
const { I18N } = require('./i18n.js');
const { LEVELS } = require('./script.js');

test.describe('i18n Translation & Formatting Module', () => {

  test.it('AAA - Happy Path: Returns correct English level titles and descriptions', () => {
    // Arrange
    const level1Id = 1;
    const level2Id = 2;

    // Act
    const level1Title = I18N.levels[level1Id].title;
    const level2Title = I18N.levels[level2Id].title;

    // Assert
    assert.strictEqual(level1Title, 'Level 1: Introduction');
    assert.strictEqual(level2Title, 'Level 2: PhD Benchmark (11 Qubits)');
  });

  test.it('AAA - Happy Path: Formats fixed block constraint messages in English', () => {
    // Arrange
    const blockId = 0;
    const row = 1;
    const col = 2;

    // Act
    const formatted = I18N.messages.fixedBlock(blockId, row, col);

    // Assert
    assert.strictEqual(formatted, 'Block <b>0</b> fixed at position <b>(1, 2)</b>.');
  });

  test.it('AAA - Happy Path: Formats boundary restriction messages in English', () => {
    // Arrange
    const blockId = 2;
    const bndName = I18N.boundaries['N'];

    // Act
    const formatted = I18N.messages.boundaryRestricted(blockId, bndName);

    // Assert
    assert.strictEqual(bndName, 'North (Top)');
    assert.strictEqual(formatted, 'Block <b>2</b> restricted to boundary <b>North (Top)</b>.');
  });

  test.it('AAA - Edge Case: Handles boundary keys for all directions (N, S, W, E, any)', () => {
    // Arrange
    const keys = ['N', 'S', 'W', 'E', 'any'];

    // Act & Assert
    for (const key of keys) {
      assert.ok(I18N.boundaries[key], `Boundary key ${key} should exist`);
      assert.strictEqual(typeof I18N.boundaries[key], 'string');
    }
  });

  test.it('AAA - Edge Case: Formats toast messages with dynamic parameters and special boundary values', () => {
    // Arrange
    const levelTitle = 'Level 3: Intermediate';
    const blockId = 5;
    const boundary = 'E';

    // Act
    const loadedMsg = I18N.messages.levelLoaded(levelTitle);
    const boundaryToast = I18N.messages.boundaryViolationToast(blockId, boundary);
    const boundaryTag = I18N.messages.boundaryTag(boundary);

    // Assert
    assert.strictEqual(loadedMsg, 'Level 3: Intermediate loaded!');
    assert.strictEqual(boundaryToast, 'Block 5 must be placed on the E boundary!');
    assert.strictEqual(boundaryTag, 'Boundary: E');
  });

  test.it('AAA - Exception/Error Case: Safely handles undefined or out-of-range level requests in helper logic', () => {
    // Arrange
    const nonExistentLevelId = 999;

    // Act & Assert
    assert.strictEqual(I18N.levels[nonExistentLevelId], undefined);
    assert.throws(() => {
      // Simulate attempting to read title from undefined level without safe check
      const title = I18N.levels[nonExistentLevelId].title;
    }, TypeError);
  });
});

test.describe('Game Levels Configuration (English Verification)', () => {

  test.it('AAA - Happy Path: All levels contain English titles and descriptions', () => {
    // Arrange & Act
    const levelIds = [1, 2, 3, 4];

    // Assert
    for (const id of levelIds) {
      const lvl = LEVELS[id];
      assert.ok(lvl, `Level ${id} should exist`);
      assert.ok(lvl.title.startsWith('Level'), `Level ${id} title should start with "Level"`);
      assert.strictEqual(typeof lvl.desc, 'string');
      assert.ok(lvl.desc.length > 10);
    }
  });

  test.it('AAA - Edge Case: Verify specific constraints data integrity for Level 2 (PhD Benchmark)', () => {
    // Arrange
    const level2 = LEVELS[2];

    // Act
    const fixedBlocks = level2.fixed_positions;
    const boundaryBlocks = level2.boundary_constraints;

    // Assert
    assert.deepStrictEqual(fixedBlocks, { 0: [0, 0], 1: [2, 1] });
    assert.deepStrictEqual(boundaryBlocks, { 2: 'N', 3: 'S', 4: 'E' });
    assert.strictEqual(level2.allow_rotation, false);
  });

  test.it('AAA - Error Case: Validates level schema integrity for missing required keys', () => {
    // Arrange
    const inspectLevel = (lvl) => {
      if (!lvl.block_sizes || !lvl.M || !lvl.N) {
        throw new Error('Invalid level configuration schema');
      }
      return true;
    };

    // Act & Assert
    assert.doesNotThrow(() => inspectLevel(LEVELS[1]));
    assert.throws(() => inspectLevel({ id: 99 }), /Invalid level configuration schema/);
  });
});

test.describe('Simulated Annealing & Password Security Module', () => {
  const { checkOptimizerPassword, runSimulatedAnnealing } = require('./script.js');

  test.it('AAA - Password Security: Validates "riscv" password correctly (case-insensitive & trimmed)', () => {
    // Arrange & Act & Assert
    assert.strictEqual(checkOptimizerPassword('riscv'), true);
    assert.strictEqual(checkOptimizerPassword('RISCV'), true);
    assert.strictEqual(checkOptimizerPassword('  riscv  '), true);
    assert.strictEqual(checkOptimizerPassword('wrong_password'), false);
    assert.strictEqual(checkOptimizerPassword('1234'), false);
    assert.strictEqual(checkOptimizerPassword(''), false);
    assert.strictEqual(checkOptimizerPassword(null), false);
  });

  test.it('AAA - Simulated Annealing Engine: Finds valid solution for Level 2 (PhD Benchmark)', async () => {
    // Act
    const result = await runSimulatedAnnealing(2);

    // Assert
    assert.ok(result, 'Result should not be null');
    assert.strictEqual(result.valid, true, 'SA solution should be valid with 0 overlaps and boundary constraints satisfied');
    assert.ok(result.bestEnergy <= 115.0, 'SA best cost for Level 2 should be close to optimal 110.00');
  });

  test.it('AAA - Simulated Annealing Engine: Finds valid solution for Level 1', async () => {
    // Act
    const result = await runSimulatedAnnealing(1);

    // Assert
    assert.ok(result, 'Result should not be null');
    assert.strictEqual(result.valid, true, 'SA solution for Level 1 should be valid');
  });
});

test.describe('Theme Switcher Module (Dark & Light States)', () => {
  const { applyTheme, toggleTheme } = require('./script.js');

  test.it('AAA - Theme Switcher: Successfully executes applyTheme without error in Node environment', () => {
    assert.doesNotThrow(() => applyTheme('light'));
    assert.doesNotThrow(() => applyTheme('dark'));
  });

  test.it('AAA - Theme Switcher: Toggles between light and dark themes smoothly', () => {
    assert.doesNotThrow(() => toggleTheme());
  });
});

test.describe('Cost Hamiltonian Breakdown Module (H_cost / QUBO / Ising)', () => {
  const { calculateExactQUBOCostBreakdown, generateQubitMap, LEVELS } = require('./script.js');

  test.it('AAA - Cost Hamiltonian: Evaluates H_alloc, H_overlap, H_dist breakdown object correctly', () => {
    // Act
    generateQubitMap();
    const xDummy = new Array(10).fill(0);
    const bd = calculateExactQUBOCostBreakdown(xDummy);

    // Assert
    assert.ok(bd, 'Breakdown object should exist');
    assert.strictEqual(typeof bd.h_alloc, 'number');
    assert.strictEqual(typeof bd.h_overlap, 'number');
    assert.strictEqual(typeof bd.h_dist, 'number');
    assert.strictEqual(typeof bd.h_cost, 'number');
    assert.strictEqual(bd.h_cost, bd.h_alloc + bd.h_overlap + bd.h_dist);
  });
});


test.describe('QAOA state-vector simulator', () => {
  const qaoa = require('./qaoa.js');
  test.it('accepts 15 qubits and rejects 16 before evaluating costs', async () => {
    assert.strictEqual(qaoa.supported(15), true);
    assert.strictEqual(qaoa.supported(16), false);
    await assert.rejects(qaoa.solve(16, () => { throw new Error('must not evaluate'); }), /1–15/);
    const state = qaoa.state(new Float64Array(2 ** 15), 0, 0);
    assert.ok(Math.abs(state.probabilities.reduce((a, b) => a + b, 0) - 1) < 1e-10);
  });
  test.it('matches an analytic one-qubit circuit and conserves probability', () => {
    const result = qaoa.state([0, 1], Math.PI / 2, Math.PI / 4);
    assert.ok(result.probabilities[1] > 1 - 1e-12);
    assert.ok(Math.abs(result.expectation - 1) < 1e-12);
    const uniform = qaoa.state([0, 1, 2, 3], 0, 0.7);
    uniform.probabilities.forEach(p => assert.ok(Math.abs(p - 0.25) < 1e-12));
  });
  test.it('optimizes expectation and returns an actually measured energy', async () => {
    const result = await qaoa.solve(1, bits => bits[0], { random: () => 0.5, shots: 32 });
    assert.ok(result.expectation < 0.01);
    assert.deepStrictEqual(result.bits, [0]);
    assert.strictEqual(result.bestEnergy, 0);
  });
  test.it('uses full mapping counts and rejects oversized game levels', async () => {
    const game = require('./script.js');
    for (const [level, count] of [[1, 30], [2, 11], [3, 122], [4, 643]]) {
      game.loadLevel(level);
      assert.strictEqual(game.getQubitCount(), count);
      if (count > 15) await assert.rejects(game.runQAOA(level), /15 qubits/);
    }
  });
  test.it('runs the benchmark with the existing QUBO Hamiltonian', async () => {
    const game = require('./script.js');
    let seed = 42;
    const random = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 2 ** 32);
    const result = await game.runQAOA(2, { random });
    assert.strictEqual(result.bits.length, 11);
    assert.strictEqual(result.bestEnergy, game.calculateExactQUBOCost(result.bits));
    assert.ok(Number.isFinite(result.expectation));
    assert.strictEqual(typeof result.valid, 'boolean');
  });
});
