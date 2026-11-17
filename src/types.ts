export type StepKind = 'prep' | 'work' | 'rest' | 'cooldown';
export type StepMode = 'time' | 'reps' | 'manual';
export type Category = 'JogaBR' | 'FQB' | 'Cardio' | 'Custom';

export interface Step {
  type: 'step';
  id: string;
  name: string;        // "Sprint curto", "Passe pé esquerdo"
  kind: StepKind;
  mode: StepMode;
  seconds?: number;    // 'time': step length. 'reps': estimated time
  reps?: number;       // used when mode = 'reps'
  notes?: string;
  color?: string;      // e.g. "#16A34A"
  voiceCue?: string;   // spoken when the step starts
}

export interface Block {
  type: 'block';
  id: string;
  name: string;
  repeat: number;               // how many rounds
  items: (Step | Block)[];      // blocks can contain blocks
}

export interface Session {
  id: string;
  name: string;
  category: Category;
  root: Block;
  createdAt: string;   // ISO date
  updatedAt: string;
}

export interface HistoryEntry {
  id: string;
  sessionId: string;
  sessionName: string;
  category: Category;
  date: string;              // ISO date
  totalSeconds: number;
  stepsCompleted: number;
  stepsTotal: number;
  rpe?: number;              // effort 1-10
  notes?: string;
}
