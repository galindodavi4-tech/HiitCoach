// MCP tools: what Claude can do in the user's HIITapp account.
import type { Block, Session } from '../../src/types.js';
import { CATEGORY_VALUES, SessionDataError, parseSessionData } from '../../src/shared/sessionSchema.js';
import { loadUserData, saveSession } from './data.js';
import { randomToken } from './auth.js';

const STEP_SCHEMA = {
  type: 'object',
  description: 'Um passo do treino (exercício, descanso, aquecimento ou desaquecimento).',
  properties: {
    type: { const: 'step' },
    name: { type: 'string', description: 'Nome do exercício, como aparece no treino. Ex.: "Ball Mastery Sola".' },
    kind: {
      type: 'string',
      enum: ['prep', 'work', 'rest', 'cooldown'],
      description: 'prep = aquecimento/preparar/montar circuito, work = exercício, rest = descanso, cooldown = desaquecimento.',
    },
    mode: {
      type: 'string',
      enum: ['time', 'reps', 'manual'],
      description:
        'time = dura "seconds" segundos. reps = "reps" repetições com "seconds" como tempo estimado ou limite. manual = espera o atleta tocar em Concluído (ex.: montar cones).',
    },
    seconds: { type: 'integer', minimum: 1, description: 'Duração em segundos (obrigatório em time e reps).' },
    reps: { type: 'integer', minimum: 1, description: 'Repetições (só no modo reps).' },
    notes: { type: 'string', description: 'Orientação curta mostrada na tela. Ex.: "Rápida", "Sem errar".' },
    voiceCue: { type: 'string', description: 'Frase falada no início do passo (opcional; por padrão fala o nome).' },
  },
  required: ['type', 'name', 'kind', 'mode'],
};

const BLOCK_SCHEMA = {
  type: 'object',
  description: 'Um bloco que repete seus itens "repeat" vezes. Use para séries, bi-sets e seções do treino.',
  properties: {
    type: { const: 'block' },
    name: { type: 'string', description: 'Ex.: "Guerra · Bi-set 1".' },
    repeat: { type: 'integer', minimum: 1, description: 'Quantas rodadas (séries).' },
    items: { type: 'array', items: { $ref: '#/$defs/item' } },
  },
  required: ['type', 'name', 'repeat', 'items'],
};

const GUIDE = `Monta o treino a partir do que o atleta mostrar (ex.: um print de outro app) e salva em "Meus treinos" no HIITapp.
Como montar:
- Cada seção do treino (Preparação, Ativação, Guerra...) vira um bloco com repeat 1.
- "N séries" de um exercício vira um bloco com repeat N contendo o exercício (e o descanso, se houver).
- Bi-set "N séries": bloco com repeat N e itens [exercício A, descanso, exercício B, descanso].
- "15 s de execução" = mode time, seconds 15. "30 repetições" = mode reps, reps 30, seconds = tempo estimado ou limite (ex.: "Limite: 5 min" = 300).
- Descanso em faixa ("5–20 s"): use um valor dentro da faixa e escreva a faixa em notes. "Sem descanso": não crie passo de descanso.
- Observações como "Rápida" ou "Sem errar" vão em notes.
- Quando o atleta escolhe o exercício ("Seu exercício preferido"), mantenha esse nome como marcador.
Responda ao atleta com um resumo curto do que foi criado.`;

export const TOOLS = [
  {
    name: 'criar_treino',
    title: 'Criar treino',
    description: GUIDE,
    inputSchema: {
      type: 'object',
      $defs: { item: { oneOf: [STEP_SCHEMA, BLOCK_SCHEMA] } },
      properties: {
        nome: { type: 'string', description: 'Nome do treino. Ex.: "Treino técnico · Sola + Condução".' },
        categoria: { type: 'string', enum: CATEGORY_VALUES, description: 'HIITCoach, FQB, Cardio ou Custom (personalizado).' },
        rodadas: { type: 'integer', minimum: 1, description: 'Quantas vezes repetir o treino inteiro. Normalmente 1.' },
        itens: { type: 'array', items: { $ref: '#/$defs/item' }, description: 'Passos e blocos, na ordem.' },
      },
      required: ['nome', 'itens'],
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
  },
  {
    name: 'listar_treinos',
    title: 'Listar treinos',
    description: 'Lista os treinos salvos em "Meus treinos" no HIITapp, com id, categoria e duração.',
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true },
  },
  {
    name: 'ver_treino',
    title: 'Ver treino',
    description: 'Mostra a estrutura completa de um treino salvo (use o id de listar_treinos).',
    inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
    annotations: { readOnlyHint: true },
  },
  {
    name: 'ver_historico',
    title: 'Ver histórico',
    description: 'Treinos feitos pelo atleta (data, duração, esforço de 1 a 10 e observações), do mais recente ao mais antigo.',
    inputSchema: {
      type: 'object',
      properties: { limite: { type: 'integer', minimum: 1, maximum: 200, description: 'Quantos registros (padrão 30).' } },
    },
    annotations: { readOnlyHint: true },
  },
];

function seconds(block: Block): number {
  let sum = 0;
  for (const item of block.items) sum += item.type === 'step' ? (item.mode === 'manual' ? 0 : item.seconds ?? 0) : seconds(item);
  return sum * block.repeat;
}

function clock(total: number): string {
  const m = Math.floor(total / 60);
  return `${m}:${String(total % 60).padStart(2, '0')}`;
}

function countSteps(block: Block): number {
  return block.items.reduce((n, i) => n + (i.type === 'step' ? 1 : countSteps(i)), 0);
}

interface ToolResult {
  content: { type: 'text'; text: string }[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}

const text = (t: string, structured?: Record<string, unknown>, isError = false): ToolResult => ({
  content: [{ type: 'text', text: t }],
  ...(structured ? { structuredContent: structured } : {}),
  ...(isError ? { isError } : {}),
});

const summary = (s: Session) => ({
  id: s.id,
  nome: s.name,
  categoria: s.category,
  duracao: clock(seconds(s.root)),
  atualizado: s.updatedAt,
});

export async function callTool(userId: string, name: string, args: Record<string, unknown>): Promise<ToolResult> {
  if (name === 'criar_treino') {
    try {
      const session = parseSessionData(
        {
          name: args.nome,
          category: args.categoria ?? 'Custom',
          root: { type: 'block', name: 'Sessão', repeat: args.rodadas ?? 1, items: args.itens },
        },
        () => randomToken(9),
      );
      await saveSession(userId, session);
      return text(
        `Treino "${session.name}" criado em Meus treinos: ${countSteps(session.root)} passos, ${clock(seconds(session.root))} cronometrados. ` +
          'Ele aparece no HIITapp na próxima sincronização (ao abrir o app).',
        summary(session),
      );
    } catch (err) {
      if (err instanceof SessionDataError) return text(`Não foi possível criar o treino: ${err.message}`, undefined, true);
      throw err;
    }
  }
  if (name === 'listar_treinos') {
    const { sessions } = await loadUserData(userId);
    const list = sessions.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map(summary);
    const lines = list.map((s) => `- ${s.nome} (${s.categoria}, ${s.duracao}) id=${s.id}`);
    return text(list.length ? lines.join('\n') : 'Nenhum treino salvo ainda.', { treinos: list });
  }
  if (name === 'ver_treino') {
    const { sessions } = await loadUserData(userId);
    const s = sessions.find((x) => x.id === args.id);
    if (!s) return text('Treino não encontrado. Use listar_treinos para ver os ids.', undefined, true);
    return text(JSON.stringify({ nome: s.name, categoria: s.category, rodadas: s.root.repeat, itens: s.root.items }, null, 2));
  }
  if (name === 'ver_historico') {
    const limit = typeof args.limite === 'number' ? Math.min(200, Math.max(1, Math.floor(args.limite))) : 30;
    const { history } = await loadUserData(userId);
    const list = history.slice(0, limit).map((e) => ({
      data: e.date,
      treino: e.sessionName,
      categoria: e.category,
      duracao: clock(e.totalSeconds),
      passos: `${e.stepsCompleted}/${e.stepsTotal}`,
      esforco: e.rpe ?? null,
      observacoes: e.notes ?? null,
    }));
    return text(list.length ? JSON.stringify(list, null, 2) : 'Nenhum treino no histórico ainda.', { historico: list });
  }
  return text(`Ferramenta desconhecida: ${name}`, undefined, true);
}
