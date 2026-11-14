// Vercel Serverless Function: In-Memory Visitor Counter
// Automatically resets whenever Vercel restarts, redeploys, or via ?reset=true
let memoryVisitorCount = 0;

module.exports = (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    const resetParam = req.query?.reset;
    if (resetParam === '1' || resetParam === 'true') {
        memoryVisitorCount = 0;
        return res.status(200).json({ views: memoryVisitorCount, reset: true, success: true });
    }

    memoryVisitorCount += 1;
    return res.status(200).json({ views: memoryVisitorCount, success: true });
};
