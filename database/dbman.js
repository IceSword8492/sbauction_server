const sqlite = require("sqlite-async");
const Query = require("../utils/query");

class DBMan {
    static async init () {
        console.log(`${this.name} initializing`);
        this.db = await sqlite.open("./database/main.db").catch(console.error);
        this._stmt = null;
    }
    static async begin () {
        await this.db.exec("begin transaction");
    }
    static async commit () {
        await this.db.exec("commit");
    }
    static async prepare (statement) {
        this._stmt = await this.db.prepare(statement);
    }
    static async finalize () {
        await this._stmt.finalize();
        this._stmt = null;
    }
}

module.exports = {
    AuctionsManager: class extends DBMan {
        static async init () {
            await super.init();
            await this.db.run("create table if not exists auctions (uuid text unique, auctioneer text, profile_id text, start integer, end integer, item_name text, item_lore text, extra text, category text, tier text, starting_bid integer, item_bytes text, claimed boolean, highest_bid_amount integer)").catch(e => console.error("[BidsManager.init] ", e));
        }
        static async create (data = {}) {
            await this.db.run(`insert or replace into auctions values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, data.uuid, data.auctioneer, data.profile_id, data.start, data.end, data.item_name, data.item_lore, data.extra, data.category, data.tier, data.starting_bid, data.item_bytes, data.claimed, data.highest_bid_amount).catch(e => console.error("[AuctionsManager.create] ", e));
        }
        static async prepare_create () {
            await this.prepare(`insert or replace into auctions values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
        }
        static async create_stmt (data = {}) {
            if (this._stmt === null) throw new Error("[AuctionManager.create_stmt] statement empty");
            await this._stmt.run(data.uuid, data.auctioneer, data.profile_id, data.start, data.end, data.item_name, data.item_lore, data.extra, data.category, data.tier, data.starting_bid, data.item_bytes, data.claimed, data.highest_bid_amount).catch(e => console.error("[AuctionsManager.create_stmt] ", e));
        }
        static async search (query = "", page = 0) {
            let result = await this.db.all(await Query.compile(query, page, 0)).catch(e => console.error("[AuctionsManager.search] ", e));
            return result;
        }
        static async search_total_count (query = "", page = 0) {
            let result = await this.db.get(await Query.compile(query, page, 1)).catch(e => console.error("[AuctionsManager.search_total_count] ", e));
            return result;
        }
    },
    ClaimedBiddersManager: class extends DBMan { // not in use
        static async init () {
            await super.init();
            await this.db.run("create table if not exists claimed_bidders (uuid text, claimed_bidder text, unique(uuid, claimed_bidder))").catch(console.error);
        }
        static async create (data = {}) {
            await this.db.run(`insert or replace into claimed_bidders values (?, ?)`, data.uuid, data.claimed_bidder);
        }
        static async prepare_create () {
            await this.prepare(`insert or replace into claimed_bidders values (?, ?)`);
        }
        static async create_stmt (data = {}) {
            if (this._stmt === null) throw new Error("[ClaimedBidderManager.create_stmt] statement empty");
            await this._stmt.run(data.uuid, data.claimed_bidder).catch(e => console.error("[ClaimedBiddersManager.create_stmt] ", e));
        }
    },
    BidsManager: class extends DBMan {
        static async init () {
            await super.init();
            await this.db.run("create table if not exists bids (uuid text, auction_id text, bidder text, profile_id text, amount integer, timestamp integer, unique(uuid, timestamp))").catch(e => console.error("[BidsManager.init] ", e));
        }
        static async create (data = {}) {
            await this.db.run(`insert or replace into bids values (?, ?, ?, ?, ?, ?)`, data.auction_id, data.auction_id, data.bidder, data.profile_id, data.amount, data.timestamp).catch(e => console.error("[BidsManager.create] ", e));
        }
        static async prepare_create () {
            await this.prepare(`insert or replace into bids values (?, ?, ?, ?, ?, ?)`);
        }
        static async create_stmt (data = {}) {
            if (this._stmt === null) throw new Error("[BidsManager.create_stmt] statement empty");
            await this._stmt.run(data.auction_id, data.auction_id, data.bidder, data.profile_id, data.amount, data.timestamp).catch(e => console.error("[BidsManager.create_stmt] ", e));
        }
    },
    UsersManager: class extends DBMan {
        static async init () {
            await super.init();
            await this.db.run("create table if not exists users (uuid text unique, mcid text, dark_theme boolean)").catch(console.error);
        }
    },
    ScriptManager: class extends DBMan {
        static async init () {
            await super.init();
            await this.db.run("create table if not exists script (id integer primary key autoincrement, uuid text, query text, timestamp integer)").catch(console.error);
        }
    },
    WatchManager: class extends DBMan {
        static async init () {
            await super.init();
            await this.db.run("create table if not exists watch (id integer primary key autoincrement, uuid text, auction_uuid text, notif boolean)").catch(console.error);
        }
    },
    NotificationManager: class extends DBMan {
        static async init () {
            await super.init();
            await this.db.run("create table if not exists notification (uuid text unique, item_name boolean, stacks boolean, time_remain boolean, price boolean, bid_amount boolean, avg_price boolean, diff_avg_price boolean, anvil boolean)").catch(console.error);
        }
    },
    QueryManager: class extends DBMan {
        static async init () {
            await super.init();
            await this.db.run("create table if not exists query (id integer primary key autoincrement, uuid text, script text, timestamp integer)").catch(console.error);
        }
    },
};
