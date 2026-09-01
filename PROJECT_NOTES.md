# V3 implementation notes

This version intentionally keeps the frontend lightweight (HTML/CSS/JavaScript) while upgrading the application architecture to a real Node.js/Express + SQLite backend.

Demo data is created automatically when the database has no books.

Business rules included:
- Cannot borrow a book with zero available copies.
- A member can have at most 5 active loans.
- A book cannot be deleted while it has an active loan.
- A member cannot be deleted while they have an active loan.
- Reducing total book copies below the number currently borrowed is blocked.
- ISBN and member email are unique.
