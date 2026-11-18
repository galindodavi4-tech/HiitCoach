import type { Block, Session, Step } from '../types';
import { cloneBlock, newId } from './session';

const CREATED = '2026-11-17T00:00:00.000Z';

function template(id: string, name: string, category: Session['category'], root: Block): Session {
  return { id, name, category, root, createdAt: CREATED, updatedAt: CREATED };
}

// Builds one exercise done for 3 sets, with 60 s rest after each set
function gymExercise(id: string, name: string, reps: number, seconds: number): Block {
  const exercise: Step = { type: 'step', id: `${id}-ex`, name, kind: 'work', mode: 'reps', reps, seconds };
  const rest: Step = { type: 'step', id: `${id}-rest`, name: 'Descanso', kind: 'rest', mode: 'time', seconds: 60 };
  return { type: 'block', id, name, repeat: 3, items: [exercise, rest] };
}

export const TEMPLATES: Session[] = [
  template('tabata-20-10', 'Tabata 20/10', 'Cardio', {
    type: 'block', id: 'root', name: 'Sessão', repeat: 1,
    items: [
      { type: 'step', id: 'prep', name: 'Prepare-se', kind: 'prep', mode: 'time', seconds: 10 },
      {
        type: 'block', id: 'tabata', name: 'Tabata', repeat: 8,
        items: [
          { type: 'step', id: 'work', name: 'Forte', kind: 'work', mode: 'time', seconds: 20, voiceCue: 'Vai' },
          { type: 'step', id: 'rest', name: 'Descanso', kind: 'rest', mode: 'time', seconds: 10 },
        ],
      },
    ],
  }),

  // Section 5 of the spec
  template('sprints-15-35', 'Sprints 15/35', 'Cardio', {
    type: 'block', id: 'main', name: 'Série principal', repeat: 6,
    items: [
      { type: 'step', id: 's1', name: 'Sprint curto', kind: 'work', mode: 'time', seconds: 15, voiceCue: 'Sprint de quinze' },
      { type: 'step', id: 'r1', name: 'Descanso', kind: 'rest', mode: 'time', seconds: 30 },
      { type: 'step', id: 's2', name: 'Sprint longo', kind: 'work', mode: 'time', seconds: 35, voiceCue: 'Sprint de trinta e cinco' },
      { type: 'step', id: 'r2', name: 'Descanso', kind: 'rest', mode: 'time', seconds: 45 },
    ],
  }),

  template('hiitcoach-academia', 'HIITCoach - Bloco de academia', 'HIITCoach', {
    type: 'block', id: 'root', name: 'Sessão', repeat: 1,
    items: [
      { type: 'step', id: 'aq', name: 'Aquecimento', kind: 'prep', mode: 'time', seconds: 300 },
      gymExercise('agach', 'Agachamento', 12, 45),
      gymExercise('afundo', 'Afundo alternado', 10, 45),
      gymExercise('terra', 'Levantamento terra romeno', 10, 45),
      gymExercise('flexao', 'Flexão de braço', 12, 40),
      { type: 'step', id: 'desaq', name: 'Desaquecimento', kind: 'cooldown', mode: 'time', seconds: 300 },
    ],
  }),

  // Section 5 of the spec
  template('fqb-passe', 'FQB - Passe e condução', 'FQB', {
    type: 'block', id: 'root', name: 'Sessão', repeat: 1,
    items: [
      { type: 'step', id: 'aq', name: 'Aquecimento', kind: 'prep', mode: 'time', seconds: 300 },
      {
        type: 'block', id: 'passe', name: 'Passe', repeat: 3,
        items: [
          { type: 'step', id: 'p1', name: 'Passe pé esquerdo', kind: 'work', mode: 'reps', reps: 10, seconds: 40 },
          { type: 'step', id: 'p2', name: 'Passe pé direito', kind: 'work', mode: 'reps', reps: 10, seconds: 40 },
          { type: 'step', id: 'pr', name: 'Descanso', kind: 'rest', mode: 'time', seconds: 30 },
        ],
      },
      {
        type: 'step', id: 'cond', name: 'Condução em zigue-zague', kind: 'work', mode: 'reps', reps: 4, seconds: 90,
        notes: '6 cones, ida e volta',
      },
      { type: 'step', id: 'desaq', name: 'Desaquecimento', kind: 'cooldown', mode: 'time', seconds: 300 },
    ],
  }),
];

// Copies a template into a new user session, with fresh ids everywhere
export function sessionFromTemplate(t: Session): Session {
  const now = new Date().toISOString();
  return { ...t, id: newId(), root: cloneBlock(t.root), createdAt: now, updatedAt: now };
}
