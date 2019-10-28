const express = require("express");
const client = express();
const rp = require("request-promise");
const dbman = require("./database/dbman");

require("dotenv").config();

const listener = client.listen(process.env.PORT || 8080, () => console.log(`listening on port ${listener.address().port}`));

let lastUpdated = 0;

client.use("/api/v1", require("./api/v1/router"));

Object.values(dbman).forEach(man => {
    man.init();
});

setTimeout(async function () {
    console.log("updating");
    let auctions = JSON.parse(await rp.get(`https://api.hypixel.net/skyblock/auctions?key=${process.env.API_KEY}`).catch(console.error));
    
    let totalPages = auctions.totalPages || 1;
    if (lastUpdated === (auctions.lastUpdated || 0)) {
        return;
    }
    lastUpdated = auctions.lastUpdated || 0;
    auctions = auctions.auctions;

    console.log(`totalPages:\t${totalPages}`);
    console.log(`lastUpdated:\t${lastUpdated}`);

    console.log("loaded page 0");
    for (let page = 1; ; page++) {
        let a = JSON.parse(await rp.get(`https://api.hypixel.net/skyblock/auctions?key=${process.env.API_KEY}&page=${page}`).catch(console.error));
        if (!a.success) {
            break;
        }
        console.log(`loaded page ${page}`);
        auctions = [...auctions, ...(a.auctions)];
    }
    console.log("start writing");
    auctions.forEach(async auction => {
        await dbman.AuctionsManager.create(auction);
        auction.bids.forEach(async bid => await dbman.BidsManager.create(bid));
        if (auction.claimed_bidders.length) {
            console.log(auction.claimed_bidders);
        }
    });
}, 1);