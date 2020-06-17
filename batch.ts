import {transact, getMutationID, setMutationID} from './db';
import {gcal} from './gcal';
import {userError, ErrorKind} from './errors';

export async function batch(payload: any, auth: string) {
    validatePayload(payload);

    let infos = [];
    for (let m of payload.mutations) {
        await transact(async (db) => {
            const currentMutationID = await getMutationID(db, payload.clientID);
            const expectedMutationID = currentMutationID + 1;

            if (m.id > expectedMutationID) {
                throw userError(`mutation.id is too high - expected ${expectedMutationID}`);
            }

            if (m.id < expectedMutationID) {
                // We already processed this, nbd - carry on to next one.
                infos.push({
                    id: m.id,
                    error: 'mutation already processed',
                });
                return;
            }

            try {
                await processMutation(m, auth);
            } catch (e) {
                if (e.kind == ErrorKind.UserError) {
                    // UserError is permanent.
                    // fall through to below, we will mark the tx handled.
                    infos.push({
                        id: m.id,
                        error: e.toString(),
                    });
                } else {
                    // Otherwise re-throw for top level handler to return proper error code.
                    throw e;
                }
            }

            await setMutationID(db, payload.clientID, expectedMutationID);
        });
    }
    return {
        mutationInfos: infos,
    };
}

type Mutation = {
    id: string
    name: string
    args: any
}

async function processMutation(m: Mutation, auth: string) {
    const handlers = {
        'nop': nop,
        'serverError': serverError,
        'addEvent': addEvent,
        'updateEvent': updateEvent,
        'deleteEvent': deleteEvent,
    };
    const h = handlers[m.name];
    if (!h) {
        throw userError(`unknown mutation: ${m.name}`);
    }

    await h(m.args, auth);
}

async function nop(data: any, auth: string) {
    console.log('nop', data, auth);
}

async function serverError(data: any, auth: string) {
    throw new Error('test error');
}

async function addEvent(data: any, auth: string) {
    await gcal(`/calendars/primary/events`,
        auth, {method: 'POST', body: JSON.stringify(data)});
}

async function updateEvent(data: any, auth: string) {
    await gcal(`/calendars/primary/events/${data.id}`,
        auth, {method: 'PATCH', body: JSON.stringify(data)});
}

async function deleteEvent(data, auth) {
    await gcal(`/calendars/primary/events/${data.id}`,
        auth, {method: 'DELETE'});
}

function validatePayload(payload: any) {
    if (!payload) {
        throw userError('body is required');
    }
    if (!payload.clientID) {
        throw userError('clientID is required');
    }
    if (!Array.isArray(payload.mutations)) {
        throw userError('mutations is required and must be an array');
    }
    for (let m of payload.mutations) {
        if (typeof m.id != 'number' ||
            typeof m.name != 'string') {
            throw userError('Invalid mutation');
        }
    }
}

module.exports = {batch};
