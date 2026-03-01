const GAS_URL = process.env.GAS_URL || process.env.VITE_GAS_URL || 'https://script.google.com/macros/s/AKfycby8kzfa8sEQIcXcf1ZiadhdIO4vB6OS56Ft0HHq34zob0s09sr4DeW42iXnTDtdwqo/exec';

export const config = { api: { bodyParser: { sizeLimit: '20mb' } } };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

      // 이미지 업로드: Vercel 자체 저장소(메모리 캐시)에 저장 후 키 반환
      // GAS GET 파라미터로 짧은 키만 전달, 학생이 볼 때 Vercel에서 이미지 제공
      if (body.action === 'uploadRefMaterial') {
        if (!body.fileData || !body.mimeType) {
          return res.status(200).json({ status: 'error', message: 'Missing file data' });
        }
        // GAS의 uploadRefMaterial에 청크 저장 방식으로 전달
        // 청크를 여러 개의 GAS GET 호출로 나눠 저장
        const chunkSize = 1500; // URL 안전 크기
        const data = body.fileData;
        const chunks = [];
        for (let i = 0; i < data.length; i += chunkSize) {
          chunks.push(data.substring(i, i + chunkSize));
        }
        // 첫 청크로 imgId 생성
        const initParams = new URLSearchParams({
          action: 'uploadRefMaterial',
          mimeType: body.mimeType,
          fileName: body.fileName || 'image.jpg',
          totalChunks: chunks.length,
          chunkIndex: 0,
          fileData: chunks[0],
        });
        const initRes = await fetch(`${GAS_URL}?${initParams}`, { redirect: 'follow' });
        const initData = await initRes.json();
        if (initData.status !== 'success') {
          return res.status(200).json(initData);
        }
        const imgId = initData.imgId;
        // 나머지 청크 순차 전송
        for (let i = 1; i < chunks.length; i++) {
          const chunkParams = new URLSearchParams({
            action: 'appendRefChunk',
            imgId,
            chunkIndex: i,
            fileData: chunks[i],
          });
          await fetch(`${GAS_URL}?${chunkParams}`, { redirect: 'follow' });
        }
        return res.status(200).json({ status: 'success', url: `refimg://${imgId}` });
      }

      // submitAssignment: query string으로 GAS doGet에 전달
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(body)) {
        params.set(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
      }
      const url = `${GAS_URL}?${params}`;
      const gasRes = await fetch(url, { redirect: 'manual' });
      const finalUrl = gasRes.headers.get('location') || url;
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
