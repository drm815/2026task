const GAS_URL = process.env.GAS_URL || process.env.VITE_GAS_URL || 'https://script.google.com/macros/s/AKfycby8kzfa8sEQIcXcf1ZiadhdIO4vB6OS56Ft0HHq34zob0s09sr4DeW42iXnTDtdwqo/exec';

export const config = { api: { bodyParser: { sizeLimit: '20mb' } } };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'POST') {
      // GAS는 POST도 302 리다이렉트 → manual로 받아서 최종 URL에 다시 POST
      const bodyStr = JSON.stringify(req.body);
      const gasRes = await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: bodyStr,
        redirect: 'manual',
      });
      const finalUrl = gasRes.headers.get('location') || GAS_URL;
      const finalRes = await fetch(finalUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: bodyStr,
      });
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
