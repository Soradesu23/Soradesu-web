// Netlify Serverless Function: Live Steam Profile XML Auto-Sync Proxy
const steamHandler = require('../../api/steam-profile.js');

exports.handler = async function() {
    let statusCode = 200;
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=60'
    };
    let responseBody = {};

    const mockRes = {
        setHeader: (k, v) => { headers[k] = v; },
        status: (code) => {
            statusCode = code;
            return {
                json: (obj) => { responseBody = obj; }
            };
        }
    };

    await steamHandler({}, mockRes);
    return {
        statusCode,
        headers,
        body: JSON.stringify(responseBody)
    };
};
