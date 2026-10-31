// سوق محاكاة (لا فلوس حقيقية). الأسعار حتمية من الزمن + بذرة سرية فلا يمكن توقعها.
import { env } from './core.mjs';
export const ASSETS = {
  GOLD:  { name: 'ذهب',          base: 3200,  vol: 0.020 },
  BTC:   { name: 'بيتكوين',      base: 65000, vol: 0.060 },
  USD:   { name: 'دولار / جنيه', base: 50,    vol: 0.015 },
  TEA:   { name: 'شاي',          base: 12,    vol: 0.050 },
  SUGAR: { name: 'سكر',          base: 8,     vol: 0.040 },
};
const seed = (parseFloat(env('MARKET_SEED', '7')) || 7) % 1000;
const rnd = i => { const x = Math.sin(i * 127.1 + 311.7 + seed) * 43758.5453; return x - Math.floor(x); };
export function price(sym, t = Date.now()) {
  const a = ASSETS[sym]; const k = Object.keys(ASSETS).indexOf(sym) + 1; const m = t / 60000 + seed;
  let p = a.base * (1 + a.vol * (Math.sin(m / 37 + k) + 0.6 * Math.sin(m / 11 + k * 2) + 0.3 * Math.sin(m / 5 + k * 3)));
  const s = Math.floor(t / 5000), f = (t % 5000) / 5000;
  p *= 1 + a.vol * 0.25 * ((1 - f) * (rnd(s + k * 1e4) - 0.5) + f * (rnd(s + 1 + k * 1e4) - 0.5));
  return +p.toFixed(a.base < 100 ? 3 : 2);
}
export const prices = () => Object.fromEntries(Object.keys(ASSETS).map(s => [s, price(s)]));
export const equity = (acc, px = prices()) => Object.entries(acc.positions || {}).reduce((t, [s, q]) => t + q * (px[s] || 0), +acc.cash);
