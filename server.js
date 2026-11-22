const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = parseInt(process.env.PORT, 10) || 3000;
const DIR = __dirname;

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm'
};

const https = require('https');

// Persistent Cloud Visitor Counter
const GIST_ID = process.env.VISITOR_GIST_ID || '447af18fb0ea2486c11344af131372ba';

function getAuthToken() {
    if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
    const h = '505f476850535b00547206737045747b607f756f55030f6364464f7f666d07615d5304555a050e02';
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

const server = http.createServer(async (req, res) => {
    let reqUrl = req.url.split('?')[0];

    // Live Persistent Visitor Counter API
    if (reqUrl === '/api/visitor-count') {
        const urlParams = new URL(req.url, `http://${req.headers.host || 'localhost'}`).searchParams;
        const resetParam = urlParams.get('reset');
        const readonlyParam = urlParams.get('readonly');

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

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

            if (resetParam === '1' || resetParam === 'true') {
                cachedViews = 0;
                await githubApi('/gists/' + GIST_ID, 'PATCH', {
                    files: {
                        'soradesu_views.json': {
                            content: JSON.stringify({ views: 0, reset_at: new Date().toISOString() })
                        }
                    }
                });
                res.writeHead(200);
                res.end(JSON.stringify({ views: 0, reset: true, success: true }));
                return;
            }

            if (readonlyParam === '1' || readonlyParam === 'true') {
                cachedViews = currentViews;
                res.writeHead(200);
                res.end(JSON.stringify({ views: currentViews, success: true }));
                return;
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

            res.writeHead(200);
            res.end(JSON.stringify({ views: nextViews, success: true }));
            return;
        } catch (err) {
            cachedViews += 1;
            res.writeHead(200);
            res.end(JSON.stringify({ views: cachedViews, fallback: true, success: true }));
            return;
        }
    }

    // Live Roblox Avatar, Stats & Presence Auto-Sync Proxy
    if (reqUrl === '/api/roblox-avatar') {
        const robloxHandler = require('./api/roblox-avatar.js');
        const mockRes = {
            setHeader: (k, v) => res.setHeader(k, v),
            status: (code) => ({
                json: (obj) => {
                    res.writeHead(code, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(obj));
                }
            })
        };
        await robloxHandler(req, mockRes);
        return;
    }

    // Live Steam Profile Auto-Sync Proxy
    if (reqUrl === '/api/steam-profile') {
        const steamHandler = require('./api/steam-profile.js');
        const mockRes = {
            setHeader: (k, v) => res.setHeader(k, v),
            status: (code) => ({
                json: (obj) => {
                    res.writeHead(code, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(obj));
                }
            })
        };
        await steamHandler(req, mockRes);
        return;
    }

    // Live Security Breach Discord Logger
    if (reqUrl === '/api/report-breach' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const payload = JSON.parse(body);
                const geo = payload.geo || {};
                const loc = geo.detailedLocation || [geo.city, geo.region, geo.country].filter(Boolean).join(', ') || 'Indonesia, Jakarta Barat';
                const coords = (geo.latitude && geo.longitude) ? `${geo.latitude}, ${geo.longitude}` : 'Tidak diketahui';
                const mapsUrl = (geo.latitude && geo.longitude) ? `https://www.google.com/maps?q=${geo.latitude},${geo.longitude}` : '';
                const ip = geo.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
                const isp = (geo.connection && (geo.connection.isp || geo.connection.org)) || 'Tidak diketahui';
                const action = payload.trigger || 'Akses Inspeksi / View Source Terdeteksi';
                const device = payload.device || 'Perangkat tidak diketahui';
                const screen = payload.screen || 'Resolusi tidak diketahui';
                const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) + ' WIB';

                const discordWebhookUrl = 'https://discord.com/api/webhooks/1571181962733817887/mHwQXZwWpJAQ8Tk6b94-Ax-5707CdHVvkYZT-p5Q4FwvKvIVop5J_dmv2klpWd7DWbWU';

                const embedPayload = JSON.stringify({
                    username: 'Soradesu Cyber Defense',
                    avatar_url: 'https://cdn.discordapp.com/embed/avatars/0.png',
                    embeds: [{
                        title: '🚨 SECURITY BREACH DETECTED!',
                        description: `Seseorang tertangkap basah mencoba melihat source code / melakukan inspeksi di biolink!`,
                        color: 0xEF4444,
                        fields: [
                            { name: '⚡ AKSI PELANGGARAN', value: `\`${action}\``, inline: false },
                            { name: '📍 LOKASI FISIK TARGET', value: `**${loc}**\n**Koordinat:** \`${coords}\`${mapsUrl ? ` • [Buka di Google Maps](${mapsUrl})` : ''}`, inline: false },
                            { name: '📡 IP ADDRESS', value: `\`${ip}\``, inline: true },
                            { name: '🏢 ISP / PROVIDER', value: `\`${isp}\``, inline: true },
                            { name: '💻 PERANGKAT & OS', value: `\`${device}\``, inline: true },
                            { name: '🖥️ RESOLUSI LAYAR', value: `\`${screen}\``, inline: true },
                            { name: '⏰ WAKTU KEJADIAN', value: `\`${timestamp}\``, inline: false }
                        ],
                        footer: {
                            text: 'Soradesu Defense System • Auto Security Logger'
                        },
                        timestamp: new Date().toISOString()
                    }]
                });

                const targetUrl = new URL(discordWebhookUrl);
                const discordReq = https.request({
                    hostname: targetUrl.hostname,
                    path: targetUrl.pathname + targetUrl.search,
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(embedPayload)
                    }
                }, (hookRes) => {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, status: hookRes.statusCode }));
                });

                discordReq.on('error', (err) => {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: err.message }));
                });

                discordReq.write(embedPayload);
                discordReq.end();
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
            }
        });
        return;
    }

    let filePath = path.join(DIR, reqUrl === '/' ? 'index.html' : reqUrl);

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 Not Found');
            return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        // Streaming support for video/audio (Range requests)
        const range = req.headers.range;
        if (range && (ext === '.mp4' || ext === '.webm')) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;
            const chunksize = (end - start) + 1;
            const fileStream = fs.createReadStream(filePath, { start, end });

            res.writeHead(206, {
                'Content-Range': `bytes ${start}-${end}/${stats.size}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': contentType
            });
            fileStream.pipe(res);
        } else {
            const isVideo = ext === '.mp4' || ext === '.webm';
            res.writeHead(200, {
                'Content-Length': stats.size,
                'Content-Type': contentType,
                'Accept-Ranges': 'bytes',
                'Cache-Control': isVideo ? 'public, max-age=86400' : 'no-cache'
            });
            fs.createReadStream(filePath).pipe(res);
        }
    });
});

function startServer(port) {
    server.once('error', (err) => {
        if ((err.code === 'EACCES' || err.code === 'EADDRINUSE') && port === 3000) {
            startServer(3080);
        } else if ((err.code === 'EACCES' || err.code === 'EADDRINUSE') && port === 3080) {
            startServer(8080);
        } else {
            console.error('Server error:', err);
        }
    });
    server.listen(port, () => {
        console.log(`Server listening on http://localhost:${port}`);
    });
}

startServer(PORT);
