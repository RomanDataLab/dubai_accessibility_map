// Vercel serverless function to proxy OpenRouteService API calls
// This avoids CORS issues and keeps API keys secure

export default async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Get API key from environment variable
    const apiKey = process.env.VITE_ORS_API_KEY || process.env.ORS_API_KEY;
    
    if (!apiKey) {
        console.error('ORS API key not found in environment variables');
        return res.status(500).json({ error: 'API key not configured' });
    }

    try {
        // Forward the request to OpenRouteService
        const orsResponse = await fetch('https://api.openrouteservice.org/v2/isochrones/foot-walking', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': apiKey,
                'Accept': 'application/json, application/geo+json'
            },
            body: JSON.stringify(req.body)
        });

        // Get response data
        const data = await orsResponse.text();
        
        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        // Forward status and data
        if (!orsResponse.ok) {
            console.error('ORS API Error:', {
                status: orsResponse.status,
                statusText: orsResponse.statusText,
                body: data
            });
            return res.status(orsResponse.status).json({
                error: 'OpenRouteService API error',
                status: orsResponse.status,
                statusText: orsResponse.statusText,
                details: data
            });
        }

        // Parse and return JSON
        try {
            const jsonData = JSON.parse(data);
            return res.status(200).json(jsonData);
        } catch (e) {
            return res.status(200).json({ raw: data });
        }

    } catch (error) {
        console.error('Proxy error:', error);
        res.setHeader('Access-Control-Allow-Origin', '*');
        return res.status(500).json({
            error: 'Proxy error',
            message: error.message
        });
    }
}

// Handle OPTIONS request for CORS preflight
export async function OPTIONS(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
}

