// server: pass NextRequest cookies; client: falls back to localStorage
export function getClientUserId(): string {
  const m = document.cookie.match(/(?:^| )uid=([^;]+)/);
  if (m) return decodeURIComponent(m[1]);
  let id = localStorage.getItem('uid');
  if (!id) { id = crypto.randomUUID(); localStorage.setItem('uid', id); }
  return id;
}
