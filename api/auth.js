export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action, email, password, token } = req.body;
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

  try {
    let endpoint, body;

    if (action === 'login') {
      endpoint = `${SUPABASE_URL}/auth/v1/token?grant_type=password`;
      body = { email, password };
    } else if (action === 'register') {
      endpoint = `${SUPABASE_URL}/auth/v1/signup`;
      body = { email, password };
    } else if (action === 'reset') {
      endpoint = `${SUPABASE_URL}/auth/v1/recover`;
      body = { email, redirect_to: 'https://shopwriter.ru/reset-password.html' };
    } else if (action === 'profile') {
      // Получить профиль пользователя
      const profileRes = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?id=eq.${req.body.userId}&select=*`,
        {
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      const profiles = await profileRes.json();
      return res.status(200).json(profiles[0] || { generations_used: 0, plan: 'free' });
    } else if (action === 'update_profile') {
      const updateRes = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?id=eq.${req.body.userId}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(req.body.updates)
        }
      );
      const updated = await updateRes.json();
      return res.status(200).json(updated[0] || {});
    } else if (action === 'upsert_device') {
      const deviceRes = await fetch(
        `${SUPABASE_URL}/rest/v1/device_limits`,
        {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify(req.body.deviceData)
        }
      );
      return res.status(200).json({ ok: true });
    } else if (action === 'update_password') {
      const updateRes = await fetch(
        `${SUPABASE_URL}/auth/v1/user`,
        {
          method: 'PUT',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ password: req.body.newPassword })
        }
      );
      const updated = await updateRes.json();
      return res.status(updateRes.status).json(updated);
    } else {
      return res.status(400).json({ error: 'Unknown action' });
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    return res.status(response.status).json(data);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
