const fs = require('fs');
const https = require('https');
const { execSync } = require('child_process');

const USER_ID = '2507529929';
console.log(`[Roblox Auto-Sync] Mengambil avatar terbaru untuk User ID ${USER_ID}...`);

const apiUrl = `https://thumbnails.roblox.com/v1/users/avatar?userIds=${USER_ID}&size=720x720&format=Png&isCircular=false`;

https.get(apiUrl, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      if (!parsed.data || !parsed.data[0] || !parsed.data[0].imageUrl) {
        console.error('[Roblox Auto-Sync] Gagal mendapatkan URL avatar:', data);
        return;
      }
      const imgUrl = parsed.data[0].imageUrl;
      console.log('[Roblox Auto-Sync] URL Avatar ditemukan:', imgUrl);

      https.get(imgUrl, (imgRes) => {
        const fullPath = 'roblox_avatar_full.png';
        const fileStream = fs.createWriteStream(fullPath);
        imgRes.pipe(fileStream);

        fileStream.on('finish', () => {
          console.log('[Roblox Auto-Sync] roblox_avatar_full.png berhasil diperbarui!');

          // Memisahkan layer body dan aksesoris tanda tanya secara otomatis
          try {
            const raw = execSync(`ffmpeg -i ${fullPath} -f rawvideo -pix_fmt rgba -`, { maxBuffer: 10 * 1024 * 1024 });
            const w = 720, h = 720;
            for (let y = 0; y < 120; y++) {
              for (let x = 440; x < w; x++) {
                const idx = (y * w + x) * 4;
                raw[idx + 3] = 0;
              }
            }
            fs.writeFileSync('temp_body.rgba', raw);
            execSync(`ffmpeg -y -f rawvideo -pixel_format rgba -video_size 720x720 -i temp_body.rgba -update 1 roblox_avatar_body.png`);
            if (fs.existsSync('temp_body.rgba')) fs.unlinkSync('temp_body.rgba');
            console.log('[Roblox Auto-Sync] roblox_avatar_body.png berhasil diproses dengan layer 3D depth!');
            console.log('[Roblox Auto-Sync] Selesai! Avatar di web sudah auto-update.');
          } catch (ffmpegErr) {
            fs.copyFileSync(fullPath, 'roblox_avatar_body.png');
            console.log('[Roblox Auto-Sync] Avatar disalin langsung ke roblox_avatar_body.png');
          }
        });
      });
    } catch (e) {
      console.error('[Roblox Auto-Sync] Error parse data:', e.message);
    }
  });
}).on('error', err => {
  console.error('[Roblox Auto-Sync] Request error:', err.message);
});
