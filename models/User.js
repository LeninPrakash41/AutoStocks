const crypto = require('crypto');
const db = require('../config/db');
const conn = require('../controllers');

class User {
    constructor (attr) {
        this.id = attr.ID;
        this.salt = attr.salt;
        this.hash = attr.hash;
    }

    verify (password) {
        let testHash =
        crypto.pbkdf2Sync(password, this.salt, 10000, 512, 'sha512').toString('hex');
        return (testHash === this.hash)
    }
}

module.exports.register = function (username, password, regCallback) {
    function hash (password, hashCallback) {
        let salt = crypto.randomBytes(16).toString('hex');
        let hash =
        crypto.pbkdf2Sync(password, salt, 10000, 512, 'sha512').toString('hex');
        hashCallback(username, salt, hash)
    }
    db.getConn(function (err, conn) {
        if (err) {
            throw err;
        }
        conn.query(
            'SELECT * FROM users WHERE ID=?', [username],
            function (error, results, fields) {
                if (error) {
                    console.log(error);
                }
                if (results.length > 0) {
                    regCallback(new Error('Invalid username'),
                                'Username is taken');
                } else {
                    hash (password, function (username, salt, hash) {
                        conn.query(
                            'INSERT INTO users (ID, salt, hash)'+
                            'VALUES (?, ?, ?);',
                            [username, salt, hash],
                            function (error, results, fields) {
                                if (error) {
                                    console.log(error);
                                }
                            }
                        );
                    });
                    regCallback(null, `Registered user ${username}`);
                }
            }
        );
    });
}

module.exports.findUser = function (username, findCallback) {
    db.getConn(function (err, conn) {
        if (err) {
            throw err;
        }
        conn.query(
            'SELECT ID, salt, hash FROM users WHERE ID=?', [username],
            function (error, results, fields) {
                if (error) {
                    findCallback(error, null);
                } else if (results.length === 0) {
                    findCallback(null, null);
                } else {
                    findCallback(null, new User(results[0]));
                }
            }
        );
    });
}
