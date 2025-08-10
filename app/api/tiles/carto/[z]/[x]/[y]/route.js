export async function GET(_req, { params }) {
  const { z, x } = params;
  const y = String(params.y || '').replace(/\.png$/i, ''); // defensive

  const host = ['a', 'b', 'c', 'd'][Math.floor(Math.random() * 4)];
  const upstream = `https://${host}.basemaps.cartocdn.com/rastertiles/voyager/${z}/${x}/${y}.png`;

  const r = await fetch(upstream, { cache: 'force-cache' });
  if (!r.ok) return new Response('tile error', { status: r.status });

  return new Response(r.body, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
