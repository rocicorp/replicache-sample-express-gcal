const {UserError} = require('./errors.js');
const {transact, getMutationID, setMutationID} = require('./db.js');
const {gcal} = require('./gcal.js');

async function batch(payload, auth) {
    validatePayload(payload);

    let infos = [];
    for (let m of payload.mutations) {
        await transact(async (db) => {
            const currentMutationID = await getMutationID(db, payload.clientID);
            const expectedMutationID = currentMutationID + 1;

            if (m.id > expectedMutationID) {
                throw new UserError(`mutation.id is too high - expected ${expectedMutationID}`);
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
                if (e instanceof UserError) {
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

async function processMutation(m, auth) {
    const handlers = {
        'nop': nop,
        'serverError': serverError,
        'addEvent': addEvent,
        //'upateEvent': updateEvent,
        //'deleteEvent': deleteEvent,
    };
    const h = handlers[m.name];
    if (!h) {
        throw new UserError(`unknown mutation: ${m.name}`);
    }

    await h(m.args, auth);
}

async function nop(data, auth) {
    console.log('nop', data, auth);
}

async function serverError(data, auth) {
    throw new Error('test error');
}

async function addEvent(data, auth) {
    await gcal(`/calendars/${encodeURIComponent(data.calendarID)}/events`,
        auth, null, JSON.stringify(data.body));
}

function validatePayload(payload) {
    if (!payload) {
        throw new UserError('body is required');
    }
    if (!payload.clientID) {
        throw new UserError('clientID is required');
    }
    if (!Array.isArray(payload.mutations)) {
        throw new UserError('mutations is required and must be an array');
    }
    for (let m of payload.mutations) {
        if (typeof m.id != 'number' ||
            typeof m.name != 'string') {
            throw new UserError('Invalid mutation');
        }
    }
}

module.exports = {batch};
