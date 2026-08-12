// Otimizador de Layout de Chips (Floorplanning) - Engine de Jogo e Solucionador SA
// Anderson Araújo - Doutorado

// 1. Configurações dos Níveis do Jogo
const LEVELS = {
  1: {
    id: 1,
    title: "Level 1: Introduction",
    desc: "A small 3x3 grid with 3 blocks. Place all blocks on the grid without overlaps. Try to keep connected blocks close together.",
    M: 3,
    N: 3,
    block_sizes: {
      0: [1, 2], // [W, H]
      1: [1, 1],
      2: [1, 1]
    },
    fixed_positions: {},
    boundary_constraints: {},
    proximity_affinity: {
      "0-1": 15.0, // High affinity between Block 0 and Block 1
      "1-2": 5.0
    },
    allow_rotation: true,
    optimal_cost: 0.0
  },
  2: {
    id: 2,
    title: "Level 2: PhD Benchmark (11 Qubits)",
    desc: "The exact classical vs quantum benchmark problem from the PhD study (run_comparison.py). The grid is 3x3 with 5 blocks. Blocks 0 and 1 are fixed. Blocks 2, 3, and 4 have hard boundary constraints.",
    M: 3,
    N: 3,
    block_sizes: {
      0: [1, 2],
      1: [2, 1],
      2: [1, 1],
      3: [1, 1],
      4: [1, 1]
    },
    fixed_positions: {
      0: [0, 0], // Block 0 fixed at m=0, n=0 (rot=0 implicit)
      1: [2, 1]  // Block 1 fixed at m=2, n=1 (rot=0 implicit)
    },
    boundary_constraints: {
      2: 'N', // Block 2 on North boundary (m=0)
      3: 'S', // Block 3 on South boundary (m=2)
      4: 'E'  // Block 4 on East boundary (n=2)
    },
    proximity_affinity: {}, // All blocks connected by classical distance (lambda_dist)
    allow_rotation: false, // Per run_comparison.py
    optimal_cost: 13.50
  },
  3: {
    id: 3,
    title: "Level 3: Intermediate",
    desc: "A 5x5 grid with 6 blocks. Features larger blocks and a more complex wiring network. Pay attention to the boundary constraints on blocks 3 and 4.",
    M: 5,
    N: 5,
    block_sizes: {
      0: [2, 2],
      1: [1, 2],
      2: [2, 1],
      3: [1, 1],
      4: [1, 1],
      5: [2, 2]
    },
    fixed_positions: {},
    boundary_constraints: {
      3: 'W', // West boundary (n=0)
      4: 'E'  // East boundary (n=4)
    },
    proximity_affinity: {
      "0-1": 8.0,
      "0-5": 12.0,
      "1-2": 5.0,
      "3-4": 10.0,
      "2-4": 4.0
    },
    allow_rotation: true,
    optimal_cost: 30.0
  },
  4: {
    id: 4,
    title: "Level 4: Complex Challenge",
    desc: "An 8x8 grid with 10 blocks of various sizes. Block 0 is locked at the starting position. Find a collision-free solution with the shortest possible wiring.",
    M: 8,
    N: 8,
    block_sizes: {
      0: [3, 3],
      1: [2, 2],
      2: [1, 3],
      3: [3, 1],
      4: [2, 1],
      5: [1, 2],
      6: [1, 1],
      7: [1, 1],
      8: [2, 2],
      9: [2, 1]
    },
    fixed_positions: {
      0: [0, 0]
    },
    boundary_constraints: {
      6: 'S',
      7: 'S'
    },
    proximity_affinity: {
      "0-1": 8.0,
      "1-2": 5.0,
      "2-3": 10.0,
      "3-4": 4.0,
      "4-5": 6.0,
      "5-6": 2.0,
      "6-7": 8.0,
      "7-8": 7.0,
      "8-9": 5.0,
      "0-9": 10.0
    },
    allow_rotation: true,
    optimal_cost: 65.0
  }
};

// Cores harmoniosas HSL para cada bloco
const BLOCK_COLORS = [
  "hsl(210, 80%, 45%)", // Azul
  "hsl(150, 70%, 40%)", // Verde
  "hsl(280, 75%, 45%)", // Roxo
  "hsl(30, 85%, 45%)",  // Laranja
  "hsl(330, 80%, 45%)", // Rosa
  "hsl(180, 70%, 35%)", // Ciano
  "hsl(260, 60%, 45%)", // Violeta escuro
  "hsl(80, 65%, 40%)",  // Verde lima
  "hsl(350, 75%, 45%)", // Vermelho escuro
  "hsl(200, 80%, 40%)"  // Azul claro
];

// 2. Estado Global do Jogo
let currentLevelId = 1; // Começa no Nível 1 (Introdução)
let gridM = 3;
let gridN = 3;
let blocks = {}; // Estado físico de cada bloco: { id: { placed: bool, m: int, n: int, rot: int, W: int, H: int, W_orig: int, H_orig: int, fixed: bool, boundary: string } }
let qubitMap = []; // Qubits lógicos gerados para o nível

// Parâmetros de Custo
let lambdaAlloc = 50.0;
let lambdaOverlap = 50.0;
let lambdaDist = 5.0;



// Drag & Drop
let activeDragBlockId = null;
let dragOffset = { x: 0, y: 0 };
let currentHoverCell = null;

// Elementos da DOM
const gridBoard = typeof document !== 'undefined' ? document.getElementById("grid-board") : null;
const gridWrapper = typeof document !== 'undefined' ? document.getElementById("grid-wrapper") : null;
const placedBlocksContainer = typeof document !== 'undefined' ? document.getElementById("placed-blocks-container") : null;
const blocksShelf = typeof document !== 'undefined' ? document.getElementById("blocks-shelf") : null;
const wiringOverlay = typeof document !== 'undefined' ? document.getElementById("wiring-overlay") : null;
const levelSelect = typeof document !== 'undefined' ? document.getElementById("level-select") : null;
const levelTitle = typeof document !== 'undefined' ? document.getElementById("level-title") : null;
const levelDesc = typeof document !== 'undefined' ? document.getElementById("level-desc") : null;
const levelConstraintsList = typeof document !== 'undefined' ? document.getElementById("level-constraints-list") : null;

// Stats DOM
const statTotalCost = typeof document !== 'undefined' ? document.getElementById("stat-total-cost") : null;
const statValid = typeof document !== 'undefined' ? document.getElementById("stat-valid") : null;
const statOverlaps = typeof document !== 'undefined' ? document.getElementById("stat-overlaps") : null;
const statWirelength = typeof document !== 'undefined' ? document.getElementById("stat-wirelength") : null;

// Inputs DOM
const inputLambdaAlloc = typeof document !== 'undefined' ? document.getElementById("lambda-alloc") : null;
const inputLambdaOverlap = typeof document !== 'undefined' ? document.getElementById("lambda-overlap") : null;
const inputLambdaDist = typeof document !== 'undefined' ? document.getElementById("lambda-dist") : null;
const valLambdaAlloc = typeof document !== 'undefined' ? document.getElementById("val-lambda-alloc") : null;
const valLambdaOverlap = typeof document !== 'undefined' ? document.getElementById("val-lambda-overlap") : null;
const valLambdaDist = typeof document !== 'undefined' ? document.getElementById("val-lambda-dist") : null;

const btnReset = typeof document !== 'undefined' ? document.getElementById("btn-reset") : null;
const btnExport = typeof document !== 'undefined' ? document.getElementById("btn-export") : null;
const doutoradoComparison = typeof document !== 'undefined' ? document.getElementById("doutorado-comparison") : null;
const compManual = typeof document !== 'undefined' ? document.getElementById("comp-manual") : null;

// Password & SA DOM Elements
let isOptimizerUnlocked = false;
const PASSWORD_REQUIRED = "riscv";

const btnSaSolve = typeof document !== 'undefined' ? document.getElementById("btn-sa-solve") : null;
const passwordModal = typeof document !== 'undefined' ? document.getElementById("password-modal") : null;
const saPasswordInput = typeof document !== 'undefined' ? document.getElementById("sa-password-input") : null;
const btnSubmitPassword = typeof document !== 'undefined' ? document.getElementById("btn-submit-password") : null;
const btnCancelPassword = typeof document !== 'undefined' ? document.getElementById("btn-cancel-password") : null;

// 3. Inicialização
function init() {
  setupEventListeners();
  loadLevel(currentLevelId);
}

function setupEventListeners() {
  levelSelect.addEventListener("change", (e) => {
    currentLevelId = parseInt(e.target.value);
    loadLevel(currentLevelId);
  });

  inputLambdaAlloc.addEventListener("input", (e) => {
    lambdaAlloc = parseFloat(e.target.value);
    valLambdaAlloc.textContent = lambdaAlloc.toFixed(1);
    updateStatsAndWiring();
  });

  inputLambdaOverlap.addEventListener("input", (e) => {
    lambdaOverlap = parseFloat(e.target.value);
    valLambdaOverlap.textContent = lambdaOverlap.toFixed(1);
    updateStatsAndWiring();
  });

  inputLambdaDist.addEventListener("input", (e) => {
    lambdaDist = parseFloat(e.target.value);
    valLambdaDist.textContent = lambdaDist.toFixed(1);
    updateStatsAndWiring();
  });

  btnReset.addEventListener("click", () => {
    resetLayout();
  });

  btnExport.addEventListener("click", exportLayout);

  if (btnSaSolve) {
    btnSaSolve.addEventListener("click", () => {
      if (isOptimizerUnlocked) {
        runSimulatedAnnealing();
      } else {
        openPasswordModal();
      }
    });
  }

  if (btnSubmitPassword) {
    btnSubmitPassword.addEventListener("click", handlePasswordSubmit);
  }

  if (btnCancelPassword) {
    btnCancelPassword.addEventListener("click", closePasswordModal);
  }

  if (saPasswordInput) {
    saPasswordInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        handlePasswordSubmit();
      } else if (e.key === "Escape") {
        closePasswordModal();
      }
    });
  }

  // Evento global de redimensionamento para ajustar as fiações SVG
  window.addEventListener("resize", () => {
    drawWiring();
  });

  // Rotação via teclado (Tecla 'R')
  document.addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() === 'r' && activeDragBlockId !== null) {
      e.preventDefault();
      rotateBlock(activeDragBlockId);
    }
  });
}

// 4. Carregamento de Nível
function loadLevel(levelId) {
  const level = LEVELS[levelId];
  gridM = level.M;
  gridN = level.N;
  
  if (levelTitle) levelTitle.textContent = level.title;
  
  // Update display of hard constraints in side panel
  if (levelConstraintsList) {
    levelConstraintsList.innerHTML = "";
    let hasRules = false;
    
    if (Object.keys(level.fixed_positions).length > 0) {
      hasRules = true;
      for (let bid in level.fixed_positions) {
        let pos = level.fixed_positions[bid];
        let li = document.createElement("li");
        li.innerHTML = typeof I18N !== 'undefined' ? I18N.messages.fixedBlock(bid, pos[0], pos[1]) : `Block <b>${bid}</b> fixed at position <b>(${pos[0]}, ${pos[1]})</b>.`;
        levelConstraintsList.appendChild(li);
      }
    }
    
    if (Object.keys(level.boundary_constraints).length > 0) {
      hasRules = true;
      for (let bid in level.boundary_constraints) {
        let bnd = level.boundary_constraints[bid];
        let bndName = (typeof I18N !== 'undefined' && I18N.boundaries[bnd]) ? I18N.boundaries[bnd] : (bnd === 'N' ? 'North (Top)' : bnd === 'S' ? 'South (Bottom)' : bnd === 'W' ? 'West (Left)' : 'East (Right)');
        let li = document.createElement("li");
        li.innerHTML = typeof I18N !== 'undefined' ? I18N.messages.boundaryRestricted(bid, bndName) : `Block <b>${bid}</b> restricted to boundary <b>${bndName}</b>.`;
        levelConstraintsList.appendChild(li);
      }
    }

    if (levelId === 2) {
      let li = document.createElement("li");
      li.innerHTML = typeof I18N !== 'undefined' ? I18N.messages.rotationDisabled : `Block rotation <b>disabled</b> for this test case.`;
      levelConstraintsList.appendChild(li);
    }
    
    if (!hasRules) {
      let li = document.createElement("li");
      li.textContent = typeof I18N !== 'undefined' ? I18N.messages.noHardConstraints : "No initial spatial hard constraints.";
      levelConstraintsList.appendChild(li);
    }
  }

  // Display PhD benchmarks for Level 2
  if (doutoradoComparison) {
    if (levelId === 2) {
      doutoradoComparison.style.display = "block";
    } else {
      doutoradoComparison.style.display = "none";
    }
  }

  // Reset parameters to level default values if Level 2
  if (levelId === 2) {
    lambdaAlloc = 50.0;
    lambdaOverlap = 50.0;
    lambdaDist = 5.0;
    
    if (inputLambdaAlloc) inputLambdaAlloc.value = 50;
    if (inputLambdaOverlap) inputLambdaOverlap.value = 50;
    if (inputLambdaDist) inputLambdaDist.value = 5;
    
    if (valLambdaAlloc) valLambdaAlloc.textContent = "50.0";
    if (valLambdaOverlap) valLambdaOverlap.textContent = "50.0";
    if (valLambdaDist) valLambdaDist.textContent = "5.0";
  }

  // Initialize blocks data structure
  blocks = {};
  for (let bid in level.block_sizes) {
    const size = level.block_sizes[bid];
    const isFixed = level.fixed_positions[bid] !== undefined;
    const boundary = level.boundary_constraints[bid] || null;
    
    blocks[bid] = {
      id: parseInt(bid),
      placed: false,
      m: -1,
      n: -1,
      rot: 0,
      W: size[0],
      H: size[1],
      W_orig: size[0],
      H_orig: size[1],
      fixed: isFixed,
      boundary: boundary
    };

    // If fixed, position immediately
    if (isFixed) {
      const pos = level.fixed_positions[bid];
      blocks[bid].m = pos[0];
      blocks[bid].n = pos[1];
      blocks[bid].placed = true;
    }
  }

  // Generate qubit_map for exact QUBO cost evaluation
  generateQubitMap();

  // Render physical grid
  renderGrid();
  
  // Render shelf and placed blocks
  renderShelfAndPlaced();
  
  // Calculate and update wiring and stats
  updateStatsAndWiring();
  
  const loadedMsg = typeof I18N !== 'undefined' ? I18N.messages.levelLoaded(level.title) : `${level.title} loaded!`;
  showToast(loadedMsg, "info");
}

// 5. Geração do Mapeamento de Qubits Lógicos (Semelhante ao mapping.py em Python)
function generateQubitMap() {
  const level = LEVELS[currentLevelId];
  qubitMap = [];
  
  for (let bid in level.block_sizes) {
    const W = level.block_sizes[bid][0];
    const H = level.block_sizes[bid][1];
    
    // Caso A: Bloco Fixo
    if (level.fixed_positions[bid] !== undefined) {
      const pos = level.fixed_positions[bid];
      // Em run_comparison.py, allow_rotation é False, então rot=0
      if (level.allow_rotation) {
        qubitMap.push({ alpha: parseInt(bid), m: pos[0], n: pos[1], rot: 0 });
      } else {
        qubitMap.push({ alpha: parseInt(bid), m: pos[0], n: pos[1] });
      }
      continue;
    }
    
    // Caso B: Bloco Livre
    let rotations = [0];
    if (level.allow_rotation && W !== H) {
      rotations.push(1);
    }
    
    for (let rot of rotations) {
      const W_eff = rot === 0 ? W : H;
      const H_eff = rot === 0 ? H : W;
      
      const max_m = gridM - H_eff + 1;
      const max_n = gridN - W_eff + 1;
      
      for (let m = 0; m < max_m; m++) {
        for (let n = 0; n < max_n; n++) {
          // Filtro de restrição de fronteira
          if (level.boundary_constraints[bid] !== undefined) {
            const constraint = level.boundary_constraints[bid];
            const is_north = (m === 0);
            const is_south = (m === gridM - H_eff);
            const is_west = (n === 0);
            const is_east = (n === gridN - W_eff);
            
            if (constraint === 'N' && !is_north) continue;
            if (constraint === 'S' && !is_south) continue;
            if (constraint === 'W' && !is_west) continue;
            if (constraint === 'E' && !is_east) continue;
            if (constraint === 'any' && !(is_north || is_south || is_west || is_east)) continue;
          }
          
          if (level.allow_rotation) {
            qubitMap.push({ alpha: parseInt(bid), m, n, rot });
          } else {
            qubitMap.push({ alpha: parseInt(bid), m, n });
          }
        }
      }
    }
  }
}

// 6. Renderizadores Visuais
function renderGrid() {
  if (!gridBoard || !gridWrapper) return;
  gridBoard.innerHTML = "";
  gridBoard.style.gridTemplateRows = `repeat(${gridM}, 70px)`;
  gridBoard.style.gridTemplateColumns = `repeat(${gridN}, 70px)`;
  
  gridWrapper.style.width = `${gridN * 70}px`;
  gridWrapper.style.height = `${gridM * 70}px`;

  for (let m = 0; m < gridM; m++) {
    for (let n = 0; n < gridN; n++) {
      const cell = document.createElement("div");
      cell.classList.add("grid-cell");
      cell.dataset.row = m;
      cell.dataset.col = n;
      
      // Aplicar classes visuais de restrição de borda para ajudar o usuário
      if (m === 0) cell.classList.add("boundary-n");
      if (m === gridM - 1) cell.classList.add("boundary-s");
      if (n === 0) cell.classList.add("boundary-w");
      if (n === gridN - 1) cell.classList.add("boundary-e");
      
      gridBoard.appendChild(cell);
    }
  }
}

function renderShelfAndPlaced() {
  if (!blocksShelf || !placedBlocksContainer) return;
  // Limpar containers
  blocksShelf.innerHTML = "";
  placedBlocksContainer.innerHTML = "";
  
  for (let bid in blocks) {
    const block = blocks[bid];
    const blockEl = createBlockElement(block);
    
    if (block.placed) {
      positionPlacedBlock(block, blockEl);
      placedBlocksContainer.appendChild(blockEl);
    } else {
      const wrapper = document.createElement("div");
      wrapper.classList.add("shelf-block-wrapper");
      // Define tamanho fixo do wrapper na prateleira para manter a ordem
      wrapper.style.width = `${block.W_orig * 40}px`;
      wrapper.style.height = `${block.H_orig * 40}px`;
      
      // Ajusta tamanho do bloco na prateleira para caber visualmente (escala menor)
      blockEl.style.width = "100%";
      blockEl.style.height = "100%";
      blockEl.style.position = "static";
      
      wrapper.appendChild(blockEl);
      blocksShelf.appendChild(wrapper);
    }
  }
}

function createBlockElement(block) {
  const blockEl = document.createElement("div");
  blockEl.classList.add("block");
  blockEl.dataset.id = block.id;
  blockEl.style.backgroundColor = BLOCK_COLORS[block.id % BLOCK_COLORS.length];
  
  // Elementos internos
  const label = document.createElement("div");
  label.classList.add("block-label");
  label.textContent = `α = ${block.id}`;
  blockEl.appendChild(label);
  
  const dims = document.createElement("div");
  dims.classList.add("block-dimensions");
  dims.textContent = `${block.W}x${block.H}`;
  blockEl.appendChild(dims);
  
  if (block.boundary) {
    const req = document.createElement("div");
    req.classList.add("block-requirement");
    req.textContent = typeof I18N !== 'undefined' ? I18N.messages.boundaryTag(block.boundary) : `Boundary: ${block.boundary}`;
    blockEl.appendChild(req);
  }
  
  if (block.fixed) {
    blockEl.classList.add("fixed");
    blockEl.classList.add("is-fixed-tag");
  } else {
    // Quick rotation button
    const level = LEVELS[currentLevelId];
    if (level.allow_rotation && block.W_orig !== block.H_orig) {
      const rotBtn = document.createElement("div");
      rotBtn.classList.add("block-rotate-btn");
      rotBtn.innerHTML = "🔄";
      rotBtn.title = typeof I18N !== 'undefined' ? I18N.messages.rotateTooltip : "Rotate 90 degrees (Keyboard: R)";
      
      // Impede propagação do drag ao clicar no botão
      rotBtn.addEventListener("pointerdown", (e) => e.stopPropagation());
      rotBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        rotateBlock(block.id);
      });
      blockEl.appendChild(rotBtn);
    }
    
    // Configurar interatividade de drag & drop
    setupBlockDragging(blockEl);
  }

  // Duplo clique para rotacionar
  blockEl.addEventListener("dblclick", (e) => {
    if (!block.fixed) {
      rotateBlock(block.id);
    }
  });
  
  return blockEl;
}

function positionPlacedBlock(block, blockEl) {
  blockEl.style.position = "absolute";
  blockEl.style.left = `${block.n * 70 + 4}px`; // 4px de gap interno
  blockEl.style.top = `${block.m * 70 + 4}px`;
  blockEl.style.width = `${block.W * 70 - 8}px`;
  blockEl.style.height = `${block.H * 70 - 8}px`;
}

// 7. Drag and Drop com Pointer Events
function setupBlockDragging(blockEl) {
  blockEl.addEventListener("pointerdown", (e) => {
    const bid = parseInt(blockEl.dataset.id);
    if (blocks[bid].fixed) return;
    
    e.preventDefault();
    
    activeDragBlockId = bid;
    blockEl.classList.add("dragging");
    
    const block = blocks[bid];
    const width = block.W * 70 - 8;
    const height = block.H * 70 - 8;
    
    // Centraliza o drag sob o cursor
    dragOffset.x = width / 2;
    dragOffset.y = height / 2;
    
    // Anexa o bloco diretamente ao body antes de mudar para fixed
    // para evitar que seja afetado pelo backdrop-filter e overflow do painel pai
    document.body.appendChild(blockEl);
    
    blockEl.style.position = "fixed";
    blockEl.style.width = `${width}px`;
    blockEl.style.height = `${height}px`;
    blockEl.style.left = `${e.clientX - dragOffset.x}px`;
    blockEl.style.top = `${e.clientY - dragOffset.y}px`;
    blockEl.style.zIndex = "10000";
    
    // Destaque inicial de hover
    const wrapperRect = gridWrapper.getBoundingClientRect();
    const dropX = e.clientX - wrapperRect.left - dragOffset.x;
    const dropY = e.clientY - wrapperRect.top - dragOffset.y;
    const n = Math.round(dropX / 70);
    const m = Math.round(dropY / 70);
    highlightHoverCells(m, n, block.W, block.H);

    const handlePointerMove = (moveEvent) => {
      blockEl.style.left = `${moveEvent.clientX - dragOffset.x}px`;
      blockEl.style.top = `${moveEvent.clientY - dragOffset.y}px`;
      
      const wrRect = gridWrapper.getBoundingClientRect();
      const dx = moveEvent.clientX - wrRect.left - dragOffset.x;
      const dy = moveEvent.clientY - wrRect.top - dragOffset.y;
      
      const col = Math.round(dx / 70);
      const row = Math.round(dy / 70);
      
      highlightHoverCells(row, col, block.W, block.H);
    };

    const handlePointerUp = (upEvent) => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      
      // Remove o elemento temporário anexado ao body
      blockEl.remove();
      
      const wrRect = gridWrapper.getBoundingClientRect();
      const dx = upEvent.clientX - wrRect.left - dragOffset.x;
      const dy = upEvent.clientY - wrRect.top - dragOffset.y;
      
      const col = Math.round(dx / 70);
      const row = Math.round(dy / 70);
      
      const fits = (row >= 0 && row + block.H <= gridM && col >= 0 && col + block.W <= gridN);
      
      if (fits) {
        block.placed = true;
        block.m = row;
        block.n = col;
        checkBoundaryViolation(block);
      } else {
        block.placed = false;
        block.m = -1;
        block.n = -1;
      }
      
      activeDragBlockId = null;
      clearCellHoverAlerts();
      renderShelfAndPlaced();
      updateStatsAndWiring();
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  });
}

function highlightHoverCells(m, n, W, H) {
  clearCellHoverAlerts();
  
  for (let r = 0; r < gridM; r++) {
    for (let c = 0; c < gridN; c++) {
      if (r >= m && r < m + H && c >= n && c < n + W) {
        const cellEl = gridBoard.querySelector(`[data-row="${r}"][data-col="${c}"]`);
        if (cellEl) {
          cellEl.classList.add("overlap-alert");
        }
      }
    }
  }
}

function clearCellHoverAlerts() {
  const cells = gridBoard.querySelectorAll(".grid-cell");
  cells.forEach(c => c.classList.remove("overlap-alert"));
}

function checkBoundaryViolation(block) {
  if (!block.boundary) return true;
  
  const is_north = (block.m === 0);
  const is_south = (block.m === gridM - block.H);
  const is_west = (block.n === 0);
  const is_east = (block.n === gridN - block.W);
  
  let valid = false;
  if (block.boundary === 'N' && is_north) valid = true;
  else if (block.boundary === 'S' && is_south) valid = true;
  else if (block.boundary === 'W' && is_west) valid = true;
  else if (block.boundary === 'E' && is_east) valid = true;
  else if (block.boundary === 'any' && (is_north || is_south || is_west || is_east)) valid = true;
  
  if (!valid) {
    const msg = typeof I18N !== 'undefined' ? I18N.messages.boundaryViolationToast(block.id, block.boundary) : `Block ${block.id} must be placed on the ${block.boundary} boundary!`;
    showToast(msg, "warning");
    return false;
  }
  return true;
}

function rotateBlock(bid) {
  const level = LEVELS[currentLevelId];
  if (!level.allow_rotation) {
    const msg = typeof I18N !== 'undefined' ? I18N.messages.rotationDisabledToast : "Block rotation disabled for this level.";
    showToast(msg, "warning");
    return;
  }
  
  const block = blocks[bid];
  if (block.fixed) return;
  
  // Swap W and H
  const newW = block.H;
  const newH = block.W;
  
  block.W = newW;
  block.H = newH;
  block.rot = block.rot === 0 ? 1 : 0;
  
  // If placed, adjust position if it exceeds grid bounds
  if (block.placed) {
    if (block.m + block.H > gridM) {
      block.m = gridM - block.H; // Vertical nudge
    }
    if (block.n + block.W > gridN) {
      block.n = gridN - block.W; // Horizontal nudge
    }
    
    if (block.m < 0 || block.n < 0) {
      // Revert rotation if it still doesn't fit
      block.W = block.H;
      block.H = newW;
      block.rot = block.rot === 0 ? 1 : 0;
      const msg = typeof I18N !== 'undefined' ? I18N.messages.insufficientSpaceToast : "Insufficient space to rotate!";
      showToast(msg, "error");
    } else {
      checkBoundaryViolation(block);
    }
  }
  
  renderShelfAndPlaced();
  updateStatsAndWiring();
}

function resetLayout() {
  const level = LEVELS[currentLevelId];
  for (let bid in blocks) {
    const block = blocks[bid];
    if (block.fixed) continue;
    
    block.placed = false;
    block.m = -1;
    block.n = -1;
    block.rot = 0;
    block.W = block.W_orig;
    block.H = block.H_orig;
  }
  renderShelfAndPlaced();
  updateStatsAndWiring();
  const msg = typeof I18N !== 'undefined' ? I18N.messages.layoutResetToast : "Layout reset!";
  showToast(msg, "info");
}

// 8. Motores Matemáticos de Custo (Cálculos de QUBO / Ising)

// Gera o estado binário clássico 'x' a partir do estado atual do jogo
function getCurrentBinaryVector() {
  const x = new Array(qubitMap.length).fill(0);
  
  for (let i = 0; i < qubitMap.length; i++) {
    const item = qubitMap[i];
    const block = blocks[item.alpha];
    
    if (block && block.placed && block.m === item.m && block.n === item.n) {
      if (item.rot === undefined || block.rot === item.rot) {
        x[i] = 1;
      }
    }
  }
  return x;
}

// Função de cálculo de custos idêntica ao cost.py
function calculateExactQUBOCost(x) {
  const level = LEVELS[currentLevelId];
  const num_qubits = qubitMap.length;
  
  // 1. Alocação Única (C_alloc)
  const sum_x = {};
  for (let bid in level.block_sizes) {
    sum_x[bid] = 0.0;
  }
  for (let i = 0; i < num_qubits; i++) {
    const alpha_i = qubitMap[i].alpha;
    sum_x[alpha_i] += x[i];
  }
  
  let t1 = 0.0;
  let t_alloc = 0.0;
  for (let bid in level.block_sizes) {
    const s = sum_x[bid];
    t1 -= (s - 1.0); // Ajuste linear clássico do Hamiltoniano
    t_alloc += lambdaAlloc * Math.pow(s - 1.0, 2);
  }
  
  // 2. Sobreposição Física (C_overlap) - Tipo 'pair'
  let t_overlap = 0.0;
  for (let r = 0; r < gridM; r++) {
    for (let c = 0; c < gridN; c++) {
      const o = {};
      for (let bid in level.block_sizes) {
        o[bid] = 0.0;
      }
      
      for (let i = 0; i < num_qubits; i++) {
        const item = qubitMap[i];
        const alpha_i = item.alpha;
        const W_orig = level.block_sizes[alpha_i][0];
        const H_orig = level.block_sizes[alpha_i][1];
        
        const rot = level.allow_rotation ? item.rot : 0;
        const W = rot === 0 ? W_orig : H_orig;
        const H = rot === 0 ? H_orig : W_orig;
        
        if (item.m <= r && r < item.m + H && item.n <= c && c < item.n + W) {
          o[alpha_i] += x[i];
        }
      }
      
      const alphas = Object.keys(level.block_sizes).map(Number);
      for (let idx_a = 0; idx_a < alphas.length; idx_a++) {
        const alpha = alphas[idx_a];
        for (let idx_b = idx_a + 1; idx_b < alphas.length; idx_b++) {
          const beta = alphas[idx_b];
          t_overlap += o[alpha] * o[beta];
        }
      }
    }
  }
  
  // 3. Comprimento de Fiação e Proximidade (C_dist)
  let t_dist = 0.0;
  for (let i = 0; i < num_qubits; i++) {
    const item_i = qubitMap[i];
    const alpha_i = item_i.alpha;
    const W_orig_i = level.block_sizes[alpha_i][0];
    const H_orig_i = level.block_sizes[alpha_i][1];
    const rot_i = level.allow_rotation ? item_i.rot : 0;
    const W_i = rot_i === 0 ? W_orig_i : H_orig_i;
    const H_i = rot_i === 0 ? H_orig_i : W_orig_i;
    
    const cy_i = item_i.m + (H_i - 1) / 2.0;
    const cx_i = item_i.n + (W_i - 1) / 2.0;
    
    for (let j = i + 1; j < num_qubits; j++) {
      const item_j = qubitMap[j];
      const alpha_j = item_j.alpha;
      
      if (alpha_i !== alpha_j) {
        const W_orig_j = level.block_sizes[alpha_j][0];
        const H_orig_j = level.block_sizes[alpha_j][1];
        const rot_j = level.allow_rotation ? item_j.rot : 0;
        const W_j = rot_j === 0 ? W_orig_j : H_orig_j;
        const H_j = rot_j === 0 ? H_orig_j : W_orig_j;
        
        const cy_j = item_j.m + (H_j - 1) / 2.0;
        const cx_j = item_j.n + (W_j - 1) / 2.0;
        
        const d_ij = Math.abs(cy_i - cy_j) + Math.abs(cx_i - cx_j);
        
        // Afinidade de proximidade (se declarada)
        const key1 = `${alpha_i}-${alpha_j}`;
        const key2 = `${alpha_j}-${alpha_i}`;
        const affinity = level.proximity_affinity[key1] || level.proximity_affinity[key2] || 0.0;
        
        t_dist += (lambdaDist + affinity) * d_ij * x[i] * x[j];
      }
    }
  }
  
  return t1 + t_alloc + lambdaOverlap * t_overlap + t_dist;
}

// Verifica se o layout físico é válido em termos de colisões e alocações (is_valid de cost.py)
function checkValidity() {
  // 1. Cada bloco deve estar posicionado
  for (let bid in blocks) {
    if (!blocks[bid].placed) return false;
    
    // Verifica violação de restrições rígidas espaciais
    if (blocks[bid].boundary) {
      const is_north = (blocks[bid].m === 0);
      const is_south = (blocks[bid].m === gridM - blocks[bid].H);
      const is_west = (blocks[bid].n === 0);
      const is_east = (blocks[bid].n === gridN - blocks[bid].W);
      
      let v = false;
      if (blocks[bid].boundary === 'N' && is_north) v = true;
      else if (blocks[bid].boundary === 'S' && is_south) v = true;
      else if (blocks[bid].boundary === 'W' && is_west) v = true;
      else if (blocks[bid].boundary === 'E' && is_east) v = true;
      else if (blocks[bid].boundary === 'any' && (is_north || is_south || is_west || is_east)) v = true;
      
      if (!v) return false;
    }
  }
  
  // 2. Colisão zero em todas as células físicas
  const cellCounts = Array.from({ length: gridM }, () => new Array(gridN).fill(0));
  for (let bid in blocks) {
    const block = blocks[bid];
    if (block.placed) {
      for (let r = block.m; r < block.m + block.H; r++) {
        for (let c = block.n; c < block.n + block.W; c++) {
          if (r >= 0 && r < gridM && c >= 0 && c < gridN) {
            cellCounts[r][c]++;
            if (cellCounts[r][c] > 1) {
              return false; // Mais de um bloco na mesma célula
            }
          }
        }
      }
    }
  }
  
  return true;
}

// Conta quantas células estão com colisão no total
function countOverlappingCells() {
  const cellCounts = Array.from({ length: gridM }, () => new Array(gridN).fill(0));
  let overlapCount = 0;
  
  for (let bid in blocks) {
    const block = blocks[bid];
    if (block.placed) {
      for (let r = block.m; r < block.m + block.H; r++) {
        for (let c = block.n; c < block.n + block.W; c++) {
          if (r >= 0 && r < gridM && c >= 0 && c < gridN) {
            cellCounts[r][c]++;
          }
        }
      }
    }
  }
  
  for (let r = 0; r < gridM; r++) {
    for (let c = 0; c < gridN; c++) {
      if (cellCounts[r][c] > 1) {
        overlapCount += (cellCounts[r][c] - 1);
      }
    }
  }
  return overlapCount;
}

// 9. Atualização de Métricas & Desenho das Fiações
function updateStatsAndWiring() {
  const x = getCurrentBinaryVector();
  const cost = calculateExactQUBOCost(x);
  const valid = checkValidity();
  const overlaps = countOverlappingCells();
  
  // Calcula comprimento físico total de fiação para exibição simples (L1 entre os colocados)
  let totalWire = 0;
  const placedList = Object.values(blocks).filter(b => b.placed);
  
  for (let i = 0; i < placedList.length; i++) {
    const b1 = placedList[i];
    const cy1 = b1.m + (b1.H - 1) / 2;
    const cx1 = b1.n + (b1.W - 1) / 2;
    
    for (let j = i + 1; j < placedList.length; j++) {
      const b2 = placedList[j];
      const cy2 = b2.m + (b2.H - 1) / 2;
      const cx2 = b2.n + (b2.W - 1) / 2;
      
      const d_ij = Math.abs(cy1 - cy2) + Math.abs(cx1 - cx2);
      
      // Peso do nível
      const key1 = `${b1.id}-${b2.id}`;
      const key2 = `${b2.id}-${b1.id}`;
      const level = LEVELS[currentLevelId];
      
      // Se nível 2 (run_comparison.py), todas as conexões contam com peso lambdaDist
      let weight = 0.0;
      if (currentLevelId === 2) {
        weight = lambdaDist;
      } else {
        const affinity = level.proximity_affinity[key1] || level.proximity_affinity[key2] || 0.0;
        if (affinity > 0 || currentLevelId === 1) {
          weight = lambdaDist + affinity;
        }
      }
      
      totalWire += weight * d_ij;
    }
  }

  // Atualizar DOM
  if (statTotalCost) statTotalCost.textContent = cost.toFixed(2);
  
  if (statValid) {
    if (valid) {
      statValid.textContent = typeof I18N !== 'undefined' ? I18N.messages.yes : "Yes";
      statValid.className = "stat-value valid";
    } else {
      statValid.textContent = typeof I18N !== 'undefined' ? I18N.messages.no : "No";
      statValid.className = "stat-value invalid";
    }
  }
  
  if (statOverlaps) {
    statOverlaps.textContent = overlaps;
    if (overlaps > 0) {
      statOverlaps.className = "stat-value invalid";
    } else {
      statOverlaps.className = "stat-value warning"; // 0 mas inválido se não colocou todos
    }
  }
  
  if (statWirelength) statWirelength.textContent = totalWire.toFixed(2);

  // Update PhD Benchmark comparison
  if (currentLevelId === 2) {
    const optCost = 22.0 * lambdaDist;
    const compQaoa = typeof document !== 'undefined' ? document.getElementById("comp-qaoa") : null;
    const compSa = typeof document !== 'undefined' ? document.getElementById("comp-sa") : null;
    if (compQaoa) compQaoa.textContent = optCost.toFixed(2);
    if (compSa) compSa.textContent = optCost.toFixed(2);
    if (compManual) compManual.textContent = cost.toFixed(2);
    
    if (valid && Math.abs(cost - optCost) < 1e-2) {
      if (compManual) compManual.style.color = "var(--success)";
      if (typeof window !== 'undefined' && !window.showedLevel2Success) {
        const msg = typeof I18N !== 'undefined' ? I18N.messages.phdSuccessToast : "Congratulations! You found the optimal classical/quantum layout for the PhD benchmark!";
        showToast(msg, "success");
        window.showedLevel2Success = true;
      }
    } else {
      if (compManual) compManual.style.color = "var(--text-main)";
      if (typeof window !== 'undefined') window.showedLevel2Success = false;
    }
  }

  // Desenhar as fiações físicas
  drawWiring();
}

function drawWiring() {
  if (!wiringOverlay) return;
  wiringOverlay.innerHTML = "";
  
  const placedList = Object.values(blocks).filter(b => b.placed);
  const level = LEVELS[currentLevelId];
  
  for (let i = 0; i < placedList.length; i++) {
    const b1 = placedList[i];
    const cy1 = b1.m + (b1.H - 1) / 2;
    const cx1 = b1.n + (b1.W - 1) / 2;
    
    // Coordenadas absolutas na tela (pixels)
    const p1x = cx1 * 70 + 35;
    const p1y = cy1 * 70 + 35;
    
    for (let j = i + 1; j < placedList.length; j++) {
      const b2 = placedList[j];
      const cy2 = b2.m + (b2.H - 1) / 2;
      const cx2 = b2.n + (b2.W - 1) / 2;
      
      const p2x = cx2 * 70 + 35;
      const p2y = cy2 * 70 + 35;
      
      const key1 = `${b1.id}-${b2.id}`;
      const key2 = `${b2.id}-${b1.id}`;
      const affinity = level.proximity_affinity[key1] || level.proximity_affinity[key2] || 0.0;
      
      // Determinar se desenha fio:
      // - No Nível 2, desenhamos fios entre todos (pois todos têm custo de fiação clássico no Hamiltoniano)
      // - Nos demais níveis, desenhamos apenas se houver afinidade específica
      let drawWire = false;
      let weight = 0.0;
      
      if (currentLevelId === 2) {
        drawWire = true;
        weight = 5.0; // Padrão
      } else if (affinity > 0 || currentLevelId === 1) {
        drawWire = true;
        weight = affinity;
      }
      
      if (drawWire) {
        const d_ij = Math.abs(cy1 - cy2) + Math.abs(cx1 - cx2);
        
        // Criar elemento de linha SVG (desenhada como Manhattan: horizontal depois vertical)
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        
        // Caminho em formato L-shape para parecer fiação integrada
        let d = `M ${p1x} ${p1y}`;
        // Faz curva de 90 graus
        d += ` L ${p2x} ${p1y}`;
        d += ` L ${p2x} ${p2y}`;
        
        path.setAttribute("d", d);
        path.classList.add("wire-path");
        
        // Cor dinâmica baseada no comprimento
        let color = "rgba(99, 102, 241, 0.4)"; // Indigo transparente padrão
        if (d_ij <= 1.5) {
          color = "rgba(16, 185, 129, 0.7)"; // Próximo -> Verde
        } else if (d_ij > 3) {
          color = "rgba(239, 68, 68, 0.6)"; // Longe -> Vermelho
        } else {
          color = "rgba(6, 182, 212, 0.6)"; // Médio -> Ciano
        }
        
        path.setAttribute("stroke", color);
        
        // Espessura proporcional ao peso da conexão
        const strokeW = Math.max(1, Math.min(6, 1 + weight / 3));
        path.setAttribute("stroke-width", strokeW);
        
        // Animação de fluxo elétrico se os blocos estão próximos e válidos
        if (d_ij <= 2) {
          path.setAttribute("stroke-dasharray", "8, 6");
          path.setAttribute("style", "animation: dash 20s linear infinite;");
        }
        
        wiringOverlay.appendChild(path);
      }
    }
  }
}

// Adiciona estilos de animação de pulso para as fiações
const styleSheet = document.createElement("style");
styleSheet.innerHTML = `
  @keyframes dash {
    to {
      stroke-dashoffset: -1000;
    }
  }
`;
document.head.appendChild(styleSheet);



// 10. Controle de Senha & Modal do Otimizador
function openPasswordModal() {
  if (!passwordModal) return;
  passwordModal.classList.add("active");
  passwordModal.setAttribute("aria-hidden", "false");
  if (saPasswordInput) {
    saPasswordInput.value = "";
    saPasswordInput.focus();
  }
}

function closePasswordModal() {
  if (!passwordModal) return;
  passwordModal.classList.remove("active");
  passwordModal.setAttribute("aria-hidden", "true");
}

function checkOptimizerPassword(input) {
  if (!input || typeof input !== 'string') return false;
  return input.trim().toLowerCase() === PASSWORD_REQUIRED;
}

function handlePasswordSubmit() {
  const entered = saPasswordInput ? saPasswordInput.value : "";
  if (checkOptimizerPassword(entered)) {
    isOptimizerUnlocked = true;
    closePasswordModal();
    const msg = typeof I18N !== 'undefined' && I18N.messages.passwordSuccessToast ? I18N.messages.passwordSuccessToast : "Access granted! Running Simulated Annealing...";
    showToast(msg, "success");
    runSimulatedAnnealing();
  } else {
    const msg = typeof I18N !== 'undefined' && I18N.messages.passwordErrorToast ? I18N.messages.passwordErrorToast : "Incorrect password! Access denied.";
    showToast(msg, "error");
    if (saPasswordInput) {
      saPasswordInput.value = "";
      saPasswordInput.focus();
    }
  }
}

// 11. Motor de Otimização Combinatória: Simulated Annealing (SA) em Tempo Real
async function runSimulatedAnnealing(levelId = currentLevelId) {
  const level = LEVELS[levelId];
  if (!level) return null;

  // Exibir barra de progresso em tempo real se na web
  const saProgressBar = typeof document !== 'undefined' ? document.getElementById("sa-progress-bar") : null;
  const saTempDisplay = typeof document !== 'undefined' ? document.getElementById("sa-temp-display") : null;
  const saCostDisplay = typeof document !== 'undefined' ? document.getElementById("sa-cost-display") : null;
  const saProgressFill = typeof document !== 'undefined' ? document.getElementById("sa-progress-fill") : null;

  if (saProgressBar) saProgressBar.style.display = "flex";

  // 1. Identificar blocos livres e seus domínios de posições/rotações válidas
  const unfixedBlockIds = [];
  const candidateDomains = {};

  for (let bid in blocks) {
    const b = blocks[bid];
    const bidInt = parseInt(bid);

    if (b.fixed) {
      continue; // Bloco fixo mantém sua alocação espacial
    }

    unfixedBlockIds.push(bidInt);

    const W_orig = level.block_sizes[bidInt][0];
    const H_orig = level.block_sizes[bidInt][1];
    const candidateList = [];

    const allowedRotations = (level.allow_rotation && W_orig !== H_orig) ? [0, 1] : [0];

    for (let rot of allowedRotations) {
      const W = rot === 0 ? W_orig : H_orig;
      const H = rot === 0 ? H_orig : W_orig;

      const max_m = gridM - H;
      const max_n = gridN - W;

      for (let m = 0; m <= max_m; m++) {
        for (let n = 0; n <= max_n; n++) {
          if (b.boundary) {
            const is_north = (m === 0);
            const is_south = (m === gridM - H);
            const is_west = (n === 0);
            const is_east = (n === gridN - W);

            let valid = false;
            if (b.boundary === 'N' && is_north) valid = true;
            else if (b.boundary === 'S' && is_south) valid = true;
            else if (b.boundary === 'W' && is_west) valid = true;
            else if (b.boundary === 'E' && is_east) valid = true;
            else if (b.boundary === 'any' && (is_north || is_south || is_west || is_east)) valid = true;

            if (!valid) continue;
          }

          candidateList.push({ m, n, rot, W, H });
        }
      }
    }

    if (candidateList.length === 0) {
      for (let rot of allowedRotations) {
        const W = rot === 0 ? W_orig : H_orig;
        const H = rot === 0 ? H_orig : W_orig;
        for (let m = 0; m <= gridM - H; m++) {
          for (let n = 0; n <= gridN - W; n++) {
            candidateList.push({ m, n, rot, W, H });
          }
        }
      }
    }

    candidateDomains[bidInt] = candidateList;
  }

  // Avalia o custo do estado atual de forma ultrarrápida (física direta O(N^2) em vez de QUBO O(Q^2))
  function evaluateState(state) {
    const grid = Array.from({ length: gridM }, () => new Array(gridN).fill(0));
    
    // Contagem de células para sobreposição
    for (let bidInt of unfixedBlockIds) {
      const pos = state[bidInt];
      for (let r = pos.m; r < pos.m + pos.H; r++) {
        for (let c = pos.n; c < pos.n + pos.W; c++) {
          if (r >= 0 && r < gridM && c >= 0 && c < gridN) {
            grid[r][c]++;
          }
        }
      }
    }

    for (let bid in blocks) {
      if (blocks[bid].fixed) {
        const b = blocks[bid];
        for (let r = b.m; r < b.m + b.H; r++) {
          for (let c = b.n; c < b.n + b.W; c++) {
            if (r >= 0 && r < gridM && c >= 0 && c < gridN) {
              grid[r][c]++;
            }
          }
        }
      }
    }

    let cellOverlaps = 0;
    for (let r = 0; r < gridM; r++) {
      for (let c = 0; c < gridN; c++) {
        if (grid[r][c] > 1) {
          cellOverlaps += (grid[r][c] - 1);
        }
      }
    }

    // Comprimento de fiação (distância Manhattan entre centros)
    let distCost = 0;
    const allBids = Object.keys(blocks).map(Number);

    for (let i = 0; i < allBids.length; i++) {
      const b1Id = allBids[i];
      const pos1 = blocks[b1Id].fixed ? blocks[b1Id] : state[b1Id];
      if (!pos1) continue;

      const cy1 = pos1.m + (pos1.H - 1) / 2.0;
      const cx1 = pos1.n + (pos1.W - 1) / 2.0;

      for (let j = i + 1; j < allBids.length; j++) {
        const b2Id = allBids[j];
        const pos2 = blocks[b2Id].fixed ? blocks[b2Id] : state[b2Id];
        if (!pos2) continue;

        const cy2 = pos2.m + (pos2.H - 1) / 2.0;
        const cx2 = pos2.n + (pos2.W - 1) / 2.0;

        const d_ij = Math.abs(cy1 - cy2) + Math.abs(cx1 - cx2);

        const key1 = `${b1Id}-${b2Id}`;
        const key2 = `${b2Id}-${b1Id}`;
        let weight = 0;
        if (levelId === 2) {
          weight = lambdaDist;
        } else {
          const affinity = level.proximity_affinity[key1] || level.proximity_affinity[key2] || 0.0;
          if (affinity > 0 || levelId === 1) {
            weight = lambdaDist + affinity;
          }
        }
        distCost += weight * d_ij;
      }
    }

    return distCost + (lambdaOverlap * cellOverlaps) + (cellOverlaps * 500.0);
  }

  function cloneState(state) {
    const copy = {};
    for (let bidInt of unfixedBlockIds) {
      copy[bidInt] = { ...state[bidInt] };
    }
    return copy;
  }

  // 2. Inicializar estado atual com posições válidas aleatórias
  let currentState = {};
  for (let bidInt of unfixedBlockIds) {
    const domain = candidateDomains[bidInt];
    const randomIndex = Math.floor(Math.random() * domain.length);
    currentState[bidInt] = { ...domain[randomIndex] };
  }

  let currentEnergy = evaluateState(currentState);
  let bestState = cloneState(currentState);
  let bestEnergy = currentEnergy;
  let bestValid = checkValidity();

  // 3. Loop do Simulated Annealing com Animação em Tempo Real
  let temp = 100.0;
  const minTemp = 0.001;
  const coolingRate = 0.95;
  const stepsPerTemp = 30;

  const initialLogT = Math.log(100.0);
  const minLogT = Math.log(0.001);
  const totalLogRange = initialLogT - minLogT;

  let iterCount = 0;

  while (temp > minTemp) {
    for (let step = 0; step < stepsPerTemp; step++) {
      if (unfixedBlockIds.length === 0) break;

      const nextState = cloneState(currentState);
      const randMove = Math.random();

      if (randMove < 0.8 || unfixedBlockIds.length < 2) {
        const randomBid = unfixedBlockIds[Math.floor(Math.random() * unfixedBlockIds.length)];
        const domain = candidateDomains[randomBid];
        const randomPos = domain[Math.floor(Math.random() * domain.length)];
        nextState[randomBid] = { ...randomPos };
      } else {
        const idx1 = Math.floor(Math.random() * unfixedBlockIds.length);
        let idx2 = Math.floor(Math.random() * unfixedBlockIds.length);
        while (idx1 === idx2) {
          idx2 = Math.floor(Math.random() * unfixedBlockIds.length);
        }
        const b1 = unfixedBlockIds[idx1];
        const b2 = unfixedBlockIds[idx2];

        const pos1 = nextState[b1];
        const pos2 = nextState[b2];

        const b1_fits_in_pos2 = (pos2.m + pos1.H <= gridM && pos2.n + pos1.W <= gridN);
        const b2_fits_in_pos1 = (pos1.m + pos2.H <= gridM && pos1.n + pos2.W <= gridN);

        if (b1_fits_in_pos2 && b2_fits_in_pos1) {
          nextState[b1] = { m: pos2.m, n: pos2.n, rot: pos1.rot, W: pos1.W, H: pos1.H };
          nextState[b2] = { m: pos1.m, n: pos1.n, rot: pos2.rot, W: pos2.W, H: pos2.H };
        } else {
          const domain = candidateDomains[b1];
          nextState[b1] = { ...domain[Math.floor(Math.random() * domain.length)] };
        }
      }

      const nextEnergy = evaluateState(nextState);
      const deltaE = nextEnergy - currentEnergy;

      if (deltaE < 0 || Math.random() < Math.exp(-deltaE / temp)) {
        currentState = nextState;
        currentEnergy = nextEnergy;

        const isValid = checkValidity();
        if ((isValid && !bestValid) || (isValid === bestValid && currentEnergy < bestEnergy)) {
          bestState = cloneState(currentState);
          bestEnergy = currentEnergy;
          bestValid = isValid;
        }
      }
    }

    iterCount++;
    // A cada 3 passos de temperatura, atualiza a animação visual em tempo real no navegador
    if (iterCount % 3 === 0 && typeof document !== 'undefined') {
      const currentLogRange = initialLogT - Math.log(Math.max(temp, 0.001));
      const progressPct = Math.min(100, Math.max(0, (currentLogRange / totalLogRange) * 100));

      if (saTempDisplay) saTempDisplay.textContent = `T = ${temp.toFixed(1)}`;
      if (saCostDisplay) saCostDisplay.textContent = bestEnergy.toFixed(2);
      if (saProgressFill) saProgressFill.style.width = `${progressPct.toFixed(1)}%`;

      // Atualiza a posição dos blocos na grade em tempo real
      for (let bidInt of unfixedBlockIds) {
        const pos = currentState[bidInt];
        blocks[bidInt].placed = true;
        blocks[bidInt].m = pos.m;
        blocks[bidInt].n = pos.n;
        blocks[bidInt].rot = pos.rot;
        blocks[bidInt].W = pos.W;
        blocks[bidInt].H = pos.H;
      }
      renderShelfAndPlaced();
      updateStatsAndWiring();

      // Yield frame para renderização no navegador (20ms)
      await new Promise(r => setTimeout(r, 20));
    }

    temp *= coolingRate;
  }

  // 4. Restaurar melhor estado no jogo
  for (let bidInt of unfixedBlockIds) {
    const pos = bestState[bidInt];
    blocks[bidInt].placed = true;
    blocks[bidInt].m = pos.m;
    blocks[bidInt].n = pos.n;
    blocks[bidInt].rot = pos.rot;
    blocks[bidInt].W = pos.W;
    blocks[bidInt].H = pos.H;
  }

  renderShelfAndPlaced();
  updateStatsAndWiring();

  if (saProgressBar) saProgressBar.style.display = "none";

  const finalCost = calculateExactQUBOCost(getCurrentBinaryVector());
  if (typeof I18N !== 'undefined' && I18N.messages.saSuccessToast) {
    showToast(I18N.messages.saSuccessToast(finalCost), bestValid ? "success" : "warning");
  } else {
    showToast(`Simulated Annealing finished! Best cost: ${finalCost.toFixed(2)}`, "success");
  }

  return {
    bestState,
    bestEnergy: finalCost,
    valid: bestValid
  };
}

// 12. Utilitários (Toast & Export)
function showToast(msg, type = "info") {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = msg;
  toast.className = `toast show ${type}`;
  
  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

function exportLayout() {
  const solution = {
    level: currentLevelId,
    grid: { M: gridM, N: gridN },
    lambda_alloc: lambdaAlloc,
    lambda_overlap: lambdaOverlap,
    lambda_dist: lambdaDist,
    layout_valido: checkValidity(),
    custo_total: calculateExactQUBOCost(getCurrentBinaryVector()),
    blocos: {}
  };
  
  for (let bid in blocks) {
    const b = blocks[bid];
    solution.blocos[bid] = {
      placed: b.placed,
      row: b.m,
      col: b.n,
      rotation: b.rot,
      width_eff: b.W,
      height_eff: b.H
    };
  }
  
  const jsonStr = JSON.stringify(solution, null, 2);
  
  // Copy to clipboard
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    navigator.clipboard.writeText(jsonStr).then(() => {
      const msg = typeof I18N !== 'undefined' ? I18N.messages.exportClipboardToast : "Layout copied to Clipboard (JSON)!";
      showToast(msg, "success");
      console.log("Layout Exported:\n", jsonStr);
    }).catch(() => {
      if (typeof Blob !== 'undefined' && typeof URL !== 'undefined') {
        const blob = new Blob([jsonStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `layout_level_${currentLevelId}.json`;
        a.click();
        const msg = typeof I18N !== 'undefined' ? I18N.messages.exportDownloadToast : "Download of layout JSON started!";
        showToast(msg, "success");
      }
    });
  }
}

// Start game
if (typeof window !== 'undefined') {
  window.onload = init;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    LEVELS,
    calculateExactQUBOCost,
    checkValidity,
    countOverlappingCells,
    generateQubitMap,
    checkOptimizerPassword,
    runSimulatedAnnealing
  };
}
