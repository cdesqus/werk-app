const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Try both locations just in case
const dbPaths = [
    path.join(__dirname, 'data', 'database.sqlite'),
    path.join(__dirname, 'database.sqlite')
];

let db = null;
let dbPath = '';

for (const p of dbPaths) {
    const fs = require('fs');
    if (fs.existsSync(p)) {
        db = new sqlite3.Database(p);
        dbPath = p;
        break;
    }
}

if (!db) {
    console.log("No database file found!");
    process.exit(1);
}

console.log(`Using DB: ${dbPath}`);

const month = 12;
const year = 2025;

// Simulate the server logic
const startDate = new Date(year, month - 2, 28);
startDate.setHours(0, 0, 0, 0);

const endDate = new Date(year, month - 1, 27);
endDate.setHours(23, 59, 59, 999);

console.log(`Checking Window: ${startDate.toISOString()} to ${endDate.toISOString()}`);

// Check Overtimes by createdAt
const sql = `
    SELECT id, date, createdAt, status, payableAmount 
    FROM Overtimes 
    WHERE createdAt BETWEEN ? AND ?
`;

db.all(sql, [startDate.toISOString(), endDate.toISOString()], (err, rows) => {
    if (err) {
        console.error(err);
        return;
    }
    console.log(`Found ${rows.length} Overtimes in this window (Submission Mode):`);
    console.table(rows);
});

// Check Overtimes by Date (Activity Mode)
const startActivity = new Date(year, month - 1, 1).toISOString().split('T')[0];
const endActivity = new Date(year, month, 0).toISOString().split('T')[0];

console.log(`Checking Activity Window: ${startActivity} to ${endActivity}`);

const sqlActivity = `
    SELECT id, date, createdAt, status, payableAmount 
    FROM Overtimes 
    WHERE date BETWEEN ? AND ?
`;

db.all(sqlActivity, [startActivity, endActivity], (err, rows) => {
    if (err) console.error(err);
    console.log(`Found ${rows.length} Overtimes in this window (Activity Mode):`);
    console.table(rows);
});

// Check ALL Overtimes to see where they are
db.all("SELECT id, date, createdAt, status FROM Overtimes ORDER BY createdAt DESC LIMIT 10", [], (err, rows) => {
    if (err) console.error(err);
    console.log("Latest 10 Overtimes (Any Date):");
    console.table(rows);
});
