// Vercel serverless function: /api/inquiry
import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const RESEND_KEY = process.env.RESEND_API_KEY;
  const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'deals@dealwheel.ai';

  const { name, email, phone, message, vehicle, timeline, financing } = req.body || {};

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email required' });
  }

  const esc = (s) => String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  if (!RESEND_KEY) {
    console.log('Inquiry received (Resend not configured)');
    return res.status(200).json({ success: true, mock: true });
  }

  try {
    await axios.post(
      'https://api.resend.com/emails',
      {
        from: FROM_EMAIL,
        to: [process.env.LEAD_EMAIL || 'leads@yourdomain.com'],
        subject: `DealWheel Inquiry: ${esc(vehicle?.year || '')} ${esc(vehicle?.make || '')} ${esc(vehicle?.model || '')}`,
        html: `
          <h2>New Vehicle Inquiry</h2>
          <p><strong>From:</strong> ${esc(name)} (${esc(email)}${phone ? ', ' + esc(phone) : ''})</p>
          <p><strong>Vehicle:</strong> ${esc(vehicle?.year)} ${esc(vehicle?.make)} ${esc(vehicle?.model)} ${esc(vehicle?.trim || '')}</p>
          <p><strong>Timeline:</strong> ${esc(timeline || 'Not specified')}</p>
          <p><strong>Financing:</strong> ${esc(financing || 'Not specified')}</p>
          <p><strong>Message:</strong><br>${esc(message || '')}</p>
        `,
      },
      {
        headers: { Authorization: `Bearer ${RESEND_KEY}` },
      }
    );

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Resend error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to send inquiry' });
  }
}
