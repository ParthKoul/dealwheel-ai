// Vercel serverless function: /api/listings
import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const AUTODEV_KEY = process.env.AUTODEV_API_KEY;

  if (!AUTODEV_KEY) {
    return res.status(200).json({
      data: [],
      mock: true,
      message: 'AUTODEV_API_KEY not set'
    });
  }

  try {
    const response = await axios.get('https://api.auto.dev/listings', {
      params: {
        ...req.query,
        limit: 40
      },
      headers: {
        Authorization: `Bearer ${AUTODEV_KEY}`,
        'Accept': 'application/json'
      },
      timeout: 10000
    });

    const body = response.data || {};
    const data = body.data || body.listings || body.records || body;
    return res.status(200).json({ data: Array.isArray(data) ? data : [] });
  } catch (error) {
    console.error('Auto.dev error:', error.response?.status, error.response?.data || error.message);
    return res.status(500).json({
      error: 'Failed to fetch listings',
      fallback: true,
      detail: error.response?.data || error.message
    });
  }
}
