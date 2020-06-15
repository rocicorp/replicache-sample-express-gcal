const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false,
});

const schema = [
    "DROP TABLE IF EXISTS Replicache",
    "CREATE TABLE Replicache (ClientID varchar(255) NOT NULL PRIMARY KEY, LastMutationID integer NOT NULL)",
]

async function createSchema() {
    await transact(async (db) => {
        for (let stmt of schema) {
            await db.query(stmt);
        }
    });
}

async function getMutationID(db, clientID) {
    const res = await db.query('SELECT LastMutationID FROM Replicache WHERE ClientID = $1', [clientID]);
    if (!res || res.rows.length != 1) {
        return 0;
    }
    return res.rows[0]['lastmutationid'];
}

async function setMutationID(db, clientID, mutationID) {
    await db.query(
        'INSERT INTO Replicache (ClientID, LastMutationID) VALUES ($1, $2) ' +
        'ON CONFLICT (ClientID) DO UPDATE SET LastMutationID=$2', [clientID, mutationID]);
}

async function transact(f) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        try {
            await f(client);
            await client.query('COMMIT');
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        }
    } finally {
        client.release();
    }
}

module.exports = {
    createSchema,
    transact,
    getMutationID,
    setMutationID,
};
