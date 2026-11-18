// Vercel serverless function: /api/listings
import axios from 'axios';

const ALLOWED = [
  'vehicle.make',
  'vehicle.model',
  'vehicle.year',
  'retailListing.price',
  'retailListing.miles',
  'zip',
  'distance'
];

function pickQuery(query) {
  const out = { limit: 40 };
  for (const key of ALLOWED) {
    const val = query?.[key];
    if (typeof val !== 'string') continue;
    const clean = val.trim().slice(0, 80);
    if (!clean) continue;
    out[key] = clean;
  }
  if (out.zip && !/^\d{5}$/.test(out.zip)) delete out.zip;
  if (out.distance) {
    const d = Math.min(500, Math.max(1, parseInt(out.distance, 10) || 50));
    out.distance = String(d);
  }
  return out;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const AUTODEV_KEY = process.env.AUTODEV_API_KEY;

  if (!AUTODEV_KEY) {
    return res.status(200).json({
      data: [],
      mock: true,
      message: 'Listings are not configured'
    });
  }

  try {
    const response = await axios.get('https://api.auto.dev/listings', {
      params: pickQuery(req.query),
      headers: {
        Authorization: `Bearer ${AUTODEV_KEY}`,
        Accept: 'application/json'
      },
      timeout: 10000
    });

    const body = response.data || {};
    const data = body.data || body.listings || body.records || body;
    return res.status(200).json({ data: Array.isArray(data) ? data : [] });
  } catch (error) {
    console.error('Auto.dev error:', error.response?.status || error.message);
    return res.status(500).json({
      error: 'Failed to fetch listings',
      fallback: true
    });
  }
}
