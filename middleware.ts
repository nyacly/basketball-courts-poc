import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { randomUUID } from 'crypto';

export function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const hasUid = req.cookies.get('uid')?.value;
  if (!hasUid) {
    res.cookies.set('uid', randomUUID(), {
      httpOnly: true,
      sameSite: 'Lax',
      secure: true,
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
    });
  }
  return res;
}

export const config = { matcher: ['/', '/(api|app)(.*)'] };
