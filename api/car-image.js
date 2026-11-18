// Photo for a make/model. Real Auto.dev listing photo first, Car Images API if none.
import { createClient } from '@supabase/supabase-js';

function firstPhoto(item) {
  const bags = [item?.retailListing, item, item?.vehicle].filter(Boolean);
  for (const bag of bags) {
    const list = [bag.primaryImage, bag.photo, bag.image];
    if (Array.isArray(bag.images)) list.push(...bag.images);
    if (Array.isArray(bag.photos)) list.push(...bag.photos);
    for (const c of list) {
      const url = typeof c === 'string' ? c : c && (c.url || c.href || c.src);
      if (url && /^https?:/i.test(url)) return url.replace(/^http:/i, 'https:');
    }
  }
  return null;
}

async function autodevPhoto(make, model, year) {
  const key = process.env.AUTODEV_API_KEY;
  if (!key) return null;
  const params = new URLSearchParams({
    'vehicle.make': make,
    'vehicle.model': model,
    limit: '8'
  });
  if (year) params.set('vehicle.year', String(year));
  const res = await fetch('https://api.auto.dev/listings?' + params.toString(), {
    headers: { Authorization: 'Bearer ' + key, Accept: 'application/json' }
  });
  if (!res.ok) return null;
  const body = await res.json();
  const rows = body.data || body.listings || body.records || [];
  for (const item of rows) {
    const photo = firstPhoto(item);
    if (photo) return photo;
  }
  return null;
}

function safeImageUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return null;
    if (parsed.username || parsed.password) return null;
    const host = parsed.hostname.toLowerCase();
    if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) return null;
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(':')) return null;
    return parsed.href;
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  const { make, model, year } = req.query;
  const imageKey = process.env.CAR_IMAGES_API_KEY;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;

  if (!make || !model) {
    return res.status(400).json({ error: 'make and model required' });
  }

  const cacheKey = `${String(make).toLowerCase()}|${String(model).toLowerCase()}|${year || ''}`;

  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data } = await supabase.from('car_images').select('image_url').eq('cache_key', cacheKey).single();
      if (data?.image_url && safeImageUrl(data.image_url) && !data.image_url.includes('imagin.studio')) {
        return res.redirect(302, safeImageUrl(data.image_url));
      }
    } catch (e) {}
  }

  let photo = null;
  try { photo = await autodevPhoto(make, model, year); } catch (e) { photo = null; }

  if (!photo && imageKey) {
    photo = `https://carimagesapi.com/image?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}&year=${year || ''}&view=front34&width=800&key=${imageKey}`;
  }

  photo = safeImageUrl(photo);
  if (!photo) return res.status(404).json({ url: null });

  if (photo.includes('carimagesapi.com')) {
    try {
      const img = await fetch(photo);
      if (!img.ok) return res.status(404).json({ url: null });
      const bytes = Buffer.from(await img.arrayBuffer());
      res.setHeader('Content-Type', img.headers.get('content-type') || 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.status(200).send(bytes);
    } catch {
      return res.status(404).json({ url: null });
    }
  }

  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      await supabase.from('car_images').upsert({
        cache_key: cacheKey,
        make,
        model,
        year: year || null,
        image_url: photo,
        created_at: new Date().toISOString()
      }, { onConflict: 'cache_key' });
    } catch (e) {}
  }

  return res.redirect(302, photo);
}
