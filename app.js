const express = require('express');
const fetch = require('node-fetch');
const querystring = require('querystring');
const status = require('http-status-codes');
const { getMaxListeners } = require('process');
const app = express();
const port = 3000;

app.post('/replicache-client-view', async (req, res) => {
    try {
        const auth = req.header("Authorization");
        const calendars = (await gcal('/users/me/calendarList', auth)).items;
        console.log(`got ${calendars.length} calendars`);

        const events = [];
        (await Promise.all(calendars.map(async c => {
            console.log('Getting events for', c.id);
            return await getEvents(c.id, auth);
        }))).forEach(r => events.push(...r));

        const out = {
            lastMutationID: 0,
            clientView: {},
        };
        for (let e of events) {
            out.clientView[`/event/${e.id}`] = e;
        }

        res.json(out);
    } catch (e) {
        if (e instanceof UnauthorizedError) {
            res.status(status.UNAUTHORIZED).end();
            return;
        }
        res.status(status.INTERNAL_SERVER_ERROR).send(e.toString());
        return;
    }
});

async function getEvents(calendarID, auth) {
    const events = [];
    let nextPageToken;

    do {
        const response = await gcal(
            `/calendars/${encodeURIComponent(calendarID)}/events`,
            auth,
            {
                maxResults: 2500,
                pageToken: nextPageToken,
            });
        events.push(...response.items);
        nextPageToken = response.nextPageToken;
    } while (nextPageToken);

    return events;
}

async function gcal(path, auth, qs) {
    const req = new fetch.Request(
        `https://www.googleapis.com/calendar/v3${path}?${querystring.stringify(qs)}`,
        {
            headers: {
                Authorization: auth,
            },
        },
    )
    console.log('Sending request', req);
    const resp = await fetch(req);
    console.log('Got response', resp);
    if (resp.status == status.UNAUTHORIZED) {
        throw new UnauthorizedError(resp.url, await resp.text());
    }
    if (resp.status != status.OK) {
        throw new Error(`Unexpected resp from gcal api: url: ${resp.url}: ${resp.status}: ${await resp.text()}`);
    }
    return await resp.json();
}

class UnauthorizedError extends Error {
    constructor(url, message) {
        super(`Access to ${url} unauthorized: ${message}`);
    }
}

app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`));
