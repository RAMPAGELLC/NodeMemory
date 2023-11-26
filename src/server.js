// Scuffed NodeJS Memory Write/Read for Remote usage such as cacheing.

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const morgan = require("morgan");
const Config = require('./config');
const app = express();

let Memory = {};

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
    const expire = req.query.expire != undefined ? parseInt(Buffer.from(req.query.expire, "hex").toString(), 10) : 0;
    if (Config.Debug) console.log(`SET | Key: ${req.query.key} | Value: ${req.query.value} | Expire: ${expire}`);

    Memory[req.query.key] = {
        expire: expire,
        value: btoa(req.query.value)
    }

    return res.send({ success: true });
});

app.all('/get', validateAccessToken, async (req, res, next) => {
    if (Config.Debug) console.log(`GET | Key: ${req.query.key}`);

    if (Memory[req.query.key] == null) return res.send({ success: false, message: 'Key not found' });

    return res.send({ success: true, response: atob(Memory[req.query.key].value) });
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