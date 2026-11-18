// Confirms a public dealer page still exists. Does not follow redirects.

function publicHttps(raw) {
  let url;
  try { url = new URL(raw); } catch { return null; }
  if (url.protocol !== 'https:') return null;
  if (url.username || url.password) return null;
  const host = url.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) return null;
  if (host === 'metadata.google.internal') return null;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(':')) return null;
  return url.href;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const urls = Array.isArray(req.body?.urls) ? req.body.urls.slice(0, 8) : [];
  const results = await Promise.all(urls.map(async (raw) => {
    const checked = publicHttps(raw);
    if (!checked) return { url: raw, ok: false, dead: false };
    const status = await pageStatus(checked);
    const dead = status === 404 || status === 410;
    return { url: raw, ok: !dead, dead };
  }));

  return res.status(200).json({ results });
}

async function pageStatus(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4500);
  try {
    const response = await fetch(url, { method: 'HEAD', redirect: 'manual', signal: ctrl.signal });
    if (response.status === 405 || response.status === 501) {
      const getRes = await fetch(url, { method: 'GET', redirect: 'manual', signal: ctrl.signal });
      return getRes.status;
    }
    return response.status;
  } catch {
    return 0;
  } finally {
    clearTimeout(timer);
  }
}
