// Vercel Serverless Function: Live Steam Profile XML Auto-Sync Proxy
const https = require('https');

const STEAM_XML_URL = 'https://steamcommunity.com/id/soradesu23/?xml=1';

function extractTag(xml, tag) {
    const cdataRegex = new RegExp(`<${tag}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, 'i');
    const cdataMatch = xml.match(cdataRegex);
    if (cdataMatch) return cdataMatch[1].trim();

    const plainRegex = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i');
    const plainMatch = xml.match(plainRegex);
    if (plainMatch) return plainMatch[1].trim();

    return '';
}

function fetchSteamXml() {
    return new Promise((resolve) => {
        const u = new URL(STEAM_XML_URL);
        const req = https.request({
            hostname: u.hostname,
            path: u.pathname + u.search,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Soradesu-Biolink/1.0',
                'Accept': 'application/xml,text/xml,*/*'
            }
        }, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => resolve(data));
        });
        req.on('error', () => resolve(''));
        req.end();
    });
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');

    try {
        const xml = await fetchSteamXml();
        if (!xml || !xml.includes('<profile>')) {
            return res.status(200).json({
                steamID64: '76561199786598076',
                steamID: 'Soradesu23',
                onlineState: 'offline',
                stateMessage: 'Offline',
                avatarFull: 'https://avatars.akamai.steamstatic.com/1d538bbc61ce6796bc1e24f4e852a9d05f597c5d_full.jpg',
                avatarMedium: 'https://avatars.akamai.steamstatic.com/1d538bbc61ce6796bc1e24f4e852a9d05f597c5d_medium.jpg',
                memberSince: 'September 27, 2024',
                vacBanned: 0,
                customURL: 'Soradesu23',
                fallback: true,
                success: true
            });
        }

        const steamID64 = extractTag(xml, 'steamID64') || '76561199786598076';
        const steamID = extractTag(xml, 'steamID') || 'Soradesu23';
        const onlineState = extractTag(xml, 'onlineState') || 'offline';
        const stateMessage = extractTag(xml, 'stateMessage').replace(/<[^>]+>/g, ' ').trim() || 'Offline';
        const avatarFull = extractTag(xml, 'avatarFull') || 'https://avatars.akamai.steamstatic.com/1d538bbc61ce6796bc1e24f4e852a9d05f597c5d_full.jpg';
        const avatarMedium = extractTag(xml, 'avatarMedium') || avatarFull;
        const memberSince = extractTag(xml, 'memberSince') || 'September 27, 2024';
        const vacBanned = parseInt(extractTag(xml, 'vacBanned') || '0', 10) || 0;
        const customURL = extractTag(xml, 'customURL') || 'Soradesu23';

        return res.status(200).json({
            steamID64,
            steamID,
            onlineState,
            stateMessage,
            avatarFull,
            avatarMedium,
            memberSince,
            vacBanned,
            customURL,
            success: true
        });
    } catch (err) {
        return res.status(200).json({
            steamID64: '76561199786598076',
            steamID: 'Soradesu23',
            onlineState: 'offline',
            stateMessage: 'Offline',
            avatarFull: 'https://avatars.akamai.steamstatic.com/1d538bbc61ce6796bc1e24f4e852a9d05f597c5d_full.jpg',
            memberSince: 'September 27, 2024',
            vacBanned: 0,
            customURL: 'Soradesu23',
            fallback: true,
            success: true
        });
    }
};
