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
