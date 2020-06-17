import {transact, getMutationID} from './db';
import {gcal, getEvents} from './gcal';

export async function clientView(clientID: string, auth: string) {
    let lastMutationID = 0;
    await transact(async (db) => {
        lastMutationID = await getMutationID(db, clientID);
    });

    const events = await getEvents('primary', auth);
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
        out.clientView[`/event/${e.id}`] = e;
    }
    console.log(`got ${Object.keys(out.clientView).length} events after dedupe`);
    return out;
}
