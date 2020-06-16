const fetch = require('node-fetch');
const status = require('http-status-codes');
const querystring = require('querystring');
const {UnauthorizedError, UserError} = require('./errors.js');

async function getEvents(calendarID, auth) {
    const events = [];
    let nextPageToken;

    // get events from up to one year ago
    const now = new Date();
    const timeMin = `${now.getFullYear()-1}-${now.getMonth()+1}-${now.getDate()}T00:00:00Z`;

    do {
        const response = await gcal(
            `/calendars/${encodeURIComponent(calendarID)}/events`,
            auth,
            {
                qs: {
                    maxResults: 2500,
                    pageToken: nextPageToken,
                    timeMin,
                }
            });
        response.items.forEach(item => {
            item.calendarID = calendarID;
        });
        events.push(...response.items);
        nextPageToken = response.nextPageToken;
    } while (nextPageToken);

    return events;
}

async function gcal(path, auth, opts) {
    if (!opts) opts = {};
    const req = new fetch.Request(
        `https://www.googleapis.com/calendar/v3${path}?${querystring.stringify(opts.qs)}`,
        {
            headers: {
                Authorization: auth,
                'Content-type': opts.body ? 'application/json': '',
            },
            method: opts.method || 'GET',
            body: opts.body,
        },
    )
    //console.log('Sending request', req);
    const resp = await fetch(req);
    //console.log('Got response', resp);
    if (resp.status == status.UNAUTHORIZED) {
        throw new UnauthorizedError(resp.url, await resp.text());
    }
    if (Math.floor(resp.status / 100) == 4) {
        throw new UserError(`request failed - url: ${resp.url}, status: ${resp.status}, message: ${await resp.text()}`);
    }
    if (Math.floor(resp.status / 100) != 2) {
        throw new Error(`Unexpected resp from gcal api: url: ${resp.url}: ${resp.status}: ${await resp.text()}`);
    }
    const text = await resp.text();
    return text == '' ? null : JSON.parse(text);
}

module.exports = {gcal, getEvents, UnauthorizedError};
