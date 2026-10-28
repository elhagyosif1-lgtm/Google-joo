'use client';
import { useState, useCallback, useEffect } from 'react';
import XO from './XO';
import Game2048 from './Game2048';
import { topScores } from './lib';

type Game = 'xo' | '2048';

export default function GamesPage() {
  const [game, setGame] = useState<Game>('xo');
  const [msg, setMsg] = useState('');
  const [top, setTop] = useState<{ score: number; profiles: { username: string } | null }[]>([]);
  const onMsg = useCallback((m: string) => setMsg(m), []);

  useEffect(() => { topScores(game).then(setTop); }, [game, msg]);

  return (
    <main dir="rtl" className="mx-auto max-w-md p-4">
      <h1 className="mb-4 text-3xl font-black" style={{ color: '#E9B949' }}>الألعاب</h1>
      <div className="mb-6 flex gap-2">
        {([['xo', 'إكس أو ضد الكمبيوتر'], ['2048', '2048']] as [Game, string][]).map(([k, label]) => (
          <button key={k} onClick={() => { setGame(k); setMsg(''); }}
            className="flex-1 rounded-lg py-2 font-bold"
            style={{ background: game === k ? '#1FC8B4' : '#121a33', color: game === k ? '#0B1020' : '#EFE6CF' }}>
            {label}
          </button>
        ))}
      </div>

      {game === 'xo' ? <XO onMsg={onMsg} /> : <Game2048 onMsg={onMsg} />}

      {msg && <p role="status" className="mt-4 text-center font-bold" style={{ color: '#E9B949' }}>{msg}</p>}

      <section className="mt-8">
        <h2 className="mb-3 text-xl font-black">أفضل اللاعبين</h2>
        <ol className="space-y-2">
          {top.length === 0 && <li className="opacity-70">لا توجد نتائج بعد</li>}
          {top.map((t, i) => (
            <li key={i} className="flex justify-between rounded-lg p-3" style={{ background: '#121a33' }}>
              <span>{i + 1}. @{t.profiles?.username ?? '؟'}</span>
              <b>{t.score}</b>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
