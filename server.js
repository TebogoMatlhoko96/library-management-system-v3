const express = require("express");
const cors = require("cors");
const path = require("path");
const db = require("./src/database");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

function sendError(res, status, message) {
  return res.status(status).json({ error: message });
}

// Dashboard
app.get("/api/dashboard", (req, res) => {
  const stats = {
    totalBooks: db.prepare("SELECT COUNT(*) AS count FROM books").get().count,
    availableBooks: db.prepare("SELECT COUNT(*) AS count FROM books WHERE available_copies > 0").get().count,
    totalMembers: db.prepare("SELECT COUNT(*) AS count FROM members").get().count,
    activeLoans: db.prepare("SELECT COUNT(*) AS count FROM loans WHERE status = 'borrowed'").get().count,
    overdueLoans: db.prepare("SELECT COUNT(*) AS count FROM loans WHERE status = 'borrowed' AND due_date < date('now')").get().count
  };
  res.json(stats);
});

// Books
app.get("/api/books", (req, res) => {
  const { search = "", category = "", status = "" } = req.query;
  let sql = `
    SELECT b.*,
      (SELECT COUNT(*) FROM loans l WHERE l.book_id = b.id AND l.status = 'borrowed') AS active_loans
    FROM books b
    WHERE (b.title LIKE @search OR b.author LIKE @search OR b.isbn LIKE @search)
  `;
  const params = { search: `%${search}%` };

  if (category) {
    sql += " AND b.category = @category";
    params.category = category;
  }
  if (status === "available") sql += " AND b.available_copies > 0";
  if (status === "unavailable") sql += " AND b.available_copies = 0";

  sql += " ORDER BY b.created_at DESC";
  res.json(db.prepare(sql).all(params));
});

app.post("/api/books", (req, res) => {
  const { title, author, isbn, year, category, total_copies } = req.body;
  const copies = Number(total_copies);

  if (!title || !author || !category || !Number.isInteger(copies) || copies < 1) {
    return sendError(res, 400, "Title, author, category and a valid copy count are required.");
  }

  try {
    const result = db.prepare(`
      INSERT INTO books (title, author, isbn, year, category, total_copies, available_copies)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(title.trim(), author.trim(), isbn?.trim() || null, year || null, category.trim(), copies, copies);

    res.status(201).json(db.prepare("SELECT * FROM books WHERE id = ?").get(result.lastInsertRowid));
  } catch (error) {
    if (String(error.message).includes("UNIQUE")) return sendError(res, 409, "ISBN already exists.");
    sendError(res, 500, "Could not create book.");
  }
});

app.put("/api/books/:id", (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare("SELECT * FROM books WHERE id = ?").get(id);
  if (!existing) return sendError(res, 404, "Book not found.");

  const { title, author, isbn, year, category, total_copies } = req.body;
  const newTotal = Number(total_copies);
  const borrowed = existing.total_copies - existing.available_copies;

  if (!title || !author || !category || !Number.isInteger(newTotal) || newTotal < borrowed || newTotal < 1) {
    return sendError(res, 400, `Total copies must be at least ${borrowed}.`);
  }

  try {
    db.prepare(`
      UPDATE books
      SET title=?, author=?, isbn=?, year=?, category=?, total_copies=?, available_copies=?
      WHERE id=?
    `).run(
      title.trim(), author.trim(), isbn?.trim() || null, year || null, category.trim(),
      newTotal, newTotal - borrowed, id
    );
    res.json(db.prepare("SELECT * FROM books WHERE id = ?").get(id));
  } catch (error) {
    if (String(error.message).includes("UNIQUE")) return sendError(res, 409, "ISBN already exists.");
    sendError(res, 500, "Could not update book.");
  }
});

app.delete("/api/books/:id", (req, res) => {
  const id = Number(req.params.id);
  const active = db.prepare("SELECT COUNT(*) AS count FROM loans WHERE book_id=? AND status='borrowed'").get(id).count;
  if (active) return sendError(res, 409, "This book has an active loan and cannot be deleted.");

  const result = db.prepare("DELETE FROM books WHERE id=?").run(id);
  if (!result.changes) return sendError(res, 404, "Book not found.");
  res.json({ message: "Book deleted." });
});

// Members
app.get("/api/members", (req, res) => {
  const { search = "" } = req.query;
  res.json(db.prepare(`
    SELECT m.*,
      (SELECT COUNT(*) FROM loans l WHERE l.member_id=m.id AND l.status='borrowed') AS active_loans
    FROM members m
    WHERE m.name LIKE @search OR m.email LIKE @search OR m.phone LIKE @search
    ORDER BY m.created_at DESC
  `).all({ search: `%${search}%` }));
});

app.post("/api/members", (req, res) => {
  const { name, email, phone } = req.body;
  if (!name || !email) return sendError(res, 400, "Name and email are required.");

  try {
    const result = db.prepare("INSERT INTO members (name,email,phone) VALUES (?,?,?)")
      .run(name.trim(), email.trim(), phone?.trim() || null);
    res.status(201).json(db.prepare("SELECT * FROM members WHERE id=?").get(result.lastInsertRowid));
  } catch (error) {
    if (String(error.message).includes("UNIQUE")) return sendError(res, 409, "Email already exists.");
    sendError(res, 500, "Could not create member.");
  }
});

app.put("/api/members/:id", (req, res) => {
  const id = Number(req.params.id);
  const { name, email, phone } = req.body;
  if (!name || !email) return sendError(res, 400, "Name and email are required.");

  try {
    const result = db.prepare("UPDATE members SET name=?, email=?, phone=? WHERE id=?")
      .run(name.trim(), email.trim(), phone?.trim() || null, id);
    if (!result.changes) return sendError(res, 404, "Member not found.");
    res.json(db.prepare("SELECT * FROM members WHERE id=?").get(id));
  } catch (error) {
    if (String(error.message).includes("UNIQUE")) return sendError(res, 409, "Email already exists.");
    sendError(res, 500, "Could not update member.");
  }
});

app.delete("/api/members/:id", (req, res) => {
  const id = Number(req.params.id);
  const active = db.prepare("SELECT COUNT(*) AS count FROM loans WHERE member_id=? AND status='borrowed'").get(id).count;
  if (active) return sendError(res, 409, "This member has an active loan and cannot be deleted.");

  const result = db.prepare("DELETE FROM members WHERE id=?").run(id);
  if (!result.changes) return sendError(res, 404, "Member not found.");
  res.json({ message: "Member deleted." });
});

// Loans
app.get("/api/loans", (req, res) => {
  const { status = "all" } = req.query;
  let sql = `
    SELECT l.*, b.title AS book_title, b.author, m.name AS member_name, m.email AS member_email,
      CASE WHEN l.status='borrowed' AND l.due_date < date('now') THEN 1 ELSE 0 END AS overdue
    FROM loans l
    JOIN books b ON b.id=l.book_id
    JOIN members m ON m.id=l.member_id
  `;
  const params = {};
  if (status === "borrowed") sql += " WHERE l.status='borrowed'";
  if (status === "returned") sql += " WHERE l.status='returned'";
  if (status === "overdue") sql += " WHERE l.status='borrowed' AND l.due_date < date('now')";
  sql += " ORDER BY l.created_at DESC";
  res.json(db.prepare(sql).all(params));
});

app.post("/api/loans", (req, res) => {
  const { book_id, member_id, due_date } = req.body;
  const book = db.prepare("SELECT * FROM books WHERE id=?").get(Number(book_id));
  const member = db.prepare("SELECT * FROM members WHERE id=?").get(Number(member_id));

  if (!book || !member) return sendError(res, 404, "Book or member not found.");
  if (book.available_copies < 1) return sendError(res, 409, "No available copies.");
  if (!due_date) return sendError(res, 400, "Due date is required.");

  const activeForMember = db.prepare("SELECT COUNT(*) AS count FROM loans WHERE member_id=? AND status='borrowed'").get(member.id).count;
  if (activeForMember >= 5) return sendError(res, 409, "A member can have a maximum of 5 active loans.");

  const transaction = db.transaction(() => {
    const result = db.prepare(`
      INSERT INTO loans (book_id, member_id, due_date, status)
      VALUES (?, ?, ?, 'borrowed')
    `).run(book.id, member.id, due_date);
    db.prepare("UPDATE books SET available_copies=available_copies-1 WHERE id=?").run(book.id);
    return result.lastInsertRowid;
  });

  const loanId = transaction();
  res.status(201).json(db.prepare(`
    SELECT l.*, b.title AS book_title, m.name AS member_name
    FROM loans l JOIN books b ON b.id=l.book_id JOIN members m ON m.id=l.member_id
    WHERE l.id=?
  `).get(loanId));
});

app.post("/api/loans/:id/return", (req, res) => {
  const id = Number(req.params.id);
  const loan = db.prepare("SELECT * FROM loans WHERE id=?").get(id);
  if (!loan) return sendError(res, 404, "Loan not found.");
  if (loan.status === "returned") return sendError(res, 409, "Loan has already been returned.");

  const transaction = db.transaction(() => {
    db.prepare("UPDATE loans SET status='returned', returned_date=date('now') WHERE id=?").run(id);
    db.prepare("UPDATE books SET available_copies=available_copies+1 WHERE id=?").run(loan.book_id);
  });
  transaction();

  res.json({ message: "Book returned successfully." });
});

// Seed endpoint intentionally disabled in production; sample data is inserted on first database creation.
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Library Management System V3 running at http://localhost:${PORT}`);
});