/**
 * hooks/useExecutionEngine — motor del timer de ejecución de un bloque.
 *
 * Conduce el reloj: recorre los segmentos work/break, dispara notificaciones en
 * cada transición y persiste el "run state" en localStorage para sobrevivir a
 * recargas. La lógica pura del recorrido está en `domain/execution.js`; aquí
 * solo vive el efecto del tiempo (intervalos, persistencia, notificaciones).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  initRunState,
  currentSegment,
  remainingMs,
  isSegmentOver,
  isComplete,
  advance,
  pause as pauseRun,
  resume as resumeRun,
  blockProgress,
  segmentsOf,
  workSegmentPosition,
} from '../domain/execution.js';
import { notifier } from '../infrastructure/notifications/notifier.js';

const STORAGE_KEY = 'bloque:run';

function loadRun(blockId) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.blockId === blockId ? parsed : null;
  } catch (_e) {
    return null;
  }
}

function saveRun(run) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(run));
  } catch (_e) {
    /* persistir es best-effort */
  }
}

export function clearRun() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (_e) {
    /* noop */
  }
}

/** Segundos de trabajo efectivamente realizados hasta el cursor (+ parcial). */
function workSecDone(block, run, now) {
  const segs = segmentsOf(block);
  let sec = 0;
  for (let i = 0; i < run.cursor && i < segs.length; i += 1) {
    if (segs[i].kind === 'work') sec += segs[i].duration_min * 60;
  }
  const seg = segs[run.cursor];
  if (seg && seg.kind === 'work') {
    const elapsedMs = seg.duration_min * 60 * 1000 - remainingMs(block, run, now);
    sec += Math.max(0, elapsedMs / 1000);
  }
  return Math.round(sec);
}

/**
 * @param {{ block: object, day: object, soundEnabled?: boolean,
 *           onComplete: (info: {actualWorkSec:number}) => void,
 *           onResolveBreak: (info: {segmentIndex:number, status:string}) => void }} args
 */
export function useExecutionEngine({ block, day, soundEnabled = true, onComplete, onResolveBreak }) {
  const [run, setRun] = useState(() => loadRun(block.id) ?? initRunState(block, day.id));
  const [now, setNow] = useState(() => Date.now());
  const runRef = useRef(run);
  const finishedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  const onResolveBreakRef = useRef(onResolveBreak);

  useEffect(() => {
    onCompleteRef.current = onComplete;
    onResolveBreakRef.current = onResolveBreak;
  });

  // Persistir cada cambio del run state.
  const commit = useCallback((next) => {
    runRef.current = next;
    setRun(next);
    saveRun(next);
  }, []);

  // Reloj: un tick por segundo.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Finaliza el bloque entero (natural o anticipado).
  const finishBlock = useCallback(
    (atRun) => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      const actualWorkSec = workSecDone(block, atRun, Date.now());
      clearRun();
      notifier.dayComplete(soundEnabled);
      onCompleteRef.current?.({ actualWorkSec });
    },
    [block, soundEnabled],
  );

  // Transición de segmento cuando se agota el tiempo.
  useEffect(() => {
    const r = runRef.current;
    if (finishedRef.current || r.paused) return;
    if (!isSegmentOver(block, r, now)) return;

    const finishedSeg = currentSegment(block, r);
    const next = advance(r, Date.now());

    // Un descanso que termina solo cuenta como "respetado".
    if (finishedSeg?.kind === 'break') {
      onResolveBreakRef.current?.({ segmentIndex: r.cursor, status: 'respected' });
    }

    if (isComplete(block, next)) {
      finishBlock(r);
      return;
    }

    const nextSeg = currentSegment(block, next);
    if (nextSeg?.kind === 'break') {
      notifier.breakStart(nextSeg.activity, soundEnabled);
    } else if (finishedSeg?.kind === 'break') {
      notifier.breakEnd(block.title, soundEnabled);
    }
    commit(next);
  }, [now, block, commit, finishBlock, soundEnabled]);

  // ─── Acciones ───────────────────────────────────────────────────────────
  const pause = useCallback(() => {
    commit(pauseRun(block, runRef.current, Date.now()));
  }, [block, commit]);

  const resume = useCallback(() => {
    commit(resumeRun(block, runRef.current, Date.now()));
  }, [block, commit]);

  /** Saltarse el descanso actual (requiere confirmación en la UI). */
  const skipBreak = useCallback(() => {
    const r = runRef.current;
    const seg = currentSegment(block, r);
    if (seg?.kind !== 'break') return;
    onResolveBreakRef.current?.({ segmentIndex: r.cursor, status: 'skipped' });
    const next = advance(r, Date.now());
    if (isComplete(block, next)) {
      finishBlock(r);
      return;
    }
    notifier.breakEnd(block.title, soundEnabled);
    commit(next);
  }, [block, commit, finishBlock, soundEnabled]);

  /** Marcar el bloque como terminado anticipadamente. */
  const completeNow = useCallback(() => {
    finishBlock(runRef.current);
  }, [finishBlock]);

  // ─── Estado derivado para la UI ─────────────────────────────────────────
  const view = useMemo(() => {
    const seg = currentSegment(block, run);
    const segs = segmentsOf(block);
    return {
      segment: seg,
      kind: seg?.kind ?? 'work',
      cursor: run.cursor,
      segments: segs,
      remainingSec: Math.ceil(remainingMs(block, run, now) / 1000),
      progress: blockProgress(block, run, now),
      paused: run.paused,
      workPosition: workSegmentPosition(block, run),
    };
  }, [block, run, now]);

  return { ...view, pause, resume, skipBreak, completeNow };
}
