const sqlite = require("sqlite-async");
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
            await this.db.query("create table if not exists auctions (uuid varchar(128) unique primary key, auctioneer text, profile_id text, start integer, end integer, item_name text, item_lore text, extra text, category text, tier text, starting_bid integer, item_bytes text, claimed boolean, highest_bid_amount integer)").catch(e => console.error("[BidsManager.init] ", e));
        }
        static async create (data = {}) {
            await this.db.format(`insert into auctions values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) on duplicate key update uuid = ?, auctioneer = ?, profile_id = ?, start = ?, end = ?, item_name = ?, item_lore = ?, extra = ?, category = ?, tier = ?, starting_bid = ?, item_bytes = ?, claimed = ?, highest_bid_amount = ?`, [data.uuid, data.auctioneer, data.profile_id, data.start, data.end, data.item_name, data.item_lore, data.extra, data.category, data.tier, data.starting_bid, data.item_bytes, data.claimed, data.highest_bid_amount, data.uuid, data.auctioneer, data.profile_id, data.start, data.end, data.item_name, data.item_lore, data.extra, data.category, data.tier, data.starting_bid, data.item_bytes, data.claimed, data.highest_bid_amount]).catch(e => console.error("[AuctionsManager.create] ", e));
        }
        static async prepare_create () {
            await this.prepare(`insert into auctions values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) on duplicate key update uuid = ?, auctioneer = ?, profile_id = ?, start = ?, end = ?, item_name = ?, item_lore = ?, extra = ?, category = ?, tier = ?, starting_bid = ?, item_bytes = ?, claimed = ?, highest_bid_amount = ?`);
        }
        static async create_stmt (data = {}) {
            if (this._stmt === null) throw new Error("[AuctionManager.create_stmt] statement empty");
            await this.db.format(this._stmt, [ata.uuid, ddata.auctioneer, data.profile_id, data.start, data.end, data.item_name, data.item_lore, data.extra, data.category, data.tier, data.starting_bid, data.item_bytes, data.claimed, data.highest_bid_amount, data.uuid, data.auctioneer, data.profile_id, data.start, data.end, data.item_name, data.item_lore, data.extra, data.category, data.tier, data.starting_bid, data.item_bytes, data.claimed, data.highest_bid_amount]).catch(e => console.error("[AuctionsManager.create_stmt] ", e));
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
            let result = await this.db.format(`select *, count(bids.uuid) as bid, end - strftime('%s', datetime()) * 1000 as time, max(highest_bid_amount, starting_bid) as price from auctions left outer join bids on auctions.uuid = bids.uuid where auctions.uuid = ? group by bids.uuid`, [uuid]).catch(console.error);
            result.uuid = uuid;
            return result;
        }
    },
    ClaimedBiddersManager: class extends DBMan { // not in use
        static async init () {
            await super.init();
            await this.db.query("create table if not exists claimed_bidders (uuid varchar(128) primary key, claimed_bidder varchar(128), unique(uuid, claimed_bidder))").catch(console.error);
        }
        static async create (data = {}) {
            await this.db.format(`insert into claimed_bidders values (?, ?) on duplicate key update uuid = ?, claimed_bidder = ?`, [data.uuid, data.claimed_bidder, data.uuid, data.claimed_bidder]);
        }
        static async prepare_create () {
            await this.prepare(`insert into claimed_bidders values (?, ?) on duplicate key update uuid = ?, claimed_bidder = ?`);
        }
        static async create_stmt (data = {}) {
            if (this._stmt === null) throw new Error("[ClaimedBidderManager.create_stmt] statement empty");
            await this.db.format(this._stmt, [data.uuid, data.claimed_bidder, data.uuid, data.claimed_bidder]).catch(e => console.error("[ClaimedBiddersManager.create_stmt] ", e));
        }
    },
    BidsManager: class extends DBMan {
        static async init () {
            await super.init();
            await this.db.query("create table if not exists bids (uuid varchar(128) primary key, auction_id text, bidder text, profile_id text, amount integer, timestamp integer, unique(uuid, timestamp))").catch(e => console.error("[BidsManager.init] ", e));
        }
        static async create (data = {}) {
            await this.db.format(`insert into bids values (?, ?, ?, ?, ?, ?) on duplicate key update uuid = ?, auction_id = ?, bidder = ?, profile_id = ?, amount = ?, timestamp = ?`, [data.auction_id, data.auction_id, data.bidder, data.profile_id, data.amount, data.timestamp, data.auction_id, data.auction_id, data.bidder, data.profile_id, data.amount, data.timestamp]).catch(e => console.error("[BidsManager.create] ", e));
        }
        static async prepare_create () {
            await this.prepare(`insert into bids values (?, ?, ?, ?, ?, ?) on duplicate key update uuid = ?, auction_id = ?, bidder = ?, profile_id = ?, amount = ?, timestamp = ?`);
        }
        static async create_stmt (data = {}) {
            if (this._stmt === null) throw new Error("[BidsManager.create_stmt] statement empty");
            await this.db.format(this._stmt, [data.auction_id, data.auction_id, data.bidder, data.profile_id, data.amount, data.timestamp, data.auction_id, data.auction_id, data.bidder, data.profile_id, data.amount, data.timestamp]).catch(e => console.error("[BidsManager.create_stmt] ", e));
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
            await this.db.query("create table if not exists script (id integer auto_increment, uuid text, query text, timestamp integer)").catch(console.error);
        }
    },
    WatchManager: class extends DBMan {
        static async init () {
            await super.init();
            await this.db.query("create table if not exists watch (id integer auto_increment, uuid text, auction_uuid text, notif boolean)").catch(console.error);
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
            await this.db.query("create table if not exists query (id integer primary key auto_increment, uuid text, script text, timestamp integer)").catch(console.error);
        }
    },
};
