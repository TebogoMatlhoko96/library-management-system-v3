const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const dataDir = path.join(__dirname, "..", "data");
fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, "library.db"));
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS books (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  isbn TEXT UNIQUE,
  year INTEGER,
  category TEXT NOT NULL,
  total_copies INTEGER NOT NULL CHECK(total_copies > 0),
  available_copies INTEGER NOT NULL CHECK(available_copies >= 0),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS loans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id INTEGER NOT NULL,
  member_id INTEGER NOT NULL,
  borrowed_date TEXT DEFAULT (date('now')),
  due_date TEXT NOT NULL,
  returned_date TEXT,
  status TEXT NOT NULL DEFAULT 'borrowed' CHECK(status IN ('borrowed','returned')),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(book_id) REFERENCES books(id),
  FOREIGN KEY(member_id) REFERENCES members(id)
);
`);

const count = db.prepare("SELECT COUNT(*) AS count FROM books").get().count;
if (count === 0) {
  const insertBook = db.prepare(`
    INSERT INTO books (title, author, isbn, year, category, total_copies, available_copies)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const insertMember = db.prepare("INSERT INTO members (name,email,phone) VALUES (?,?,?)");

  const seed = db.transaction(() => {
    insertBook.run("Clean Code", "Robert C. Martin", "9780132350884", 2008, "Programming", 4, 4);
    insertBook.run("The Pragmatic Programmer", "Andrew Hunt", "9780135957059", 2019, "Programming", 3, 3);
    insertBook.run("Atomic Habits", "James Clear", "9780735211292", 2018, "Self Development", 5, 5);
    insertBook.run("Things Fall Apart", "Chinua Achebe", "9780385474542", 1958, "Fiction", 2, 2);
    insertMember.run("Demo Member", "demo@example.com", "0712345678");
  });
  seed();
}

module.exports = db;