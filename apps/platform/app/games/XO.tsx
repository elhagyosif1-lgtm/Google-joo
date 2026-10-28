'use client';
import { useState } from 'react';
import { saveScore } from './lib';

type Cell = 'X' | 'O' | null;
const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

function winner(b: Cell[]): Cell | 'draw' | null {
  for (const [a, c, d] of LINES) if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a];
  return b.every(Boolean) ? 'draw' : null;
}

// الذكاء الاصطناعي: minimax كامل، ما يخسر أبداً
function best(b: Cell[]): number {
  let bestScore = -Infinity, move = -1;
  const minimax = (board: Cell[], turn: 'X' | 'O', depth: number): number => {
    const w = winner(board);
    if (w === 'O') return 10 - depth;
    if (w === 'X') return depth - 10;
    if (w === 'draw') return 0;
    let scores: number[] = [];
    for (let i = 0; i < 9; i++) if (!board[i]) {
      board[i] = turn;
      scores.push(minimax(board, turn === 'O' ? 'X' : 'O', depth + 1));
      board[i] = null;
    }
    return turn === 'O' ? Math.max(...scores) : Math.min(...scores);
  };
  for (let i = 0; i < 9; i++) if (!b[i]) {
    b[i] = 'O';
    const s = minimax(b, 'X', 1);
    b[i] = null;
    if (s > bestScore) { bestScore = s; move = i; }
  }
  return move;
}

export default function XO({ onMsg }: { onMsg: (m: string) => void }) {
  const [b, setB] = useState<Cell[]>(Array(9).fill(null));
  const [wins, setWins] = useState(0);
  const w = winner(b);

  const play = async (i: number) => {
    if (b[i] || w) return;
    const nb = [...b]; nb[i] = 'X';
    if (!winner(nb)) { const m = best(nb); if (m >= 0) nb[m] = 'O'; }
    setB(nb);
    const res = winner(nb);
    if (res === 'X') {
      const n = wins + 1; setWins(n);
      const r = await saveScore('xo', n * 100);
      onMsg(r.ok ? 'فزت! تم حفظ النقاط 🏆' : r.reason);
    } else if (res === 'O') onMsg('الكمبيوتر فاز هذه المرة');
    else if (res === 'draw') onMsg('تعادل');
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <p>الفوز المتتالي: {wins}</p>
      <div className="grid grid-cols-3 gap-2">
        {b.map((c, i) => (
          <button key={i} onClick={() => play(i)} aria-label={`خانة ${i + 1}`}
            className="grid h-24 w-24 place-items-center rounded-xl text-4xl font-black"
            style={{ background: '#121a33', color: c === 'X' ? '#1FC8B4' : '#E9B949' }}>
            {c}
          </button>
        ))}
      </div>
      <button onClick={() => { setB(Array(9).fill(null)); setWins(0); onMsg(''); }}
        className="rounded-lg px-5 py-2 font-bold" style={{ background: '#E9B949', color: '#0B1020' }}>
        ابدأ من جديد
      </button>
    </div>
  );
}
