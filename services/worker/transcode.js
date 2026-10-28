// تحويل أي فيديو إلى HLS بجودتين (360 + 720 لو المصدر يسمح) مع master playlist. يحتاج ffmpeg/ffprobe.
const { spawn, execFile } = require('child_process');
const fs = require('fs'), path = require('path');

const run = (cmd, args) => new Promise((res, rej) => {
  const p = spawn(cmd, args); let err = '';
  p.stderr.on('data', d => { err = (err + d).slice(-4000); });
  p.on('error', rej);
  p.on('close', c => (c === 0 ? res() : rej(new Error(`${cmd} exited ${c}: ${err}`))));
});
const probe = f => new Promise((res, rej) => execFile('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', f], { maxBuffer: 1e7 }, (e, o) => (e ? rej(e) : res(JSON.parse(o)))));
const even = n => Math.max(2, Math.round(n / 2) * 2);

async function transcode(input, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const info = await probe(input);
  const v = info.streams.find(s => s.codec_type === 'video');
  if (!v) throw new Error('no video stream');
  const hasAudio = info.streams.some(s => s.codec_type === 'audio');
  let w = v.width, h = v.height;
  const rot = Math.abs(Number((v.side_data_list || []).find(x => 'rotation' in x)?.rotation ?? v.tags?.rotate ?? 0));
  if (rot === 90 || rot === 270) [w, h] = [h, w];
  const duration = Number(info.format.duration) || 0;
  const portrait = h > w, short = Math.min(w, h);
  const sizes = [...new Set([Math.min(360, even(short)), ...(short >= 720 ? [720] : [])])];
  const variants = [];
  for (const S of sizes) {
    const name = `${S}p`, hi = S >= 720;
    await run('ffmpeg', ['-y', '-v', 'error', '-i', input,
      '-vf', `${portrait ? `scale=${S}:-2` : `scale=-2:${S}`},format=yuv420p`,
      '-c:v', 'libx264', '-preset', 'veryfast', '-profile:v', 'main', '-crf', hi ? '23' : '24',
      '-maxrate', hi ? '3500k' : '1200k', '-bufsize', hi ? '7000k' : '2400k',
      '-force_key_frames', 'expr:gte(t,n_forced*2)', '-sc_threshold', '0',
      ...(hasAudio ? ['-c:a', 'aac', '-b:a', '96k', '-ac', '2'] : ['-an']),
      '-f', 'hls', '-hls_time', '4', '-hls_playlist_type', 'vod',
      '-hls_segment_filename', path.join(outDir, `${name}_%03d.ts`), path.join(outDir, `${name}.m3u8`)]);
    const bytes = fs.readdirSync(outDir).filter(f => f.startsWith(name + '_')).reduce((a, f) => a + fs.statSync(path.join(outDir, f)).size, 0);
    const bw = Math.round(((bytes * 8) / Math.max(duration, 1)) * 1.2);
    const [rw, rh] = portrait ? [S, even((S * h) / w)] : [even((S * w) / h), S];
    variants.push({ name, bw, res: `${rw}x${rh}` });
  }
  variants.sort((a, b) => a.bw - b.bw);
  fs.writeFileSync(path.join(outDir, 'master.m3u8'),
    '#EXTM3U\n#EXT-X-VERSION:3\n' + variants.map(x => `#EXT-X-STREAM-INF:BANDWIDTH=${x.bw},RESOLUTION=${x.res}\n${x.name}.m3u8\n`).join(''));
  return { files: fs.readdirSync(outDir), duration, width: w, height: h, variants };
}
module.exports = { transcode };
