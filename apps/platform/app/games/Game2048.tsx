'use client';
import { useEffect, useState, useCallback } from 'react';
import { saveScore } from './lib';

type Grid = number[][];
const empty = (): Grid => Array.from({ length: 4 }, () => Array(4).fill(0));

function addTile(g: Grid): Grid {
  const cells: [number, number][] = [];
  g.forEach((r, y) => r.forEach((v, x) => { if (!v) cells.push([y, x]); }));
  if (!cells.length) return g;
  const [y, x] = cells[Math.floor(Math.random() * cells.length)];
  const n = g.map(r => [...r]);
  n[y][x] = Math.random() < 0.9 ? 2 : 4;
  return n;
}

// يدمج صف واحد باتجاه اليسار
function slide(row: number[]): { row: number[]; gained: number } {
  const vals = row.filter(Boolean);
  let gained = 0;
  for (let i = 0; i < vals.length - 1; i++) {
    if (vals[i] === vals[i + 1]) { vals[i] *= 2; gained += vals[i]; vals.splice(i + 1, 1); }
  }
  while (vals.length < 4) vals.push(0);
  return { row: vals, gained };
}

function move(g: Grid, dir: 'L' | 'R' | 'U' | 'D'): { g: Grid; gained: number; changed: boolean } {
  let gained = 0;
  const work = (rows: Grid) => rows.map(r => { const s = slide(r); gained += s.gained; return s.row; });
  let n: Grid;
  if (dir === 'L') n = work(g);
  else if (dir === 'R') n = work(g.map(r => [...r].reverse())).map(r => r.reverse());
  else {
    const t = g[0].map((_, x) => g.map(r => r[x]));
    const tt = dir === 'U' ? work(t) : work(t.map(r => [...r].reverse())).map(r => r.reverse());
    n = tt[0].map((_, y) => tt.map(r => r[y]));
  }
  const changed = JSON.stringify(n) !== JSON.stringify(g);
  return { g: n, gained, changed };
}

const COLORS: Record<number, string> = { 0: '#121a33', 2: '#EFE6CF', 4: '#f2d9a0', 8: '#f5a869', 16: '#f08a4b', 32: '#ea6a3c', 64: '#e04a2c', 128: '#E9B949', 256: '#e9b430', 512: '#d9a51a', 1024: '#1FC8B4', 2048: '#1FC8B4' };

export default function Game2048({ onMsg }: { onMsg: (m: string) => void }) {
  const [g, setG] = useState<Grid>(() => addTile(addTile(empty())));
  const [score, setScore] = useState(0);
  const [over, setOver] = useState(false);
  const [saved, setSaved] = useState(false);

  const isOver = (grid: Grid) => ['L', 'R', 'U', 'D'].every(d => !move(grid, d as any).changed);

  const doMove = useCallback((d: 'L' | 'R' | 'U' | 'D') => {
    if (over) return;
    setG(prev => {
      const r = move(prev, d);
      if (!r.changed) return prev;
      const next = addTile(r.g);
      setScore(s => s + r.gained);
      if (isOver(next)) setOver(true);
      return next;
    });
  }, [over]);

  useEffect(() => {
    const keys: Record<string, 'L' | 'R' | 'U' | 'D'> = { ArrowLeft: 'L', ArrowRight: 'R', ArrowUp: 'U', ArrowDown: 'D' };
    const h = (e: KeyboardEvent) => { if (keys[e.key]) { e.preventDefault(); doMove(keys[e.key]); } };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [doMove]);

  // حفظ النتيجة مرة واحدة عند الخسارة
  useEffect(() => {
    if (over && !saved) {
      setSaved(true);
      saveScore('2048', score).then(r => onMsg(r.ok ? `انتهت اللعبة. النتيجة ${score} 🏆` : r.reason));
    }
  }, [over, saved, score, onMsg]);

  // تحريك باللمس للموبايل
  let sx = 0, sy = 0;
  const onTouchStart = (e: React.TouchEvent) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; };
  const onTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    if (Math.abs(dx) > Math.abs(dy)) doMove(dx > 0 ? 'R' : 'L'); else doMove(dy > 0 ? 'D' : 'U');
  };

  return (
    <div className="flex flex-col items-center gap-4" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <p>النتيجة: {score}</p>
      <div className="grid grid-cols-4 gap-2 rounded-xl p-2" style={{ background: '#0f1730' }}>
        {g.flat().map((v, i) => (
          <div key={i} className="grid h-16 w-16 place-items-center rounded-lg font-black"
            style={{ background: COLORS[v] ?? '#1FC8B4', color: v <= 4 ? '#0B1020' : '#fff', fontSize: v >= 1000 ? 14 : 20 }}>
            {v || ''}
          </div>
        ))}
      </div>
      <p className="text-sm opacity-70">اسحب بالإصبع أو استخدم الأسهم</p>
      <button onClick={() => { setG(addTile(addTile(empty()))); setScore(0); setOver(false); setSaved(false); }}
        className="rounded-lg px-5 py-2 font-bold" style={{ background: '#E9B949', color: '#0B1020' }}>
        ابدأ من جديد
      </button>
    </div>
  );
}
