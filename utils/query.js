const rp = require("request-promise");

const Types = {
    keyword: 0,
    literal: 1,
    integer: 2,
    punctuator: 3,
    // regex: 4,
};

const Keywords = [
    "lore",     // 0
    "name",     // 1
    "page",     // 2
    "price",    // 3
    "seller",   // 4
    "sort",     // 5
    "state",    // 6
    "tier",     // 7
    "query",    // 8 not in use
    "reforge", // 9
    "potato",   // 10
];

const Punctuators = [
    "::",
    ":",
    "-",
];

module.exports = Query = class Query {
    static tokenize (query) {
        // const regex = `(\\/(?<regex>([^\\/]|\\\\/)*)\\/(?<flag>[a-z]*))`;
        const keyword = `((?<keyword>${Keywords.join("|")})(?=:))`;
        const punctuator = `(?<punctuator>${Punctuators.join("|")})`;
        const integer = `(?<integer>[0-9]+)`;
        const literal = `("(?<literal_val1>([^\\"]|\\\\.)*)"|(?<literal_val2>[^ :]+))`;
        const regexp = new RegExp(`${keyword}|${punctuator}|${integer}|${literal}`, "g");
        let result = null;
        let response = [];
        while (result = regexp.exec(query)) {
            let groups = result.groups;
            if (groups.keyword) {
                response.push({
                    type: Types.keyword,
                    value: groups.keyword,
                });
            }
            if (groups.literal_val1 || groups.literal_val2) {
                response.push({
                    type: Types.literal,
                    value: groups.literal_val1 || groups.literal_val2,
                });
            }
            if (groups.integer) {
                response.push({
                    type: Types.integer,
                    value: groups.integer,
                });
            }
            if (groups.punctuator) {
                response.push({
                    type: Types.punctuator,
                    value: groups.punctuator,
                });
            }
            // if (groups.regex) {
            //     response.push({
            //         type: Types.regex,
            //         value: groups.regex,
            //     });
            // }
        }
        return response;
    }
    static async parse (query) {
        let tokens = this.tokenize(query);
        let response = [];
        for (let i = 0; i < tokens.length; i++) {
            let token = tokens[i];
            if (token.type === Types.keyword) {
                if (token.value === Keywords[0]) { // lore
                    response.push({
                        type: Keywords[0],
                        value: `item_lore like '%${tokens[i += 2].value}%'`,
                    });
                }
                if (token.value === Keywords[1]) { // name
                    response.push({
                        type: Keywords[1],
                        value: `item_name like '%${tokens[i += 2].value}%'`,
                    });
                }
                if (token.value === Keywords[2]) { // page
                    response.push({
                        type: Keywords[2],
                        value: `limit 48 offset ${tokens[i += 2].value * 48}`,
                    });
                }
                if (token.value === Keywords[3]) { // price
                    response.push({
                        type: Keywords[3],
                        value: `${tokens[i += 2].value} <= price and price <= ${tokens[i += 2].value}`,
                    });
                }
                if (token.value === Keywords[4]) { // seller
                    response.push({
                        type: Keywords[4],
                        value: `auctioneer = '${JSON.parse(await rp.get("https://api.mojang.com/users/profiles/minecraft/" + tokens[i += 2].value)).id}'`,
                    });
                }
                if (token.value === Keywords[5]) { // sort
                    response.push({
                        type: Keywords[5],
                        value: `order by ${tokens[i += 2].value.split(".")[0]} ${tokens[i].value.split(".")[1]}`,
                    });
                }
                if (token.value === Keywords[6]) { // state
                    response.push({
                        type: Keywords[6],
                        value: tokens[i += 2].value === "open" ? "time > 0" : tokens[i].value === "ending" ? "0 < time and time <= 300000" : "time <= 0",
                    });
                }
                if (token.value === Keywords[7]) { // tier
                    response.push({
                        type: Keywords[7],
                        value: `lower(tier) = lower('${tokens[i += 2].value}')`,
                    });
                }
                if (token.value === Keywords[8]) { // query
                    // not in use
                }
                if (token.value === Keywords[9]) { // reforge
                    response.push({
                        type: Keywords[9],
                        value: "(" + tokens[i += 2].value.split(",").map(p => `item_name glob '${p} [^D][^r][^a][^g][^o][^n]*' or item_name glob 'Very ${p}*'`).join(" or ") + ")",
                    });
                }
                if (token.value === Keywords[10]) { // potato
                    response.push({
                        type: Keywords[10],
                        value: "(" + tokens[i += 2].value.split(",").map(p => `item_lore like '%${p}%'`).join(" or ") + ")",
                    });
                }
            }
        }
        return response;
    }
    static async compile (query, page = 0, mode = 0) {
        let ast = await this.parse(query);
        let where = [];
        let order = "order by time asc";
        let limit = "limit 48";
        ast.unshift({
            type: Keywords[2],
            value: `limit 48 offset ${page * 48}`,
        });
        ast.forEach(part => {
            switch (part.type) {
            case Keywords[0]:
            case Keywords[1]:
            case Keywords[3]:
            case Keywords[4]:
            case Keywords[6]:
            case Keywords[7]:
            case Keywords[9]:
            case Keywords[10]:
                where.push(part.value);
                break;
            case Keywords[2]:
                limit = part.value;
                break;
            case Keywords[5]:
                order = part.value;
                break;
            }
        });
        let sql;
        switch (mode) {
        case 1:
            sql = `select count(distinct uuid) as count from (select auctions.uuid as uuid, count(bids.uuid) as bid, end - strftime('%s', datetime()) * 1000 as time, max(highest_bid_amount, starting_bid) as price from auctions left outer join bids on auctions.uuid = bids.uuid ${where.length ? "where" : ""} ${where.join(" and ")} group by bids.uuid ${order})`;
            break;
        case 0:
        default:
            sql = `select *, count(bids.uuid) as bid, end - strftime('%s', datetime()) * 1000 as time, max(highest_bid_amount, starting_bid) as price from auctions left outer join bids on auctions.uuid = bids.uuid ${where.length ? "where" : ""} ${where.join(" and ")} group by bids.uuid ${order} ${limit}`;
            break;
        }
        return sql;
    }
};
