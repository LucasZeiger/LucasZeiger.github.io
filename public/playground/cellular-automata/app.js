const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const presetSelect = document.getElementById("preset");
const presetDescription = document.getElementById("preset-description");
const themeSelect = document.getElementById("theme");
const toggleButton = document.getElementById("toggle");
const stepButton = document.getElementById("step");
const clearButton = document.getElementById("clear");
const randomButton = document.getElementById("random");
const resetButton = document.getElementById("reset");
const speedInput = document.getElementById("speed");
const speedValue = document.getElementById("speed-value");
const cellSizeInput = document.getElementById("cell-size");
const cellSizeValue = document.getElementById("cell-size-value");
const densityInput = document.getElementById("density");
const densityValue = document.getElementById("density-value");
const wrapEdgesInput = document.getElementById("wrap-edges");
const statusLabel = document.getElementById("status");
const gridSizeLabel = document.getElementById("grid-size");
const generationLabel = document.getElementById("generation");
const aliveLabel = document.getElementById("alive");

const DEFAULT_SPEED = 12;
const DEFAULT_CELL_SIZE = 14;
const DEFAULT_DENSITY = 0.22;
const DEFAULT_WRAP = true;

const makePattern = (width, height, coords) => {
  const pattern = Array.from({ length: height }, () => Array(width).fill(0));
  coords.forEach(([x, y]) => {
    if (x >= 0 && y >= 0 && x < width && y < height) {
      pattern[y][x] = 1;
    }
  });
  return pattern;
};

const themes = [
  {
    name: "Neon Mint",
    cell: "#34d399",
    glow: "rgba(52, 211, 153, 0.35)",
    grid: "rgba(148, 163, 184, 0.12)",
    background: "rgba(12, 15, 28, 0.9)",
  },
  {
    name: "Solar Ember",
    cell: "#f97316",
    glow: "rgba(249, 115, 22, 0.35)",
    grid: "rgba(251, 146, 60, 0.12)",
    background: "rgba(10, 7, 4, 0.92)",
  },
  {
    name: "Cyan Drift",
    cell: "#60a5fa",
    glow: "rgba(96, 165, 250, 0.35)",
    grid: "rgba(94, 234, 212, 0.12)",
    background: "rgba(9, 14, 22, 0.92)",
  },
];

const presets = [
  {
    name: "Glider",
    description: "A tiny pattern that travels diagonally across the grid.",
    pattern: [
      [0, 1, 0],
      [0, 0, 1],
      [1, 1, 1],
    ],
  },
  {
    name: "Pulsar",
    description: "A rhythmic oscillator with a period of three.",
    pattern: [
      [0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1],
      [0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0],
      [1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1],
      [0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ],
  },
  {
    name: "LWSS",
    description: "A lightweight spaceship that glides horizontally.",
    pattern: [
      [0, 1, 1, 1, 1],
      [1, 0, 0, 0, 1],
      [0, 0, 0, 0, 1],
      [1, 0, 0, 1, 0],
    ],
  },
  {
    name: "Small Exploder",
    description: "A compact pattern that bursts and stabilizes.",
    pattern: [
      [0, 1, 0],
      [1, 1, 1],
      [1, 0, 1],
      [0, 1, 0],
    ],
  },
  {
    name: "Ten Cell Row",
    description: "A straight line that evolves into complex symmetry.",
    pattern: [[1, 1, 1, 1, 1, 1, 1, 1, 1, 1]],
  },
  {
    name: "Gosper Glider Gun",
    description: "A famous gun that periodically launches gliders.",
    pattern: makePattern(37, 10, [
      [1, 5],
      [2, 5],
      [1, 6],
      [2, 6],
      [13, 3],
      [14, 3],
      [12, 4],
      [16, 4],
      [11, 5],
      [17, 5],
      [11, 6],
      [15, 6],
      [17, 6],
      [18, 6],
      [11, 7],
      [17, 7],
      [12, 8],
      [16, 8],
      [13, 9],
      [14, 9],
      [25, 1],
      [23, 2],
      [25, 2],
      [21, 3],
      [22, 3],
      [21, 4],
      [22, 4],
      [21, 5],
      [22, 5],
      [23, 6],
      [25, 6],
      [25, 7],
      [35, 3],
      [36, 3],
      [35, 4],
      [36, 4],
    ]),
  },
  {
    name: "Acorn",
    description: "A small seed that explodes into long-lived chaos.",
    pattern: makePattern(7, 3, [
      [1, 0],
      [3, 1],
      [0, 2],
      [1, 2],
      [4, 2],
      [5, 2],
      [6, 2],
    ]),
  },
  {
    name: "Diehard",
    description: "A seven-cell seed that takes 130 generations to die.",
    pattern: makePattern(8, 3, [
      [6, 0],
      [0, 1],
      [1, 1],
      [1, 2],
      [5, 2],
      [6, 2],
      [7, 2],
    ]),
  },
  {
    name: "Random",
    description: "A randomized grid seed for emergent behavior.",
    pattern: null,
  },
];

const state = {
  cols: 0,
  rows: 0,
  grid: [],
  buffer: [],
  running: false,
  generation: 0,
  speed: DEFAULT_SPEED,
  cellSize: DEFAULT_CELL_SIZE,
  density: DEFAULT_DENSITY,
  wrapEdges: DEFAULT_WRAP,
  theme: themes[0],
  activePreset: presets[0],
  lastTick: 0,
};

const fillGrid = (value = 0) =>
  Array.from({ length: state.rows }, () => Array(state.cols).fill(value));

const countNeighbors = (grid, x, y) => {
  let count = 0;
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      let nx = x + dx;
      let ny = y + dy;
      if (state.wrapEdges) {
        nx = (nx + state.cols) % state.cols;
        ny = (ny + state.rows) % state.rows;
        count += grid[ny][nx];
      } else if (nx >= 0 && ny >= 0 && nx < state.cols && ny < state.rows) {
        count += grid[ny][nx];
      }
    }
  }
  return count;
};

const stepSimulation = () => {
  let alive = 0;
  for (let y = 0; y < state.rows; y += 1) {
    for (let x = 0; x < state.cols; x += 1) {
      const neighbors = countNeighbors(state.grid, x, y);
      const isAlive = state.grid[y][x] === 1;
      let next = 0;
      if (isAlive && (neighbors === 2 || neighbors === 3)) {
        next = 1;
      } else if (!isAlive && neighbors === 3) {
        next = 1;
      }
      state.buffer[y][x] = next;
      alive += next;
    }
  }

  const temp = state.grid;
  state.grid = state.buffer;
  state.buffer = temp;
  state.generation += 1;
  aliveLabel.textContent = alive.toString();
};

const drawGrid = () => {
  const cellPadding = Math.max(1, Math.floor(state.cellSize * 0.15));
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = state.theme.background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const cellSize = state.cellSize;
  for (let y = 0; y < state.rows; y += 1) {
    for (let x = 0; x < state.cols; x += 1) {
      if (state.grid[y][x] === 1) {
        const px = x * cellSize + cellPadding;
        const py = y * cellSize + cellPadding;
        ctx.fillStyle = state.theme.cell;
        ctx.fillRect(
          px,
          py,
          cellSize - cellPadding * 2,
          cellSize - cellPadding * 2
        );
        ctx.shadowColor = state.theme.glow;
        ctx.shadowBlur = 8;
      }
    }
  }
  ctx.shadowBlur = 0;

  ctx.strokeStyle = state.theme.grid;
  ctx.lineWidth = 1;
  for (let x = 0; x <= state.cols; x += 1) {
    ctx.beginPath();
    ctx.moveTo(x * cellSize + 0.5, 0);
    ctx.lineTo(x * cellSize + 0.5, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y <= state.rows; y += 1) {
    ctx.beginPath();
    ctx.moveTo(0, y * cellSize + 0.5);
    ctx.lineTo(canvas.width, y * cellSize + 0.5);
    ctx.stroke();
  }
};

const resizeCanvas = () => {
  const wrap = canvas.parentElement;
  const { clientWidth, clientHeight } = wrap;
  canvas.width = clientWidth;
  canvas.height = clientHeight;
  state.cols = Math.max(8, Math.floor(clientWidth / state.cellSize));
  state.rows = Math.max(8, Math.floor(clientHeight / state.cellSize));
  state.grid = fillGrid(0);
  state.buffer = fillGrid(0);
  state.generation = 0;
  aliveLabel.textContent = "0";
  gridSizeLabel.textContent = `${state.cols} x ${state.rows}`;
  applyPreset(state.activePreset);
  drawGrid();
};

const applyPreset = (preset) => {
  state.grid = fillGrid(0);
  state.buffer = fillGrid(0);
  state.generation = 0;
  generationLabel.textContent = "0";

  if (preset.pattern) {
    const pattern = preset.pattern;
    const offsetX = Math.floor((state.cols - pattern[0].length) / 2);
    const offsetY = Math.floor((state.rows - pattern.length) / 2);
    pattern.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell) {
          const gx = x + offsetX;
          const gy = y + offsetY;
          if (gx >= 0 && gy >= 0 && gx < state.cols && gy < state.rows) {
            state.grid[gy][gx] = 1;
          }
        }
      });
    });
  } else {
    randomizeGrid();
  }
  aliveLabel.textContent = countAlive().toString();
  drawGrid();
};

const randomizeGrid = () => {
  let alive = 0;
  for (let y = 0; y < state.rows; y += 1) {
    for (let x = 0; x < state.cols; x += 1) {
      const next = Math.random() < state.density ? 1 : 0;
      state.grid[y][x] = next;
      alive += next;
    }
  }
  aliveLabel.textContent = alive.toString();
  drawGrid();
};

const clearGrid = () => {
  state.grid = fillGrid(0);
  state.buffer = fillGrid(0);
  state.generation = 0;
  generationLabel.textContent = "0";
  aliveLabel.textContent = "0";
  drawGrid();
};

const countAlive = () =>
  state.grid.reduce(
    (sum, row) => sum + row.reduce((acc, cell) => acc + cell, 0),
    0
  );

const toggleCellAt = (event) => {
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((event.clientX - rect.left) / state.cellSize);
  const y = Math.floor((event.clientY - rect.top) / state.cellSize);
  if (x >= 0 && y >= 0 && x < state.cols && y < state.rows) {
    state.grid[y][x] = state.grid[y][x] ? 0 : 1;
    aliveLabel.textContent = countAlive().toString();
    drawGrid();
  }
};

const start = () => {
  state.running = true;
  toggleButton.textContent = "Pause";
  statusLabel.textContent = "Running";
};

const pause = () => {
  state.running = false;
  toggleButton.textContent = "Start";
  statusLabel.textContent = "Paused";
};

const animate = (timestamp) => {
  if (state.running) {
    const interval = 1000 / state.speed;
    if (timestamp - state.lastTick >= interval) {
      stepSimulation();
      generationLabel.textContent = state.generation.toString();
      state.lastTick = timestamp;
      drawGrid();
    }
  }
  requestAnimationFrame(animate);
};

presets.forEach((preset, index) => {
  const option = document.createElement("option");
  option.value = index;
  option.textContent = preset.name;
  presetSelect.appendChild(option);
});

themes.forEach((theme, index) => {
  const option = document.createElement("option");
  option.value = index;
  option.textContent = theme.name;
  themeSelect.appendChild(option);
});

presetSelect.addEventListener("change", (event) => {
  const preset = presets[Number(event.target.value)];
  state.activePreset = preset;
  presetDescription.textContent = preset.description;
  applyPreset(preset);
});

themeSelect.addEventListener("change", (event) => {
  const theme = themes[Number(event.target.value)];
  state.theme = theme;
  drawGrid();
});

speedInput.addEventListener("input", (event) => {
  state.speed = Number(event.target.value);
  speedValue.textContent = state.speed.toString();
});

cellSizeInput.addEventListener("input", (event) => {
  state.cellSize = Number(event.target.value);
  cellSizeValue.textContent = state.cellSize.toString();
  resizeCanvas();
});

densityInput.addEventListener("input", (event) => {
  const value = Number(event.target.value);
  state.density = value / 100;
  densityValue.textContent = `${value}%`;
});

wrapEdgesInput.addEventListener("change", (event) => {
  state.wrapEdges = event.target.checked;
});

toggleButton.addEventListener("click", () => {
  state.running ? pause() : start();
});

stepButton.addEventListener("click", () => {
  pause();
  stepSimulation();
  generationLabel.textContent = state.generation.toString();
  drawGrid();
});

clearButton.addEventListener("click", () => {
  pause();
  clearGrid();
});

randomButton.addEventListener("click", () => {
  pause();
  randomizeGrid();
});

resetButton.addEventListener("click", () => {
  pause();
  applyPreset(state.activePreset);
});

let isDragging = false;
canvas.addEventListener("pointerdown", (event) => {
  isDragging = true;
  toggleCellAt(event);
});

canvas.addEventListener("pointermove", (event) => {
  if (isDragging) toggleCellAt(event);
});

window.addEventListener("pointerup", () => {
  isDragging = false;
});

window.addEventListener("resize", () => {
  resizeCanvas();
});

const init = () => {
  speedInput.value = DEFAULT_SPEED.toString();
  speedValue.textContent = DEFAULT_SPEED.toString();
  cellSizeInput.value = DEFAULT_CELL_SIZE.toString();
  cellSizeValue.textContent = DEFAULT_CELL_SIZE.toString();
  densityInput.value = Math.round(DEFAULT_DENSITY * 100).toString();
  densityValue.textContent = `${Math.round(DEFAULT_DENSITY * 100)}%`;
  wrapEdgesInput.checked = DEFAULT_WRAP;
  presetSelect.value = "0";
  presetDescription.textContent = presets[0].description;
  themeSelect.value = "0";
  resizeCanvas();
  pause();
  requestAnimationFrame(animate);
};

init();
