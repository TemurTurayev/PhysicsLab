import { create } from 'zustand';
import type { Mission, WorldState, PythonOutput, PythonWorldState, MathCanvasState } from '../types';

interface AppState {
  // Mission state
  currentMission: Mission | null;
  setCurrentMission: (mission: Mission | null) => void;

  // Code editor state
  code: string;
  setCode: (code: string) => void;

  // Execution state
  isRunning: boolean;
  isPaused: boolean;
  setIsRunning: (running: boolean) => void;
  setIsPaused: (paused: boolean) => void;

  // World state
  worldState: WorldState | null;
  setWorldState: (state: WorldState | null) => void;

  // Python world state (from Python execution)
  pythonWorldState: PythonWorldState | null;
  setPythonWorldState: (state: PythonWorldState | null) => void;

  // Math canvas state (from mathlab library)
  mathCanvasState: MathCanvasState | null;
  setMathCanvasState: (state: MathCanvasState | null) => void;

  // UI state
  theoryPanelOpen: boolean;
  setTheoryPanelOpen: (open: boolean) => void;

  // Console output
  consoleOutput: PythonOutput[];
  addConsoleOutput: (output: PythonOutput) => void;
  clearConsoleOutput: () => void;

  // Hints
  showHints: boolean;
  currentHintLevel: number;
  setShowHints: (show: boolean) => void;
  nextHint: () => void;
  resetHints: () => void;

  // Interactive parameters
  parameters: Record<string, number>;
  setParameter: (name: string, value: number) => void;
  setParameters: (params: Record<string, number>) => void;
  resetParameters: () => void;

  // Actions
  resetMission: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  currentMission: null,
  code: '',
  isRunning: false,
  isPaused: false,
  worldState: null,
  pythonWorldState: null,
  mathCanvasState: null,
  theoryPanelOpen: false,
  consoleOutput: [],
  showHints: false,
  currentHintLevel: 0,
  parameters: {},

  // Setters
  setCurrentMission: (mission) => {
    set({
      currentMission: mission,
      code: mission?.starterCode || '',
      theoryPanelOpen: false,
      showHints: false,
      currentHintLevel: 0,
    });
  },

  setCode: (code) => set({ code }),
  setIsRunning: (running) => set({ isRunning: running }),
  setIsPaused: (paused) => set({ isPaused: paused }),
  setWorldState: (state) => set({ worldState: state }),
  setPythonWorldState: (state) => set({ pythonWorldState: state }),
  setMathCanvasState: (state) => set({ mathCanvasState: state }),
  setTheoryPanelOpen: (open) => set({ theoryPanelOpen: open }),

  // Console
  addConsoleOutput: (output) =>
    set((state) => ({
      consoleOutput: [...state.consoleOutput, output]
    })),
  clearConsoleOutput: () => set({ consoleOutput: [] }),

  // Hints
  setShowHints: (show) => set({ showHints: show }),
  nextHint: () => {
    const { currentHintLevel, currentMission } = get();
    if (currentMission && currentHintLevel < currentMission.hints.length - 1) {
      set({ currentHintLevel: currentHintLevel + 1, showHints: true });
    }
  },
  resetHints: () => set({ currentHintLevel: 0, showHints: false }),

  // Parameters
  setParameter: (name, value) =>
    set((state) => ({
      parameters: { ...state.parameters, [name]: value },
    })),

  setParameters: (params) => set({ parameters: params }),

  resetParameters: () => set({ parameters: {} }),

  // Actions
  resetMission: () => {
    const { currentMission } = get();
    set({
      code: currentMission?.starterCode || '',
      isRunning: false,
      isPaused: false,
      worldState: null,
      pythonWorldState: null,
      mathCanvasState: null,
      consoleOutput: [],
      currentHintLevel: 0,
      showHints: false,
      parameters: {},
    });
  },
}));

