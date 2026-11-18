import type { Block, Step } from '../types';

export interface RunStep extends Step {
  round: number;        // current round of its block
  totalRounds: number;
  blockName: string;
}

export function flatten(block: Block): RunStep[] {
  const out: RunStep[] = [];
  for (let r = 1; r <= block.repeat; r++) {
    for (const item of block.items) {
      if (item.type === 'step') {
        out.push({ ...item, round: r, totalRounds: block.repeat,
                   blockName: block.name });
      } else {
        out.push(...flatten(item));
      }
    }
  }
  return out;
}
