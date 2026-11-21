// Vercel Serverless Function: Live Roblox Profile, 3D Avatar, Stats & Presence Auto-Sync
const https = require('https');

const ROBLOX_USER_ID = '2507529929';

function fetchRobloxJson(url, method = 'GET', body = null) {
    return new Promise((resolve) => {
        const u = new URL(url);
        const req = https.request({
            hostname: u.hostname,
            path: u.pathname + u.search,
            method,
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Soradesu-Web-RobloxSync',
                ...(body ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } : {})
            }
        }, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    resolve(null);
                }
            });
        });
        req.on('error', () => resolve(null));
        if (body) req.write(body);
        req.end();
    });
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');

    try {
        const uid = ROBLOX_USER_ID;
        const [avatar, headshot, user, friends, followers, followings, presence] = await Promise.all([
            fetchRobloxJson(`https://thumbnails.roblox.com/v1/users/avatar?userIds=${uid}&size=720x720&format=Png&isCircular=false`),
            fetchRobloxJson(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${uid}&size=150x150&format=Png&isCircular=false`),
            fetchRobloxJson(`https://users.roblox.com/v1/users/${uid}`),
            fetchRobloxJson(`https://friends.roblox.com/v1/users/${uid}/friends/count`),
            fetchRobloxJson(`https://friends.roblox.com/v1/users/${uid}/followers/count`),
            fetchRobloxJson(`https://friends.roblox.com/v1/users/${uid}/followings/count`),
            fetchRobloxJson('https://presence.roblox.com/v1/presence/users', 'POST', JSON.stringify({ userIds: [Number(uid)] }))
        ]);

        const avatarData = (avatar && avatar.data) ? avatar.data : [];
        const headshotUrl = (headshot && headshot.data && headshot.data[0] && headshot.data[0].imageUrl) ? headshot.data[0].imageUrl : null;
        const userPresence = (presence && presence.userPresences && presence.userPresences[0]) ? presence.userPresences[0] : null;

        return res.status(200).json({
            data: avatarData,
            headshotUrl,
            profile: user ? {
                displayName: user.displayName || 'Awasjatuh',
                username: user.name || 'ilhammp12',
                description: user.description || ''
            } : null,
            stats: {
                friends: (friends && typeof friends.count === 'number') ? friends.count : 37,
                followers: (followers && typeof followers.count === 'number') ? followers.count : 2,
                followings: (followings && typeof followings.count === 'number') ? followings.count : 1
            },
            presence: userPresence ? {
                userPresenceType: userPresence.userPresenceType || 0,
                lastLocation: userPresence.lastLocation || ''
            } : null,
            success: true
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
