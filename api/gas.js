const GAS_URL = process.env.GAS_URL || process.env.VITE_GAS_URL || 'https://script.google.com/macros/s/AKfycby8kzfa8sEQIcXcf1ZiadhdIO4vB6OS56Ft0HHq34zob0s09sr4DeW42iXnTDtdwqo/exec';

export const config = { api: { bodyParser: { sizeLimit: '20mb' } } };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'POST') {
      // GAS POST → 302 리다이렉트 → 최종 URL을 GET으로 요청해야 응답 받음
      const gasRes = await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
        redirect: 'manual',
      });
      const finalUrl = gasRes.headers.get('location');
      if (!finalUrl) {
        const text = await gasRes.text();
        try { res.status(200).json(JSON.parse(text)); }
        catch { res.status(200).json({ status: 'error', message: text }); }
        return;
      }
      const finalRes = await fetch(finalUrl);
      const text = await finalRes.text();
      try {
        res.status(200).json(JSON.parse(text));
      } catch {
        res.status(200).json({ status: 'error', message: text });
      }
    } else {
      // 일반 GET 요청
      const params = new URLSearchParams(req.query);
      const url = `${GAS_URL}?${params}`;
      const gasRes = await fetch(url, { redirect: 'manual' });
      const finalUrl = gasRes.headers.get('location') || url;
      const finalRes = await fetch(finalUrl);
      const data = await finalRes.json();
      res.status(200).json(data);
    }
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
}
