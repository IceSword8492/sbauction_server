const sqlite = require("sqlite-async");

class DBMan {
    static async init () {
        console.log(`${this.name} initializing`);
        this.db = await sqlite.open("./database/main.db").catch(console.error);
    }
}

module.exports = {
    AuctionsManager: class extends DBMan {
        static async init () {
            await super.init();
            await this.db.run("create table if not exists auctions (uuid text unique, auctioneer text, profile_id text, start integer, end integer, item_name text, item_lore text, extra text, category text, tier text, starting_bid integer, item_bytes text, claimed boolean, highest_bid_amount integer)").catch(console.error);
        }
        static async create (data = {}) {
            await this.db.run(`insert or replace into auctions values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, data.uuid, data.auctioneer, data.profile_id, data.start, data.end, data.item_name, data.item_lore, data.extra, data.category, data.tier, data.starting_bid, data.item_bytes, data.claimed, data.highest_bid_amount).catch(console.error);
        }
    },
    ClaimedBiddersManager: class extends DBMan {
        static async init () {
            await super.init();
            await this.db.run("create table if not exists claimed_bidders (uuid text, claimed_bidder text, unique(uuid, claimed_bidder))").catch(console.error);
        }
        static async create (data = {}) { // not in use
            await this.db.run(`insert or replace into claimed_bidders (?, ?)`, data.uuid, data.claimed_bidder);
        }
    },
    BidsManager: class extends DBMan {
        static async init () {
            await super.init();
            await this.db.run("create table if not exists bids (uuid text, auction_id text, bidder text, profile_id text, amount integer, timestamp integer, unique(uuid, timestamp))").catch(console.error);
        }
        static async create (data = {}) {
            await this.db.run(`insert or replace into bids (?, ?, ?, ?, ?, ?)`, data.auction, data.auction_id, data.bidder, data.profile_id, data.amount, data.timestamp);
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
