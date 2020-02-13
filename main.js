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
    let auctions = JSON.parse(await rp.get(`https://api.hypixel.net/skyblock/auctions?key=${process.env.API_KEY}`).catch(console.error));

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
        let a = JSON.parse(await rp.get(`https://api.hypixel.net/skyblock/auctions?key=${process.env.API_KEY}&page=${page}`).catch(console.error));
        if (!a.success) {
            break;
        }
        console.log(`loaded page ${page}`);
        auctions = [...auctions, ...(a.auctions)];
    }
    console.log('start writing');
    await dbman.AuctionsManager.begin();
    await dbman.AuctionsManager.prepare_create();
    for (let auction of auctions) {
        await dbman.AuctionsManager.create_stmt(auction);
    }
    await dbman.AuctionsManager.commit();
    await dbman.BidsManager.begin();
    await dbman.BidsManager.prepare_create();
    for (let auction of auctions) {
        for (let bid of auction.bids) {
            await dbman.BidsManager.create_stmt(bid);
        }
    }
    await dbman.BidsManager.commit();
    console.log('done');
}

async function updateStatistics (date, timestamp) {
    console.log('start updating statistics');
    let statistics = await dbman.StatisticsManager.getStatistics();
    statistics = statistics.map(statistic => {
        statistic.date = date;
        statistic.timestamp = timestamp;
        return statistic;
    });
    await dbman.StatisticsManager.setStatistics(statistics);
    console.log('updated (updated -> statistics / deleted -> auctions, bids)');
}

(async () => {
    for (let man of Object.values(dbman)) {
        await man.init();
    }
    await update();
})();

setInterval(async () => {
    if (++counter > 14) { // every 30mins
        counter = 0;
        await updateStatistics(moment().tz('Asia/Tokyo').format(), new Date().getTime());
    }
    await update();
}, 120000); // every 2mins
