// Netlify Serverless Function: In-Memory Visitor Counter
// Automatically resets whenever Netlify restarts, redeploys, or via ?reset=true
let memoryVisitorCount = 0;

exports.handler = async function(event, context) {
    const params = event.queryStringParameters || {};
    if (params.reset === '1' || params.reset === 'true') {
        memoryVisitorCount = 0;
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'no-cache, no-store, must-revalidate'
            },
            body: JSON.stringify({ views: memoryVisitorCount, reset: true, success: true })
        };
    }

    memoryVisitorCount += 1;
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        body: JSON.stringify({ views: memoryVisitorCount, success: true })
    };
};
