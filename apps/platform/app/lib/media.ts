import { sb } from './sb';

export const pub = (p: string) => sb.storage.from('videos').getPublicUrl(p).data.publicUrl;
export const objPath = (u?: string | null) => u?.split('/object/public/videos/')[1];

/* رفع حقيقي إلى Supabase Storage مع نسبة تقدّم فعلية */
export const put = async (path: string, file: Blob, type: string, onP?: (p: number) => void) => {
  const token = (await sb.auth.getSession()).data.session?.access_token;
  if (!token) throw new Error('AUTH_REQUIRED');
  return new Promise<void>((res, rej) => {
    const x = new XMLHttpRequest();
    x.open('POST', `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/videos/${path}`);
    x.setRequestHeader('Authorization', `Bearer ${token}`);
    x.setRequestHeader('apikey', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    x.setRequestHeader('Content-Type', type);
    x.upload.onprogress = e => e.lengthComputable && onP?.(Math.round((e.loaded / e.total) * 100));
    x.onload = () => (x.status < 300 ? res() : rej(new Error(x.responseText || 'UPLOAD_FAILED')));
    x.onerror = () => rej(new Error('تعذّر الاتصال، تأكد من الإنترنت'));
    x.send(file);
  });
};

/* مدة الفيديو + صورة غلاف من الفيديو نفسه */
export const frame = (file: File) => new Promise<{ blob: Blob | null; dur: number }>(res => {
  const v = document.createElement('video'), u = URL.createObjectURL(file);
  v.muted = true; v.playsInline = true; v.preload = 'metadata'; v.src = u;
  const end = (blob: Blob | null, dur: number) => { URL.revokeObjectURL(u); res({ blob, dur }); };
  v.onloadedmetadata = () => { v.currentTime = Math.min(0.5, (v.duration || 1) / 2); };
  v.onseeked = () => {
    const c = document.createElement('canvas'); c.width = 480; c.height = Math.round((480 * (v.videoHeight || 16)) / (v.videoWidth || 9));
    c.getContext('2d')?.drawImage(v, 0, 0, c.width, c.height);
    c.toBlob(b => end(b, v.duration), 'image/jpeg', 0.8);
  };
  v.onerror = () => end(null, NaN);
});

/* صورة شخصية: قص مربع 256px وضغط JPEG */
export const squareJpeg = async (file: File) => {
  const bmp = await createImageBitmap(file), s = Math.min(bmp.width, bmp.height), c = document.createElement('canvas');
  c.width = c.height = 256;
  c.getContext('2d')!.drawImage(bmp, (bmp.width - s) / 2, (bmp.height - s) / 2, s, s, 0, 0, 256, 256);
  return new Promise<Blob>((res, rej) => c.toBlob(b => (b ? res(b) : rej(new Error('تعذّر قراءة الصورة'))), 'image/jpeg', 0.85));
};

/* حذف كل ملفات الفيديو: الأصلي + الغلاف + قطع HLS */
export const rmVideoFiles = async (v: { id: number; user_id: string; url?: string; poster?: string | null }) => {
  const files = [objPath(v.url), objPath(v.poster)].filter(Boolean) as string[];
  const dir = `${v.user_id}/hls/${v.id}`;
  const { data } = await sb.storage.from('videos').list(dir, { limit: 1000 });
  files.push(...(data ?? []).map(f => `${dir}/${f.name}`));
  if (files.length) await sb.storage.from('videos').remove(files);
};
