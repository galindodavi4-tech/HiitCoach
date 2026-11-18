import { useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';
import type { Block, Step } from '../types';
import { ChevronRight, Plus, Repeat } from 'lucide-react';
import { KIND_LABEL, stepColor } from '../lib/labels';
import { blockSeconds, formatClock } from '../lib/session';

// The tree is shown as a flat list: a block becomes a start row, its children, and an end row.
// Dropping a card between a block's start and end rows puts it inside that block.
type Row =
  | { id: string; type: 'step'; depth: number; step: Step }
  | { id: string; type: 'blockStart'; depth: number; block: Block }
  | { id: string; type: 'blockEnd'; depth: number; block: Block };

const END_SUFFIX = ':end';

function toRows(root: Block): Row[] {
  const rows: Row[] = [];
  const walk = (items: (Step | Block)[], depth: number) => {
    for (const item of items) {
      if (item.type === 'step') {
        rows.push({ id: item.id, type: 'step', depth, step: item });
      } else {
        rows.push({ id: item.id, type: 'blockStart', depth, block: item });
        walk(item.items, depth + 1);
        rows.push({ id: item.id + END_SUFFIX, type: 'blockEnd', depth, block: item });
      }
    }
  };
  walk(root.items, 0);
  return rows;
}

function fromRows(root: Block, rows: Row[]): Block {
  const top: Block = { ...root, items: [] };
  const stack: Block[] = [top];
  for (const row of rows) {
    const parent = stack[stack.length - 1];
    if (row.type === 'step') {
      parent.items.push(row.step);
    } else if (row.type === 'blockStart') {
      const block: Block = { ...row.block, items: [] };
      parent.items.push(block);
      stack.push(block);
    } else {
      stack.pop();
    }
  }
  return top;
}

// Rows that move together with a dragged block: its children and its end row
function hiddenRowIds(rows: Row[], activeId: string | null): Set<string> {
  const hidden = new Set<string>();
  const start = rows.findIndex((r) => r.id === activeId);
  if (start < 0 || rows[start].type !== 'blockStart') return hidden;
  const endId = activeId + END_SUFFIX;
  for (let i = start + 1; i < rows.length; i++) {
    hidden.add(rows[i].id);
    if (rows[i].id === endId) break;
  }
  return hidden;
}

function StepDetail({ step }: { step: Step }) {
  if (step.mode === 'manual') return <span className="p-label">Manual</span>;
  const time = formatClock(step.seconds ?? 0);
  if (step.mode === 'time') return <span className="p-num text-[16px]">{time}</span>;
  return (
    <span className="flex flex-col items-end gap-1">
      <span className="flex items-baseline gap-1">
        <span className="p-num text-[16px]">{step.reps ?? 0}</span>
        <span className="p-unit">reps</span>
      </span>
      <span className="p-unit">~{time}</span>
    </span>
  );
}

interface Props {
  root: Block;
  onChange: (root: Block) => void;
  onEditStep: (step: Step) => void;
  onEditBlock: (block: Block) => void;
  onAddStep: (blockId: string) => void;
  onAddBlock: (blockId: string) => void;
}

export default function ItemList({ root, onChange, onEditStep, onEditBlock, onAddStep, onAddBlock }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const draggedRecently = useRef(false);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // Long-press to drag, so a normal swipe still scrolls the page
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
  );

  const rows = toRows(root);
  const hidden = hiddenRowIds(rows, activeId);
  const visibleRows = rows.filter((r) => !hidden.has(r.id));

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
    draggedRecently.current = true;
    navigator.vibrate?.(30);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    // Ignore the click that follows a drag
    setTimeout(() => (draggedRecently.current = false), 50);
    if (!over || active.id === over.id) return;

    const oldIndex = visibleRows.findIndex((r) => r.id === active.id);
    const newIndex = visibleRows.findIndex((r) => r.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const moved = arrayMove(visibleRows, oldIndex, newIndex);
    const children = rows.filter((r) => hidden.has(r.id));
    const at = moved.findIndex((r) => r.id === active.id);
    moved.splice(at + 1, 0, ...children);
    onChange(fromRows(root, moved));
  }

  function tap(action: () => void) {
    return () => {
      if (!draggedRecently.current) action();
    };
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <SortableContext items={visibleRows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2">
          {visibleRows.map((row) => (
            <SortableRow key={row.id} row={row}>
              {row.type === 'step' && (
                <StepCard step={row.step} onClick={tap(() => onEditStep(row.step))} />
              )}
              {row.type === 'blockStart' && (
                <BlockHeader
                  block={row.block}
                  collapsed={row.id === activeId}
                  onClick={tap(() => onEditBlock(row.block))}
                />
              )}
              {row.type === 'blockEnd' && (
                <BlockFooter
                  onAddStep={() => onAddStep(row.block.id)}
                  onAddBlock={() => onAddBlock(row.block.id)}
                />
              )}
            </SortableRow>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableRow({ row, children }: { row: Row; children: ReactNode }) {
  // End rows are drop targets only; they cannot be dragged
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: row.id,
    disabled: row.type === 'blockEnd' ? { draggable: true } : false,
  });

  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    marginLeft: row.depth * 16,
    opacity: isDragging ? 0.85 : 1,
    zIndex: isDragging ? 10 : undefined,
    position: 'relative',
    touchAction: 'manipulation',
    WebkitTouchCallout: 'none',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`select-none ${isDragging ? 'scale-[1.02]' : ''}`}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  );
}

function StepCard({ step, onClick }: { step: Step; onClick: () => void }) {
  const color = stepColor(step);
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-16 w-full items-center gap-3 rounded-md border border-line-subtle bg-surface-1 px-3.5 py-3 text-left transition-colors duration-[140ms] hover:bg-surface-2"
    >
      {/* Kind swatch: index-square shape, filled with the step colour */}
      <span
        aria-hidden="true"
        className="h-9 w-2 flex-none rounded-xs"
        style={{ background: color, boxShadow: `0 0 10px color-mix(in oklab, ${color} 45%, transparent)` }}
      />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate text-[15px] font-semibold">{step.name}</span>
        <span className="font-mono text-[11px] tracking-[0.08em] uppercase" style={{ color }}>
          {KIND_LABEL[step.kind]}
        </span>
      </span>
      <span className="shrink-0">
        <StepDetail step={step} />
      </span>
      <ChevronRight size={18} className="shrink-0 text-muted" aria-hidden="true" />
    </button>
  );
}

function BlockHeader({ block, collapsed, onClick }: { block: Block; collapsed: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-14 w-full items-center justify-between gap-3 border border-line-strong bg-sunken px-3.5 py-2 text-left ${
        collapsed ? 'rounded-md' : 'rounded-t-md border-b-0'
      }`}
    >
      <span className="flex min-w-0 items-center gap-2.5">
        <Repeat size={16} strokeWidth={2} className="shrink-0 text-accent" aria-hidden="true" />
        <span className="truncate text-[15px] font-semibold">{block.name}</span>
      </span>
      <span className="shrink-0 font-mono text-[12px] tracking-[0.06em] text-accent uppercase">
        {block.repeat} × · {formatClock(blockSeconds(block))}
      </span>
    </button>
  );
}

function BlockFooter({ onAddStep, onAddBlock }: { onAddStep: () => void; onAddBlock: () => void }) {
  return (
    <div className="grid grid-cols-2 gap-2 rounded-b-md border border-t-0 border-line-strong bg-sunken p-2">
      <button type="button" className="p-btn p-btn-secondary p-btn-sm" onClick={onAddStep}>
        <Plus size={15} strokeWidth={2} /> Passo aqui
      </button>
      <button type="button" className="p-btn p-btn-secondary p-btn-sm" onClick={onAddBlock}>
        <Plus size={15} strokeWidth={2} /> Bloco aqui
      </button>
    </div>
  );
}
