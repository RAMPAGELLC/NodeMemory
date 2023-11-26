// Scuffed NodeJS Memory Write/Read for Remote usage such as cacheing.

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const morgan = require("morgan");
const fs = require("fs");
const path = require("path");
const Config = require('./config');
const app = express();
const Cache = require('memory-cache');

function validateAccessToken(req, res, next) {
    const accessToken = req.headers['x-access-token'] || req.query.token;

    if (Config.APIToken === accessToken) {
        next();
    } else {
        res.status(401).json({ error: 'Invalid access token' });
    }
}


app.use(morgan('common', {
    stream: fs.createWriteStream(path.join(__dirname, 'access.log'), { flags: 'a' })
}));  
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/ping', validateAccessToken, async (req, res, next) => {
    res.send({ success: true });
});

app.all('/set', validateAccessToken, async (req, res, next) => {
    const expire = req.query.expire !== undefined ? parseInt(req.query.expire, 10) * 1000 : 0;
    if (isNaN(expire)) return res.status(400).json({ error: 'Invalid expiration value' });
    if (Config.Debug) console.log(`SET | Key: ${req.query.key} | Value: ${req.query.value} | Expire: ${expire}`);

    Cache.put(req.query.key, btoa(req.query.value), Math.min(expire, 2147483647));

    return res.send({ success: true });
});

app.all('/get', validateAccessToken, async (req, res, next) => {
    if (Config.Debug) console.log(`GET | Key: ${req.query.key}`);

    const value = Cache.get(req.query.key);
    if (!value) return res.send({ success: false, message: 'Key not found' });

    return res.send({ success: true, response: atob(value) });
});

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || Config.AllowedOrgin.includes(origin)) {
            callback(null, true);
        } else {
            const msg = "The CORS policy for this site does not allow access from the specified Origin.";
            console.log(origin + " blocked");
            callback(null, false);
        }
    },
}));

app.listen(Config.Port, () => {
    console.log(`Node Memory listening on port ${Config.Port}`);
});