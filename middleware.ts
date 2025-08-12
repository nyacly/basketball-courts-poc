import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const hasUid = req.cookies.get('uid')?.value;
  if (!hasUid) {
    res.cookies.set('uid', crypto.randomUUID(), {
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
    });
  }
  return res;
}

export const config = { matcher: ['/', '/(api|app)(.*)'] };
