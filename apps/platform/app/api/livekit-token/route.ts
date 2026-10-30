import { AccessToken } from 'livekit-server-sdk';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const jwt = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!jwt) return new NextResponse('AUTH_REQUIRED', { status: 401 });
  const { roomId } = await req.json();
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { global: { headers: { Authorization: `Bearer ${jwt}` } } });
  const { data: u } = await sb.auth.getUser(jwt);
  if (!u.user) return new NextResponse('AUTH_REQUIRED', { status: 401 });
  const { data: profile } = await sb.from('profiles').select('banned').eq('id', u.user.id).maybeSingle();
  if (!profile || profile.banned) return new NextResponse('ACCOUNT_RESTRICTED', { status: 403 });
  const { data: room } = await sb.from('rooms').select('id,host_id,is_live').eq('id', roomId).maybeSingle();
  if (!room || !room.is_live) return new NextResponse('ROOM_NOT_LIVE', { status: 404 });
  const isHost = room.host_id === u.user.id;
  const at = new AccessToken(process.env.LIVEKIT_API_KEY!, process.env.LIVEKIT_API_SECRET!, { identity: u.user.id, ttl: '10m' });
  at.addGrant({ room: `room-${room.id}`, roomJoin: true, canPublish: isHost, canPublishData: isHost, canSubscribe: true });
  return NextResponse.json({ token: await at.toJwt(), url: process.env.LIVEKIT_URL, isHost });
}
