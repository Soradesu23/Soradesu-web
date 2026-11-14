const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
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

// In-Memory Visitor Counter (Resets on server restart)
let memoryVisitorCount = 0;

const server = http.createServer((req, res) => {
    let reqUrl = req.url.split('?')[0];

    // Live In-Memory Visitor Counter API
    if (reqUrl === '/api/visitor-count') {
        const urlParams = new URL(req.url, `http://${req.headers.host || 'localhost'}`).searchParams;
        if (urlParams.get('reset') === '1' || urlParams.get('reset') === 'true') {
            memoryVisitorCount = 0;
            res.writeHead(200, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'no-cache, no-store, must-revalidate'
            });
            res.end(JSON.stringify({ views: memoryVisitorCount, reset: true, success: true }));
            return;
        }

        memoryVisitorCount += 1;
        res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
        });
        res.end(JSON.stringify({ views: memoryVisitorCount, success: true }));
        return;
    }

    // Live Roblox Avatar Auto-Sync Proxy
    if (reqUrl === '/api/roblox-avatar') {
        const robloxApiUrl = 'https://thumbnails.roblox.com/v1/users/avatar?userIds=2507529929&size=720x720&format=Png&isCircular=false';
        https.get(robloxApiUrl, (apiRes) => {
            let data = '';
            apiRes.on('data', chunk => data += chunk);
            apiRes.on('end', () => {
                res.writeHead(200, {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Cache-Control': 'no-cache'
                });
                res.end(data);
            });
        }).on('error', (err) => {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
        });
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
                const loc = [geo.city, geo.region, geo.country].filter(Boolean).join(', ') || 'Indonesia, Jakarta Barat';
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

server.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
});
