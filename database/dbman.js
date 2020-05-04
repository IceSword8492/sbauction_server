const mysql = require('promise-mysql');
const Query = require("../utils/query");

require("dotenv").config({path: __dirname + "/../.env"});

class DBMan {
    static async init () {
        console.log(`${this.name} initializing`);
        this.db = await mysql.createConnection({
            host: process.env.DBHOST,
            user: process.env.DBUSER,
            password: process.env.DBPASSWORD,
            database: process.env.DBNAME,
        }).catch(console.error);
        console.log('MYSQL CONNECTED');
        this._stmt = null;
    }
    static async begin () {
        await this.db.beginTransaction();
    }
    static async commit () {
        await this.db.commit();
    }
    static async prepare (statement) {
        this._stmt = statement;
    }
}

module.exports = {
    AuctionsManager: class extends DBMan {
        static async init () {
            await super.init();
            await this.db.query("create table if not exists auctions (uuid varchar(128) unique primary key, auctioneer text, profile_id text, start bigint, end bigint, item_name text, item_lore text, extra text, category text, tier text, starting_bid bigint, item_bytes text, claimed boolean, highest_bid_amount bigint)").catch(e => console.error("[BidsManager.init] ", e));
        }
        static async create (data = {}) {
            await this.db.query(`insert into auctions values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) on duplicate key update uuid = ?, auctioneer = ?, profile_id = ?, start = ?, end = ?, item_name = ?, item_lore = ?, extra = ?, category = ?, tier = ?, starting_bid = ?, item_bytes = ?, claimed = ?, highest_bid_amount = ?`, [data.uuid, data.auctioneer, data.profile_id, data.start, data.end, data.item_name, data.item_lore, data.extra, data.category, data.tier, data.starting_bid, data.item_bytes, data.claimed, data.highest_bid_amount, data.uuid, data.auctioneer, data.profile_id, data.start, data.end, data.item_name, data.item_lore, data.extra, data.category, data.tier, data.starting_bid, data.item_bytes, data.claimed, data.highest_bid_amount]);
        }
        static async prepare_create () {
            await this.prepare(`insert into auctions values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) on duplicate key update uuid = ?, auctioneer = ?, profile_id = ?, start = ?, end = ?, item_name = ?, item_lore = ?, extra = ?, category = ?, tier = ?, starting_bid = ?, item_bytes = ?, claimed = ?, highest_bid_amount = ?`);
        }
        static async create_stmt (data = {}) {
            if (this._stmt === null) throw new Error("[AuctionManager.create_stmt] statement empty");
            await this.db.query(this._stmt, [data.uuid, data.auctioneer, data.profile_id, data.start, data.end, data.item_name, data.item_lore, data.extra, data.category, data.tier, data.starting_bid, data.item_bytes, data.claimed, data.highest_bid_amount, data.uuid, data.auctioneer, data.profile_id, data.start, data.end, data.item_name, data.item_lore, data.extra, data.category, data.tier, data.starting_bid, data.item_bytes, data.claimed, data.highest_bid_amount]);
        }
        static async search (query = "", page = 0) {
            let result = await this.db.query(await Query.compile(query, page, 0)).catch(e => console.error("[AuctionsManager.search] ", e));
            return result;
        }
        static async search_total_count (query = "", page = 0) {
            let result = await this.db.query(await Query.compile(query, page, 1)).catch(e => console.error("[AuctionsManager.search_total_count] ", e));
            return result;
        }
        static async auction_by_uuid (uuid) {
            if (!uuid) {
                console.error(`invalid uuid: ${uuid}`);
                return {};
            }
            let result = await this.db.query(`select *, end - unix_timestamp(now()) * 1000 as time, greatest(highest_bid_amount, starting_bid) as price from auctions where auctions.uuid = ?`, [uuid]);
            result.bid = await this.db.query('select count(uuid) as bid from bids where uuid = ?', [uuid]).catch(console.error).bid;
            return result;
        }
    },
    ClaimedBiddersManager: class extends DBMan { // not in use
        static async init () {
            await super.init();
            await this.db.query("create table if not exists claimed_bidders (uuid varchar(128) primary key, claimed_bidder varchar(128), unique(uuid, claimed_bidder))").catch(console.error);
        }
        static async create (data = {}) {
            await this.db.query(`insert into claimed_bidders values (?, ?) on duplicate key update uuid = ?, claimed_bidder = ?`, [data.uuid, data.claimed_bidder, data.uuid, data.claimed_bidder]);
        }
        static async prepare_create () {
            await this.prepare(`insert into claimed_bidders values (?, ?) on duplicate key update uuid = ?, claimed_bidder = ?`);
        }
        static async create_stmt (data = {}) {
            if (this._stmt === null) throw new Error("[ClaimedBidderManager.create_stmt] statement empty");
            await this.db.query(this._stmt, [data.uuid, data.claimed_bidder, data.uuid, data.claimed_bidder]);
        }
    },
    BidsManager: class extends DBMan {
        static async init () {
            await super.init();
            await this.db.query("create table if not exists bids (id bigint primary key auto_increment not null, uuid varchar(128), auction_id text, bidder text, profile_id text, amount bigint, timestamp bigint, unique(uuid, timestamp))").catch(e => console.error("[BidsManager.init] ", e));
        }
        static async create (data = {}) {
            await this.db.query(`insert into bids (uuid, auction_id, bidder, profile_id, amount, timestamp) values (?, ?, ?, ?, ?, ?) on duplicate key update uuid = ?, auction_id = ?, bidder = ?, profile_id = ?, amount = ?, timestamp = ?`, [data.auction_id, data.auction_id, data.bidder, data.profile_id, data.amount, data.timestamp, data.auction_id, data.auction_id, data.bidder, data.profile_id, data.amount, data.timestamp]);
        }
        static async prepare_create () {
            await this.prepare(`insert into bids (uuid, auction_id, bidder, profile_id, amount, timestamp) values (?, ?, ?, ?, ?, ?) on duplicate key update uuid = ?, auction_id = ?, bidder = ?, profile_id = ?, amount = ?, timestamp = ?`);
        }
        static async create_stmt (data = {}) {
            if (this._stmt === null) throw new Error("[BidsManager.create_stmt] statement empty");
            await this.db.query(this._stmt, [data.auction_id, data.auction_id, data.bidder, data.profile_id, data.amount, data.timestamp, data.auction_id, data.auction_id, data.bidder, data.profile_id, data.amount, data.timestamp]);
        }
    },
    UsersManager: class extends DBMan {
        static async init () {
            await super.init();
            await this.db.query("create table if not exists users (uuid varchar(128) unique, mcid text, dark_theme boolean)").catch(console.error);
        }
    },
    ScriptManager: class extends DBMan {
        static async init () {
            await super.init();
            await this.db.query("create table if not exists script (id bigint auto_increment primary key not null, uuid text, query text, timestamp bigint)").catch(console.error);
        }
    },
    WatchManager: class extends DBMan {
        static async init () {
            await super.init();
            await this.db.query("create table if not exists watch (id bigint auto_increment primary key not null, uuid text, auction_uuid text, notif boolean)").catch(console.error);
        }
    },
    NotificationManager: class extends DBMan {
        static async init () {
            await super.init();
            await this.db.query("create table if not exists notification (uuid varchar(128) unique, item_name boolean, stacks boolean, time_remain boolean, price boolean, bid_amount boolean, avg_price boolean, diff_avg_price boolean, anvil boolean)").catch(console.error);
        }
    },
    QueryManager: class extends DBMan {
        static async init () {
            await super.init();
            await this.db.query("create table if not exists query (id bigint primary key auto_increment, uuid text, script text, timestamp bigint)").catch(console.error);
        }
    },
    StatisticsManager: class extends DBMan {
        static async init () {
            await super.init();
            this.db.connection.config.queryFormat = function (query, values) {
                if (!values) return query;
                return query.replace(/\:(\w+)/g, function (txt, key) {
                    if (values.hasOwnProperty(key)) {
                    return this.escape(values[key]);
                    }
                    return txt;
                }.bind(this));
            };
            await this.db.query(`
            create table if not exists statistics
                (
                    id bigint primary key auto_increment,
                    date varchar(1023),
                    timestamp bigint,
                    item_name varchar(1023),
                    count bigint,
                    average_starting_bid double,
                    max_starting_bid bigint,
                    min_starting_bid bigint,
                    var_starting_bid double,
                    std_starting_bid double,
                    sum_starting_bid bigint,
                    average_highest_bid_amount double,
                    max_highest_bid_amount bigint,
                    min_highest_bid_amount bigint,
                    var_highest_bid_amount double,
                    std_highest_bid_amount double,
                    sum_highest_bid_amount bigint
                )
            `);
        }
        static async getStatistics (period = null, flag = false, itemName = null) {
            if (flag) {
                const statistics = await this.db.query(`
                select
                    date,
                    timestamp,
                    item_name,
                    count,
                    average_starting_bid,
                    max_starting_bid,
                    min_starting_bid,
                    var_starting_bid,
                    std_starting_bid,
                    sum_starting_bid,
                    average_highest_bid_amount,
                    max_highest_bid_amount,
                    min_highest_bid_amount,
                    var_highest_bid_amount,
                    std_highest_bid_amount,
                    sum_highest_bid_amount
                from statistics where timestamp > :timestamp
                `, {timestamp: new Date().getTime() - (period || (30 * 24 * 60 * 60 * 1000))});
                let tmp = {};
                for (const s of statistics) {
                    if (!tmp[s.item_name]) {
                        tmp[s.item_name] = [s];
                        continue;
                    }
                    tmp[s.item_name].push(s);
                }
                if (itemName) {
                    if (!tmp[itemName]) return {};
                    return JSON.parse(JSON.stringify(Object.values(tmp[itemName])));
                }
                return JSON.parse(JSON.stringify(Object.values(tmp)));
            }
            return await this.db.query(`
            select
                item_name,
                count(starting_bid) as count,
                avg(starting_bid) as average_starting_bid,
                max(starting_bid) as max_starting_bid,
                min(starting_bid) as min_starting_bid,
                variance(starting_bid) as var_starting_bid,
                std(starting_bid) as std_starting_bid,
                sum(starting_bid) as sum_starting_bid,
                avg(highest_bid_amount) as average_highest_bid_amount,
                max(highest_bid_amount) as max_highest_bid_amount,
                min(highest_bid_amount) as min_highest_bid_amount,
                variance(highest_bid_amount) as var_highest_bid_amount,
                std(highest_bid_amount) as std_highest_bid_amount,
                sum(highest_bid_amount) as sum_highest_bid_amount
            from auctions
            where
                end - unix_timestamp(now()) * 1000 < 0
                and highest_bid_amount > 0
            group by item_name
            `);
        }
        static async setStatistics (statistics) {
            /*
            console.log('insert begin');
            await this.begin();
            await this.prepare_create();
            for (let s of statistics) {
                await this.create_stmt(s);
            }
            await this.commit();
            console.log('insert end');
            */
            console.log('delete from auctions');
            await this.db.query('delete from auctions');
            console.log('delete from bids');
            await this.db.query('delete from bids');
        }
        static async prepare_create () {
            await this.prepare(`
            insert into statistics
                (
                    date,
                    timestamp,
                    item_name,
                    count,
                    average_starting_bid,
                    max_starting_bid,
                    min_starting_bid,
                    var_starting_bid,
                    std_starting_bid,
                    sum_starting_bid,
                    average_highest_bid_amount,
                    max_highest_bid_amount,
                    min_highest_bid_amount,
                    var_highest_bid_amount,
                    std_highest_bid_amount,
                    sum_highest_bid_amount
                )
                values
                (
                    :date,
                    :timestamp,
                    :item_name,
                    :count,
                    :average_starting_bid,
                    :max_starting_bid,
                    :min_starting_bid,
                    :var_starting_bid,
                    :std_starting_bid,
                    :sum_starting_bid,
                    :average_highest_bid_amount,
                    :max_highest_bid_amount,
                    :min_highest_bid_amount,
                    :var_highest_bid_amount,
                    :std_highest_bid_amount,
                    :sum_highest_bid_amount
                )
            `, );
        }
        static async create_stmt (data = {}) {
            if (this._stmt === null) throw new Error("[StatisticsManager.create_stmt] statement empty");
            await this.db.query(this._stmt, data);
        }
    },
};
