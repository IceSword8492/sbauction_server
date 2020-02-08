module.exports = router = require("express").Router();

const rp = require("request-promise");
const child_process = require("child_process");
const dbman = require("../../database/dbman");
const fs = require("fs");

router.get("/", (req, res) => {
    res.send({
        version: "v1",
        deprecated: false,
    });
});

router.get("/auth/:user", async (req, res) => {
    let mc_res = await rp.get("https://api.mojang.com/users/profiles/minecraft/" + req.params.user);
    res.send(mc_res.length ? `success {{${JSON.parse(mc_res).id}}} <<${JSON.parse(mc_res).name}>>` : "failed");
});

router.get("/auctions/", async (req, res) => {
    let response = await rp.get(`https://api.hypixel.net/skyblock/auctions?key=${process.env.API_KEY}&page=` + 0).catch(console.error);
    res.send(response);
});

router.get("/auctions/:page", async (req, res) => {
    let page = req.params.page;
    let response = await rp.get(`https://api.hypixel.net/skyblock/auctions?key=${process.env.API_KEY}&page=` + page).catch(console.error);
    res.send(response);
});

router.get("/deploy", async (req, res) => {
    console.log("deploying");
    let child_git = child_process.execFile("git", ["pull", "origin", "master"], (err, stdout, stderr) => {
        if (err) {
            console.error(err);
            res.send("failed (git)");
            return;
        }
        console.log(stdout || stderr);
        let child_refresh = child_process.execFile("refresh", [], (err, stdout, stderr) => {
            if (err) {
                console.error(err);
            }
            console.log(stdout || stderr);
            res.send("done" + (err ? " with 1 warning" : ""));
        });
    });
});

router.post("/deploy", async (req, res) => {
    console.log("deploying");
    let child_git = child_process.execFile("git", ["pull", "origin", "master"], (err, stdout, stderr) => {
        if (err) {
            console.error(err);
            res.send("failed");
            return;
        }
        console.log(stdout || stderr);
        let child_refresh = child_process.execFile("refresh", [], (err, stdout, stderr) => {
            if (err) {
                console.error(err);
                res.send("failed");
                return;
            }
            console.log(stdout || stderr);
            console.log("done");
            res.send("done");
        });
    });
});

router.get("/search", async (req, res) => {
    let page = parseInt(req.query.page || 0);
    let query = req.query.query;
    if (!query || query.length === 0) {
        query = "sort:price.desc state:open";
    }
    let result = await dbman.AuctionsManager.search(query, page);
    res.status(200).send(result);
});

router.get("/search/total", async (req, res) => {
    let query = req.query.query;
    if (!query || query.length === 0) {
        query = "sort:price.desc state:open";
    }
    let result = await dbman.AuctionsManager.search_total_count(query);
    res.status(200).send({totalPages: Math.ceil(result[0].count / 48), totalRecords: result[0].count});
});

router.get("/auction/:uuid", async (req, res) => {
    res.status(200).send(await dbman.AuctionsManager.auction_by_uuid(req.params.uuid));
});

router.post("/api/:command", async (req, res) => {
    let command = req.params.command;
    if (command === 'set') {
        let env = fs.readFileSync(__dirname + "/../../.env", "utf8");
        env = env.replace(/PREV_API_KEY.*\n/g, "");
        env = env.replace(/API_KEY=([0-9a-zA-Z-]+)/g, "PREV_API_KEY=$1\nAPI_KEY=" + req.query.key);
        fs.writeFileSync(__dirname + "/../../.env", env);
        process.env.API_KEY = req.query.key;
        res.send("OK");
        return;
    }
    res.status(400).send("ERROR");
});

router.get('/statistics/', async (req, res) => {
    /**
     * /statistics?period=<period>
     *      <period>: millis
     *          get statistics from now - period to now
     */
    const period = parseInt(req.query.period) || null;
    const statistics = await dbman.StatisticsManager.getStatistics(period, true);
    res.send(statistics);
});

router.get('/statistics/:item_name', async (req, res) => {
    const itemName = req.params.item_name;
    const period = parseInt(req.query.period) || null;
    const statistics = await dbman.StatisticsManager.getStatistics(period, true, itemName);
    res.send(statistics);
});
