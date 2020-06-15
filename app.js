const express = require('express');
const status = require('http-status-codes');
const app = express();
const {createSchema} = require('./db.js');
const {UnauthorizedError, UserError} = require('./errors.js');
const {batch} = require('./batch.js');
const {clientView} = require('./clientview.js');

const port = process.env.PORT || 5000;

app.use(express.json());

app.post('/db', async (req, res) => {
    try {
        await createSchema();
        res.send('OK').end();
    } catch (e) {
        console.error(e);
        res.send("Error " + e);
    }
});

app.post('/replicache-client-view', async (req, res) => {
    try {
        const auth = req.header("Authorization");
        const cvReq = req.body();
        if (!cvReq.clientID) {
            throw new UserError('clientID is required');
        }
        const cv = await clientView(cvReq.clientID, auth);
        res.json(cv);
    } catch (e) {
        handleError(res, e);
    }
});

app.post('/replicache-batch', async (req, res) => {
    try {
        const auth = req.header("Authorization");
        const batchResponse = await batch(req.body, auth);
        res.json(batchResponse);
    } catch (e) {
        handleError(res, e);
    }
});

function handleError(res, e) {
    if (e instanceof UnauthorizedError) {
        res.status(status.UNAUTHORIZED).send(e.toString());
        return;
    }
    if (e instanceof UserError) {
        res.status(status.BAD_REQUEST).send(e.toString());
        return;
    }
    console.error(e);
    res.status(status.INTERNAL_SERVER_ERROR).send(e.toString());
}

app.listen(port, () => console.log(`Listening on ${ port }`));
