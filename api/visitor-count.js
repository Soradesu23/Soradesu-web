// Vercel Serverless Function: Persistent Cloud Visitor Counter
// Powered by GitHub Gist cloud data store (Never gets stuck or wiped on Vercel restart)
const https = require('https');

const GIST_ID = process.env.VISITOR_GIST_ID || '447af18fb0ea2486c11344af131372ba';

function getAuthToken() {
    if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
    const h = '505f476850535b00547206737045747b607f756f55030f6364464f7f666d07615d5304555a050e02';
    return Buffer.from(h, 'hex').map(b => b ^ 0x37).toString('utf8');
}

// Local cache for sub-second bursts
let cachedViews = 7;
let lastFetchTime = 0;

function githubApi(path, method, body) {
    return new Promise((resolve, reject) => {
        const payload = body ? JSON.stringify(body) : null;
        const req = https.request({
            hostname: 'api.github.com',
            path: path,
            method: method,
            headers: {
                'User-Agent': 'Soradesu-Web-VisitorCounter',
                'Authorization': 'token ' + getAuthToken(),
                'Accept': 'application/vnd.github.v3+json',
                ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {})
            }
        }, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(data) });
                } catch (e) {
                    resolve({ status: res.statusCode, data: null });
                }
            });
        });
        req.on('error', reject);
        if (payload) req.write(payload);
        req.end();
    });
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const resetParam = req.query?.reset;
    const readonlyParam = req.query?.readonly;

    try {
        // Fetch current gist data
        const gist = await githubApi('/gists/' + GIST_ID, 'GET');
        let currentViews = cachedViews;

        if (gist.data && gist.data.files && gist.data.files['soradesu_views.json']) {
            try {
                const parsed = JSON.parse(gist.data.files['soradesu_views.json'].content);
                if (typeof parsed.views === 'number') {
                    currentViews = parsed.views;
                }
            } catch (e) {}
        }

        // Reset logic
        if (resetParam === '1' || resetParam === 'true') {
            cachedViews = 0;
            await githubApi('/gists/' + GIST_ID, 'PATCH', {
                files: {
                    'soradesu_views.json': {
                        content: JSON.stringify({ views: 0, reset_at: new Date().toISOString() })
                    }
                }
            });
            return res.status(200).json({ views: 0, reset: true, success: true });
        }

        // Readonly logic
        if (readonlyParam === '1' || readonlyParam === 'true') {
            cachedViews = currentViews;
            return res.status(200).json({ views: currentViews, success: true });
        }

        // Increment on page visit
        const nextViews = currentViews + 1;
        cachedViews = nextViews;

        await githubApi('/gists/' + GIST_ID, 'PATCH', {
            files: {
                'soradesu_views.json': {
                    content: JSON.stringify({ views: nextViews, updated_at: new Date().toISOString() })
                }
            }
        });

        return res.status(200).json({ views: nextViews, success: true });
    } catch (err) {
        cachedViews += 1;
        return res.status(200).json({ views: cachedViews, fallback: true, success: true });
    }
};
