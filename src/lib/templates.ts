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

// Exercise done for a fixed time
function timed(id: string, name: string, seconds: number, notes?: string): Step {
  const step: Step = { type: 'step', id, name, kind: 'work', mode: 'time', seconds };
  if (notes) step.notes = notes;
  return step;
}

function rest(id: string, seconds: number, notes: string): Step {
  return { type: 'step', id, name: 'Descanso', kind: 'rest', mode: 'time', seconds, notes };
}

// Bi-set: alternate two exercises, resting after each one
function biSet(id: string, name: string, rounds: number, a: Step, b: Step, restSeconds: number, restNote: string): Block {
  return {
    type: 'block', id, name, repeat: rounds,
    items: [a, rest(`${id}-ra`, restSeconds, restNote), b, rest(`${id}-rb`, restSeconds, restNote)],
  };
}

// 30 s to lay out the cones for the next drill
function setup(id: string, next: string): Step {
  return {
    type: 'step', id, name: 'Montar circuito', kind: 'prep', mode: 'time', seconds: 30,
    notes: `Prepare os cones para: ${next}`, voiceCue: 'Monte o próximo circuito',
  };
}

const PICK_NOTE = 'Escolha um exercício deste treino: toque no passo para trocar o nome.';

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
  // FQB technical session (30 min): Preparação, Ativação pré-guerra, Guerra and Missão pós-guerra.
  // Rest ranges are set to a value inside the range (5–20 s → 10 s). A 30 s 'Montar circuito'
  // step before each drill gives time to lay out the cones; in Missão it also covers the 0–30 s rest.
  template('fqb-tecnico-sola-conducao', 'FQB - Treino técnico: Sola + Condução', 'FQB', {
    type: 'block', id: 'root', name: 'Sessão', repeat: 1,
    items: [
      {
        type: 'block', id: 'prep', name: 'Preparação', repeat: 1,
        items: [
          { type: 'step', id: 'prep-aq', name: 'Aquecimento Livre', kind: 'prep', mode: 'time', seconds: 40, notes: 'Rápida' },
          setup('prep-esc-setup', 'Escadinha Bote Lateral'),
          {
            type: 'block', id: 'prep-esc', name: 'Escadinha', repeat: 3,
            items: [timed('prep-esc-ex', 'Escadinha Bote Lateral', 10, 'Rápida · sem descanso')],
          },
        ],
      },
      {
        type: 'block', id: 'ativ', name: 'Ativação pré-guerra', repeat: 1,
        items: [
          setup('ativ-1-setup', 'Ball Mastery Sola + Embaixadinha Curta'),
          biSet('ativ-1', 'Ativação · Bi-set 1', 2,
            timed('ativ-1a', 'Ball Mastery Sola', 15),
            timed('ativ-1b', 'Embaixadinha Curta', 35),
            10, 'Descanso de 5 a 20 s'),
          setup('ativ-2-setup', 'Ball Mastery Vai e Volta + Embaixadinha com a Cabeça'),
          biSet('ativ-2', 'Ativação · Bi-set 2', 2,
            timed('ativ-2a', 'Ball Mastery Vai e Volta', 15),
            timed('ativ-2b', 'Embaixadinha com a Cabeça', 35),
            10, 'Descanso de 5 a 20 s'),
        ],
      },
      {
        type: 'block', id: 'guerra', name: 'Guerra', repeat: 1,
        items: [
          setup('guerra-1-setup', 'Rabisco Longo Externo + Passe de Primeira na Parede'),
          biSet('guerra-1', 'Guerra · Bi-set 1', 5,
            timed('guerra-1a', 'Rabisco Longo Externo', 15),
            timed('guerra-1b', 'Passe de Primeira na Parede', 35),
            10, 'Descanso de 5 a 20 s'),
          setup('guerra-2-setup', 'Rabisco Longo Interno + Wall Turn'),
          biSet('guerra-2', 'Guerra · Bi-set 2', 5,
            timed('guerra-2a', 'Rabisco Longo Interno', 15),
            timed('guerra-2b', 'Wall Turn', 35),
            10, 'Descanso de 5 a 20 s'),
          setup('guerra-3-setup', 'Condução + Turn 5m Variação 1 + Embaixadinha Curta Pé Não Dominante'),
          biSet('guerra-3', 'Guerra · Bi-set 3', 5,
            timed('guerra-3a', 'Condução + Turn 5m Variação 1', 15),
            timed('guerra-3b', 'Embaixadinha Curta Pé Não Dominante', 35),
            10, 'Descanso de 5 a 20 s'),
        ],
      },
      {
        type: 'block', id: 'missao', name: 'Missão pós-guerra', repeat: 1,
        items: [
          setup('missao-rab-setup', 'Rabisco Curto Interno'),
          {
            // 30 reps with a 5 min limit: the clock runs the limit; skip ahead when done
            type: 'step', id: 'missao-rab', name: 'Rabisco Curto Interno', kind: 'work', mode: 'reps', reps: 30, seconds: 300,
            notes: 'Sem errar · limite de 5 min. Terminou antes? Toque em pular.',
          },
          setup('missao-ball-setup', 'Ball Mastery Sola'),
          timed('missao-ball', 'Ball Mastery Sola', 30, 'Sempre em deslocamento'),
          setup('missao-final-setup', 'seu exercício preferido + o de maior dificuldade'),
          biSet('missao-final', 'Até completar o tempo', 3,
            timed('missao-final-a', 'Seu exercício preferido', 20, PICK_NOTE),
            timed('missao-final-b', 'Seu exercício de maior dificuldade', 20, PICK_NOTE),
            10, 'Descanso de 5 a 20 s'),
        ],
      },
    ],
  }),
];

// Copies a template into a new user session, with fresh ids everywhere
export function sessionFromTemplate(t: Session): Session {
  const now = new Date().toISOString();
  return { ...t, id: newId(), root: cloneBlock(t.root), createdAt: now, updatedAt: now };
}
