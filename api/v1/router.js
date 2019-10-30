module.exports = router = require("express").Router();

const rp = require("request-promise");
const child_process = require("child_process");
const dbman = require("../../database/dbman");


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
    res.status(200).send({totalPages: Math.ceil(result.count / 48), totalRecords: result.count});
});
