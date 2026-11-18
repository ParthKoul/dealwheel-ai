// Vercel serverless: /api/webhook
import crypto from 'crypto';

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || '';

function verifySignature(req) {
  if (!WEBHOOK_SECRET) return false;
  const sig = String(req.headers['x-signature'] || req.headers['x-autodev-signature'] || '');
  const expected = crypto.createHmac('sha256', WEBHOOK_SECRET).update(JSON.stringify(req.body || {})).digest('hex');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!verifySignature(req)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const type = (req.body && (req.body.type || req.body.event)) || 'unknown';
  console.log('[webhook]', String(type).slice(0, 40));
  return res.status(200).json({ received: true });
}
