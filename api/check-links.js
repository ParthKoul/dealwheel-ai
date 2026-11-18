// Confirms a dealer page still exists before we show the link.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const urls = Array.isArray(req.body?.urls) ? req.body.urls.slice(0, 12) : [];

  const results = await Promise.all(urls.map(async (url) => {
    if (typeof url !== 'string' || !/^https:\/\//i.test(url)) {
      return { url, ok: false };
    }
    const ok = await pageExists(url);
    return { url, ok };
  }));

  return res.status(200).json({ results });
}

async function pageExists(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4500);
  try {
    let response = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: ctrl.signal });
    if (response.status === 405 || response.status === 403 || response.status === 401) {
      response = await fetch(url, { method: 'GET', redirect: 'follow', signal: ctrl.signal });
    }
    return response.status >= 200 && response.status < 400;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
