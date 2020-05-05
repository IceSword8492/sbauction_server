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
    const env = fs.readFileSync(`${process.cwd()}/.env`, 'utf8');
    console.log('path', `${process.cwd()}/.env`, 'env', env);
    return true;
};

module.exports = updateApiKey;
