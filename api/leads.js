// Vercel serverless function: /api/leads
// SUPABASE_KEY must be the service role key. Never the anon key, and never sent to the browser.

import { createClient } from '@supabase/supabase-js';

const hits = new Map();

function limited(ip) {
  const now = Date.now();
  const key = ip || 'unknown';
  const recent = (hits.get(key) || []).filter((t) => now - t < 10 * 60 * 1000);
  if (recent.length >= 8) return true;
  recent.push(now);
  hits.set(key, recent);
  return false;
}

function clip(value, max) {
  return String(value ?? '').replace(/[<>]/g, '').trim().slice(0, max);
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 120;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  if (limited(ip)) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(200).json({ ok: true, stored: false });
  }

  const lead = req.body || {};
  const email = clip(lead.email, 120);
  const name = clip(lead.name, 80);
  if (!name || !validEmail(email)) {
    return res.status(400).json({ error: 'Name and email required' });
  }
  if (lead.consent !== true) {
    return res.status(400).json({ error: 'Consent required' });
  }

  const shortlist = Array.isArray(lead.shortlist) ? lead.shortlist.slice(0, 4).map((car) => ({
    year: clip(car?.year, 8),
    make: clip(car?.make, 40),
    model: clip(car?.model, 40),
    price: Number(car?.price) || 0
  })) : [];

  const record = {
    name,
    email,
    phone: clip(lead.phone, 30),
    zip: clip(lead.zip, 12),
    timeline: clip(lead.timeline, 40),
    financing: clip(lead.financing, 40),
    message: clip([lead.message, lead.details].filter(Boolean).join('\n\n'), 2000),
    considering: clip(lead.considering, 120),
    selected_vehicle: clip(lead.selectedVehicle, 120),
    selected_price: Number(lead.selectedPrice) || 0,
    shortlist,
    submitted_at: new Date().toISOString()
  };

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    const { error } = await supabase.from('leads').insert(record);
    if (error) throw error;
    return res.status(200).json({ ok: true, stored: true });
  } catch (e) {
    console.error('Supabase lead insert failed');
    return res.status(500).json({ ok: false, error: 'Could not store lead' });
  }
}
