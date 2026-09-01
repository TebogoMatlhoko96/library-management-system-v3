# Library Management System — Version 3

A full-stack Library Management System built as a junior software developer portfolio project.

## What changed from Version 2?

Version 1 and Version 2 were browser/localStorage applications. Version 3 moves the project to a real backend and relational database.

### Version 3 features

- Node.js + Express backend
- SQLite relational database
- REST API
- Books CRUD
- Members CRUD
- Borrow/return workflow
- Automatic available-copy tracking
- Due dates and overdue detection
- Loan history
- Dashboard statistics
- Search and filtering
- Validation and error handling
- Responsive frontend
- Seed/demo data on first database creation

## Tech stack

- HTML5
- CSS3
- Vanilla JavaScript
- Node.js
- Express
- SQLite
- better-sqlite3
- REST API

## Requirements

Install Node.js 18+.

## Run the project

```bash
npm install
npm start
```

Open:

http://localhost:3000

For development:

```bash
npm run dev
```

## Project structure

```text
library-management-system-v3/
├── data/
├── public/
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   └── app.js
│   └── index.html
├── src/
│   └── database.js
├── .gitignore
├── package.json
├── README.md
└── server.js
```

The `data/library.db` file is created automatically the first time the application runs.

## Main API endpoints

### Dashboard
- `GET /api/dashboard`

### Books
- `GET /api/books`
- `POST /api/books`
- `PUT /api/books/:id`
- `DELETE /api/books/:id`

### Members
- `GET /api/members`
- `POST /api/members`
- `PUT /api/members/:id`
- `DELETE /api/members/:id`

### Loans
- `GET /api/loans`
- `POST /api/loans`
- `POST /api/loans/:id/return`

## Portfolio improvements for Version 4

Possible next steps:
- JWT authentication and admin roles
- PostgreSQL
- React frontend
- Pagination
- Email reminders
- Automated tests
- Docker
- Deployment
- API documentation with Swagger/OpenAPI
