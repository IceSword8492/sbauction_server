const express = require('express');
const rp = require('request-promise');
const moment = require('moment-timezone');
const dbman = require('./database/dbman');

const client = express();

require('dotenv').config({path: __dirname + '/.env'});

const listener = client.listen(parseInt(process.env.PORT) || 8080, () => console.log(`listening on port ${listener.address().port}`));

let lastUpdated = 0;
let counter = 0;

client.use('/api/v1', require('./api/v1/router'));

async function update () {
    console.log('updating');
    let auctions = null;
    try {
        auctions = JSON.parse(await rp.get(`https://api.hypixel.net/skyblock/auctions?key=${process.env.API_KEY}`).catch(console.error));
    } catch (e) {
        const err = `${e}`;
        if (/Invalid API key/.test(err)) {
            console.error('[ERROR] invalid api key');
        } else if (/Unexpected token u/.test(err)) {
            console.error('[ERROR] undefined');
        } else {
            console.error(e);
        }
        return false;
    }

    if (auctions === null) {
        console.error('auctions is null');
        return false;
    }

    let totalPages = auctions.totalPages || 1;
    if (lastUpdated === (auctions.lastUpdated || 0)) {
        return;
    }
    lastUpdated = auctions.lastUpdated || 0;
    auctions = auctions.auctions;

    console.log(`totalPages:\t${totalPages}`);
    console.log(`lastUpdated:\t${new Date(lastUpdated)} (Timestamp: ${lastUpdated})`);

    console.log('loaded page 0');
    for (let page = 1; ; page++) {
        try {
            let a = JSON.parse(await rp.get(`https://api.hypixel.net/skyblock/auctions?key=${process.env.API_KEY}&page=${page}`).catch(e => {
                if (/Page not found/.test(`${e}`)) {
                    console.error('Page not found');
                } else {
                    console.error(e);
                }
            }));
            if (!a.success) {
                break;
            }
            console.log(`loaded page ${page}`);
            auctions = [...auctions, ...(a.auctions)];
        } catch (e) {
            console.error(`load error on page ${page}\n`);
            break;
        }
    }
    console.log(auctions);
    console.log('done');
}

(async () => {
    await update();
})();

setInterval(async () => await update(), 120000); // every 2mins
