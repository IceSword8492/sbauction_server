const fs = require('fs');

/**
 * @param {any} req
 * @param {any} res
 * @return {boolean}
 */
const updateApiKey = (req, res) => {
    if (!req || !res) return false;
    const key = req.query.key || req.params.key;
    if (!key) return false;
    const env = fs.readFileSync(`${__dirname}/../.env`, 'utf8');
    console.log('path', `${__dirname}/../.env`, 'env', env);
    return true;
};

module.exports = updateApiKey;
