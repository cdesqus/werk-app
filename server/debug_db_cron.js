const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'database.sqlite');
console.log(`Using DB: ${dbPath}`);

const db = new sqlite3.Database(dbPath);

console.log("--- CHECKING SETTINGS ---");
db.all("SELECT * FROM Settings", [], (err, rows) => {
    if (err) console.error(err);
    else console.table(rows);
});

console.log("--- CHECKING ADMINS ---");
db.all("SELECT id, name, email, role FROM Users WHERE role IN ('admin', 'super_admin')", [], (err, rows) => {
    if (err) console.error(err);
    else console.table(rows);
});

console.log("--- CHECKING PENDING ITEMS ---");
db.get("SELECT COUNT(*) as count FROM Overtimes WHERE status = 'Pending'", (err, row) => console.log('Pending Overtimes:', row?.count));
db.get("SELECT COUNT(*) as count FROM Claims WHERE status = 'Pending'", (err, row) => console.log('Pending Claims:', row?.count));
db.get("SELECT COUNT(*) as count FROM Leaves WHERE status = 'Pending'", (err, row) => console.log('Pending Leaves:', row?.count));
