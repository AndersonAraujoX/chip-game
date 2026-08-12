// i18n.js - Internationalization and text formatting module

const I18N = {
  levels: {
    1: {
      title: "Level 1: Introduction",
      desc: "A small 3x3 grid with 3 blocks. Place all blocks on the grid without overlaps. Try to keep connected blocks close together."
    },
    2: {
      title: "Level 2: PhD Benchmark (11 Qubits)",
      desc: "The exact classical vs quantum benchmark problem from the PhD study (run_comparison.py). The grid is 3x3 with 5 blocks. Blocks 0 and 1 are fixed. Blocks 2, 3, and 4 have hard boundary constraints."
    },
    3: {
      title: "Level 3: Intermediate",
      desc: "A 5x5 grid with 6 blocks. Features larger blocks and a more complex wiring network. Pay attention to the boundary constraints on blocks 3 and 4."
    },
    4: {
      title: "Level 4: Complex Challenge",
      desc: "An 8x8 grid with 10 blocks of various sizes. Block 0 is locked at the starting position. Find a collision-free solution with the shortest possible wiring."
    }
  },
  boundaries: {
    N: "North (Top)",
    S: "South (Bottom)",
    W: "West (Left)",
    E: "East (Right)",
    any: "Any Boundary"
  },
  messages: {
    fixedBlock: (id, row, col) => `Block <b>${id}</b> fixed at position <b>(${row}, ${col})</b>.`,
    boundaryRestricted: (id, bndName) => `Block <b>${id}</b> restricted to boundary <b>${bndName}</b>.`,
    rotationDisabled: "Block rotation <b>disabled</b> for this test case.",
    noHardConstraints: "No initial spatial hard constraints.",
    levelLoaded: (title) => `${title} loaded!`,
    boundaryViolationToast: (id, bnd) => `Block ${id} must be placed on the ${bnd} boundary!`,
    rotationDisabledToast: "Block rotation disabled for this level.",
    insufficientSpaceToast: "Insufficient space to rotate!",
    layoutResetToast: "Layout reset!",
    phdSuccessToast: "Congratulations! You found the optimal classical/quantum layout for the PhD benchmark!",
    exportClipboardToast: "Layout copied to Clipboard (JSON)!",
    exportDownloadToast: "Download of layout JSON started!",
    yes: "Yes",
    no: "No",
    rotateTooltip: "Rotate 90 degrees (Keyboard: R)",
    boundaryTag: (bnd) => `Boundary: ${bnd}`,
    saButton: "⚡ Simulated Annealing",
    saTooltip: "Run Simulated Annealing Optimizer (Password Required)",
    passwordPromptTitle: "🔒 Optimizer Security",
    passwordPromptDesc: "Enter password to access Simulated Annealing optimizer:",
    passwordPlaceholder: "Password...",
    passwordErrorToast: "Incorrect password! Access denied.",
    passwordSuccessToast: "Access granted! Running Simulated Annealing...",
    saRunningToast: "Running Simulated Annealing optimization...",
    saSuccessToast: (cost) => `Simulated Annealing completed! Best cost: ${cost.toFixed(2)}`,
    cancel: "Cancel",
    confirm: "Unlock & Optimize"
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { I18N };
}
