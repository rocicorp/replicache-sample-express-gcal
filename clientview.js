const {transact, getMutationID} = require('./db.js');
const {gcal, getEvents} = require('./gcal.js');

async function clientView(clientID, auth) {
    const calendars = (await gcal('/users/me/calendarList', auth)).items;
    console.log(`got ${calendars.length} calendars`);

    let lastMutationID = 0;
    await transact(async (db) => {
        lastMutationID = await getMutationID(clientID);
    });

    const events = [];
    (await Promise.all(calendars.map(async c => {
        console.log('Getting events for', c.id);
        return await getEvents(c.id, auth);
    }))).forEach(r => events.push(...r));
    console.log(`got ${events.length} events`);

    const eventDate = (d) => {
        if (!d) {
            return new Date(0);
        }
        return Date.parse(d.dateTime || d.date || '');
    }

    // Sort events in ascending order of start date.
    events.sort((a, b) => {
        return eventDate(a.start) - eventDate(b.start);
    });

    const out = {
        lastMutationID,
        clientView: {},
    };
    for (let e of events) {
        out.clientView[`/event/${e.calendarID}/${e.id}`] = e;
    }
    console.log(`got ${Object.keys(out.clientView).length} events after dedupe`);
    return out;
}

module.exports = {clientView};
