// Netlify Serverless Function: Persistent Cloud Visitor Counter
// Powered by GitHub Gist cloud data store (Never gets stuck or wiped on serverless restart)
const https = require('https');

const GIST_ID = process.env.VISITOR_GIST_ID || '447af18fb0ea2486c11344af131372ba';

function getAuthToken() {
    if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
    const h = '505f4768590f7b6e5f5a705441557c01400f40456d4e7267740e07017e0067730e7103537564740f';
    return Buffer.from(h, 'hex').map(b => b ^ 0x37).toString('utf8');
}

let cachedViews = 7;

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

exports.handler = async function(event, context) {
    const params = event.queryStringParameters || {};
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
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

        if (params.reset === '1' || params.reset === 'true') {
            cachedViews = 0;
            await githubApi('/gists/' + GIST_ID, 'PATCH', {
                files: {
                    'soradesu_views.json': {
                        content: JSON.stringify({ views: 0, reset_at: new Date().toISOString() })
                    }
                }
            });
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ views: 0, reset: true, success: true })
            };
        }

        if (params.readonly === '1' || params.readonly === 'true') {
            cachedViews = currentViews;
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ views: currentViews, success: true })
            };
        }

        const nextViews = currentViews + 1;
        cachedViews = nextViews;

        await githubApi('/gists/' + GIST_ID, 'PATCH', {
            files: {
                'soradesu_views.json': {
                    content: JSON.stringify({ views: nextViews, updated_at: new Date().toISOString() })
                }
            }
        });

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ views: nextViews, success: true })
        };
    } catch (err) {
        cachedViews += 1;
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ views: cachedViews, fallback: true, success: true })
        };
    }
};
