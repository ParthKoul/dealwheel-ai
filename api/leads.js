// Vercel serverless function: /api/leads
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.log('LEAD received (supabase not configured)');
    return res.status(200).json({ ok: true, stored: false, message: 'Supabase not configured' });
  }

  const lead = req.body || {};
  if (!lead.email || !lead.name) {
    return res.status(400).json({ error: 'Name and email required' });
  }
  if (!lead.consent) {
    return res.status(400).json({ error: 'Consent required' });
  }

  const record = {
    name: lead.name,
    email: lead.email,
    phone: lead.phone || '',
    zip: lead.zip || '',
    timeline: lead.timeline || '',
    financing: lead.financing || '',
    message: [lead.message, lead.details].filter(Boolean).join('\n\n'),
    considering: lead.considering || '',
    selected_vehicle: lead.selectedVehicle || '',
    selected_price: lead.selectedPrice || 0,
    shortlist: lead.shortlist || [],
    submitted_at: lead.submittedAt || new Date().toISOString()
  };

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    const { data, error } = await supabase.from('leads').insert(record).select();
    if (error) throw error;
    return res.status(200).json({ ok: true, stored: true, id: data?.[0]?.id });
  } catch (e) {
    console.error('Supabase lead insert failed');
    return res.status(500).json({ ok: false, error: 'Could not store lead' });
  }
}
