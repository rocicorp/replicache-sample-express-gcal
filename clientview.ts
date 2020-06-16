import {transact, getMutationID} from './db';
import {gcal, getEvents} from './gcal';

export async function clientView(clientID: string, auth: string) {
    const calendars = (await gcal('/users/me/calendarList', auth)).items;
    console.log(`got ${calendars.length} calendars`);

    let lastMutationID = 0;
    await transact(async (db) => {
        lastMutationID = await getMutationID(db, clientID);
    });

    const events = [];
    (await Promise.all(calendars.map(async (c: any) => {
        console.log('Getting events for', c.id);
        return await getEvents(c.id, auth);
    }))).forEach((r: Array<any>) => events.push(...r));
    console.log(`got ${events.length} events`);

    const eventDate = (d: any) => {
        if (!d) {
            return 0;
        }
        return Date.parse(d.dateTime || d.date || '');
    }

    // Sort events in ascending order of start date.
    events.sort((a: any, b: any) => {
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
