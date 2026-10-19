export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const response = await fetch('https://api.fenegosida.org/api/website/v1/Dashboard/today', {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }

    const data = await response.json();
    
    // Cache for 30s at edge, stale-while-revalidate for 60s
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
    res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching Fenegosida rates:', error);
    res.status(500).json({
      error: 'Failed to fetch latest gold/silver rates',
      details: error.message
    });
  }
}
