module.exports = router = require("express").Router();

const rp = require("request-promise");
const child_process = require("child_process");

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
    let page = req.query.page || 0;
    let query = req.query.query;
    if (!query || query.length === 0) {
        query = "sort:price.desc";
    }
    let regex = /(?<state>state:(?<state_stmt>[^ ]+))|(?<sort>sort:(?<sortby>[^ ]+))|(?<script>(?<mcid>(?:(?!::).)*)::(?<script_name>[^ ]+))|(?<seller>seller:(?<seller_stmt>[^ ]+))|(?<name>name:((?<name_regex>\/([^\\/]|\\.)*\/(?<name_regexext>[a-z]*))|(?<name_stmt>"([^\\"]|\\.)*"|[^ ]+)))|(?<lore>lore:((?<lore_regex>\/([^\\/]|\\.)*\/(?<lore_regexext>[a-z]*))|[^ ]+))|(?<tier>tier:(?<tier_stmt>[^ ]+))|(?<price>price:(?<price_stmt>[^ ]+))|(?<page>page:(?<page_num>[0-9]+))|(?<continue>\>)/g;
    let matched = null;
    let result = [];
    let insertFlag = false;
    let matchFlag = false;
    while (matched = regex.exec(query)) {
        if (matchFlag) {
            if (matched.groups.continue && insertFlag) {
                console.error("query error");
                res.send("[]");
                return; // error
            }
            if (matched.groups.continue && !insertFlag) {
                insertFlag = true;
            }
        }
        if (matched.groups.state) {
            result = (matchFlag ? result : all_auctions).filter(auction => {
                let now = new Date().getTime();
                switch (matched.groups.state_stmt) {
                case "ended":
                    return auction.end - now < 0;
                case "ending":
                    return 0 < auction.end - now && auction.end - now < 300000; // 5mins
                case "open":
                    return now - auction.end < 0;
                default:
                    return false;
                }
            });
            matchFlag = true;
            insertFlag = false;
            continue;
        }
        if (matched.groups.lore) {
            if (matchFlag) {
                if (matched.groups.lore_regex) {
                    if (matched.groups.lore_regex.match(/\/(?<value>([^\\/]|\\.)*)\/[a-z]?/)) {
                        result = result.filter(auction => auction.item_lore.match(new RegExp(matched.groups.lore_regex.match(/\/(?<value>([^\\/]|\\.)*)\/[a-z]*/).groups.value, matched.groups.lore_regexext)));
                    } else {
                        console.error("lore regex error continue");
                    } 
                }
            } else {
                if (matched.groups.lore_regex) {
                    if (matched.groups.lore_regex.match(/\/(?<value>([^\\/]|\\.)*)\/[a-z]?/)) {
                        result = all_auctions.filter(auction => auction.item_lore.match(new RegExp(matched.groups.lore_regex.match(/\/(?<value>([^\\/]|\\.)*)\/[a-z]*/).groups.value, matched.groups.lore_regexext)));
                    } else {
                        console.error("lore regex error");
                    }
                }
            }
            matchFlag = true;
            insertFlag = false;
            continue;
        }
        if (matched.groups.tier) {
            result = (matchFlag ? result : all_auctions).filter(auction => auction.tier.toLowerCase() === matched.groups.tier_stmt.toLowerCase());
            matchFlag = true;
            insertFlag = false;
            continue;
        }
        if (matched.groups.seller) {
            let seller = (await rp.get("/api/v1/auth/" + matched.groups.seller_stmt)).match(/{{(?<value>(?:(?!{{|}}).)+)}}/).groups.value;
            result = (matchFlag ? result : all_auctions).filter(auction => auction.auctioneer === seller);
            matchFlag = true;
            insertFlag = false;
            continue;
        }
        if (matched.groups.page) {
            page = parseInt("0" + matched.groups.page_num);
            matchFlag = true;
            insertFlag = false;
            continue;
        }
        if (matched.groups.price) {
            let m = matched.groups.price_stmt.match(/(?<low>[0-9]+)-(?<high>[0-9]+)/);
            let [price_low, price_high] = [m.groups.low, m.groups.high];
            result = (matchFlag ? result : all_auctions).filter(auction => {
                let price = auction.highest_bid_amount || auction.starting_bid;
                return price_low <= price && price <= price_high;
            });
            matchFlag = true;
            insertFlag = false;
            continue;
        }
        if (matched.groups.name) {
            if (matchFlag) {
                if (matched.groups.name_regex) {
                    if (matched.groups.name_regex.match(/\/(?<value>([^\\/]|\\.)*)\/[a-z]?/)) {
                        result = result.filter(auction => auction.item_name.match(new RegExp(matched.groups.name_regex.match(/\/(?<value>([^\\/]|\\.)*)\/[a-z]*/).groups.value, matched.groups.name_regexext)));
                    } else {
                        console.error("lore regex error continue");
                    } 
                } else if (matched.groups.name_stmt) {
                    result = result.filter(auction => auction.item_name.toLowerCase() === matched.groups.name_stmt.match(/"?(?<value>([^\\"]|\\.)*)"?/).groups.value.toLowerCase());
                }
            } else {
                if (matched.groups.name_regex) {
                    if (matched.groups.name_regex.match(/\/(?<value>([^\\/]|\\.)*)\/[a-z]?/)) {
                        result = all_auctions.filter(auction => auction.item_name.match(new RegExp(matched.groups.name_regex.match(/\/(?<value>([^\\/]|\\.)*)\/[a-z]*/).groups.value, matched.groups.name_regexext)));
                    } else {
                        console.error("lore regex error");
                    }
                } else if (matched.groups.name_stmt) {
                    result = all_auctions.filter(auction => auction.item_name.toLowerCase() === matched.groups.name_stmt.match(/"?(?<value>([^\\"]|\\.)*)"?/).groups.value.toLowerCase());
                }
            }
            matchFlag = true;
            insertFlag = false;
            continue;
        }
        if (matched.groups.script) { // 未実装
            matchFlag = true;
            insertFlag = false;
            continue;
        }
        if (matched.groups.sort) {
            if (!matchFlag) {
                result = all_auctions;
            }
            let method = matched.groups.sortby;
            let methods = {
                "price": sort_bid_amount_desc,
                "price.desc": sort_bid_amount_desc,
                "price.asc": sort_bid_amount_asc,
                "time": sort_time_asc,
                "time.desc": sort_time_desc,
                "time.asc": sort_time_asc,
                "bid": sort_bid_desc,
                "bid.desc": sort_bid_desc,
                "bid.asc": sort_bid_asc,
            };
            result = result.sort(methods[method]);

            insertFlag = false;
            continue;
        }
    }
    result = result.filter((auction, index) => {
        if (index >= page * 48 && index < (page + 1) * 48) {
            return true;
        }
        return false;
    });
    res.send(JSON.stringify(result));
});