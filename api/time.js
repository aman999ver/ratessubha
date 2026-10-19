// Vercel Serverless Function to provide accurate server timestamp
// Compatible with Vercel Node.js runtime (CommonJS)

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const now = new Date();
  // Return millisecond epoch timestamp and ISO string
  return res.status(200).json({
    timestamp: now.getTime(),
    iso: now.toISOString(),
    timezone: 'Asia/Kathmandu',
    nepalOffsetMinutes: 345
  });
};
