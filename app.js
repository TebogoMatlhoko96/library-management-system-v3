const $ = (id) => document.getElementById(id);
let books = [], members = [];

async function api(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

document.querySelectorAll(".nav-btn").forEach(btn => {
  btn.addEventListener("click", () => showView(btn.dataset.view));
});

function showView(view) {
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.toggle("active", b.dataset.view === view));
  document.querySelectorAll(".view").forEach(v => v.classList.toggle("active", v.id === view));
  $("page-title").textContent = view[0].toUpperCase() + view.slice(1);
  if (view === "dashboard") loadDashboard();
  if (view === "books") loadBooks();
  if (view === "members") loadMembers();
  if (view === "loans") loadLoans();
}

async function loadDashboard() {
  const s = await api("/api/dashboard");
  $("total-books").textContent = s.totalBooks;
  $("available-books").textContent = s.availableBooks;
  $("total-members").textContent = s.totalMembers;
  $("active-loans").textContent = s.activeLoans;
  $("overdue-loans").textContent = s.overdueLoans;
}

async function loadBooks() {
  const params = new URLSearchParams({
    search: $("book-search").value,
    category: $("book-category").value,
    status: $("book-status").value
  });
  books = await api(`/api/books?${params}`);
  const categories = [...new Set(books.map(b => b.category))].sort();
  const selected = $("book-category").value;
  $("book-category").innerHTML = `<option value="">All categories</option>` +
    categories.map(c => `<option ${c === selected ? "selected" : ""}>${escapeHtml(c)}</option>`).join("");

  $("books-table").innerHTML = books.length ? books.map(b => `
    <tr>
      <td><strong>${escapeHtml(b.title)}</strong><br><small>${b.year || "—"}</small></td>
      <td>${escapeHtml(b.author)}</td>
      <td>${escapeHtml(b.isbn || "—")}</td>
      <td>${escapeHtml(b.category)}</td>
      <td>${b.available_copies}/${b.total_copies}</td>
      <td class="actions">
        <button onclick="editBook(${b.id})">Edit</button>
        <button class="danger-btn" onclick="deleteBook(${b.id})">Delete</button>
      </td>
    </tr>
  `).join("") : `<tr><td colspan="6" class="empty">No books found.</td></tr>`;
}

async function loadMembers() {
  const search = encodeURIComponent($("member-search").value);
  members = await api(`/api/members?search=${search}`);
  $("members-table").innerHTML = members.length ? members.map(m => `
    <tr>
      <td><strong>${escapeHtml(m.name)}</strong></td>
      <td>${escapeHtml(m.email)}</td>
      <td>${escapeHtml(m.phone || "—")}</td>
      <td>${m.active_loans}</td>
      <td class="actions">
        <button onclick="editMember(${m.id})">Edit</button>
        <button class="danger-btn" onclick="deleteMember(${m.id})">Delete</button>
      </td>
    </tr>
  `).join("") : `<tr><td colspan="5" class="empty">No members found.</td></tr>`;
}

async function loadLoans() {
  const status = $("loan-status").value;
  const loans = await api(`/api/loans?status=${status}`);
  $("loans-table").innerHTML = loans.length ? loans.map(l => {
    const overdue = Number(l.overdue) === 1;
    const state = l.status === "returned" ? "Returned" : overdue ? "Overdue" : "Borrowed";
    return `<tr>
      <td>${escapeHtml(l.book_title)}<br><small>${escapeHtml(l.author)}</small></td>
      <td>${escapeHtml(l.member_name)}</td>
      <td>${l.borrowed_date}</td>
      <td>${l.due_date}</td>
      <td><span class="badge ${state.toLowerCase()}">${state}</span></td>
      <td>${l.status === "borrowed" ? `<button class="secondary-btn" onclick="returnLoan(${l.id})">Return</button>` : "—"}</td>
    </tr>`;
  }).join("") : `<tr><td colspan="6" class="empty">No loans found.</td></tr>`;
}

function openBookModal(book = null) {
  $("modal-title").textContent = book ? "Edit Book" : "Add Book";
  $("modal-form").innerHTML = `
    <div class="form-grid">
      <div class="form-group full"><label>Title *</label><input name="title" required value="${escapeAttr(book?.title || "")}"></div>
      <div class="form-group"><label>Author *</label><input name="author" required value="${escapeAttr(book?.author || "")}"></div>
      <div class="form-group"><label>ISBN</label><input name="isbn" value="${escapeAttr(book?.isbn || "")}"></div>
      <div class="form-group"><label>Year</label><input type="number" name="year" value="${book?.year || ""}"></div>
      <div class="form-group"><label>Category *</label><input name="category" required value="${escapeAttr(book?.category || "")}"></div>
      <div class="form-group"><label>Total Copies *</label><input type="number" min="1" name="total_copies" required value="${book?.total_copies || 1}"></div>
    </div>
    <div class="form-actions"><button type="button" onclick="closeModal()">Cancel</button><button class="primary">${book ? "Save Changes" : "Add Book"}</button></div>`;
  $("modal-form").onsubmit = async e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    data.year = data.year ? Number(data.year) : null;
    data.total_copies = Number(data.total_copies);
    try {
      await api(book ? `/api/books/${book.id}` : "/api/books", { method: book ? "PUT" : "POST", body: JSON.stringify(data) });
      closeModal(); await loadBooks(); await loadDashboard();
    } catch (err) { alert(err.message); }
  };
  $("modal").classList.remove("hidden");
}

async function editBook(id) {
  const book = books.find(b => b.id === id);
  if (book) openBookModal(book);
}
async function deleteBook(id) {
  if (!confirm("Delete this book?")) return;
  try { await api(`/api/books/${id}`, { method: "DELETE" }); await loadBooks(); await loadDashboard(); }
  catch (err) { alert(err.message); }
}

function openMemberModal(member = null) {
  $("modal-title").textContent = member ? "Edit Member" : "Add Member";
  $("modal-form").innerHTML = `
    <div class="form-grid">
      <div class="form-group full"><label>Name *</label><input name="name" required value="${escapeAttr(member?.name || "")}"></div>
      <div class="form-group"><label>Email *</label><input type="email" name="email" required value="${escapeAttr(member?.email || "")}"></div>
      <div class="form-group"><label>Phone</label><input name="phone" value="${escapeAttr(member?.phone || "")}"></div>
    </div>
    <div class="form-actions"><button type="button" onclick="closeModal()">Cancel</button><button class="primary">${member ? "Save Changes" : "Add Member"}</button></div>`;
  $("modal-form").onsubmit = async e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    try {
      await api(member ? `/api/members/${member.id}` : "/api/members", { method: member ? "PUT" : "POST", body: JSON.stringify(data) });
      closeModal(); await loadMembers(); await loadDashboard();
    } catch (err) { alert(err.message); }
  };
  $("modal").classList.remove("hidden");
}

function editMember(id) {
  const member = members.find(m => m.id === id);
  if (member) openMemberModal(member);
}
async function deleteMember(id) {
  if (!confirm("Delete this member?")) return;
  try { await api(`/api/members/${id}`, { method: "DELETE" }); await loadMembers(); await loadDashboard(); }
  catch (err) { alert(err.message); }
}

async function openLoanModal() {
  const availableBooks = await api("/api/books?status=available");
  const memberList = await api("/api/members");
  $("modal-title").textContent = "Borrow Book";
  const minDate = new Date(); minDate.setDate(minDate.getDate() + 1);
  const defaultDate = minDate.toISOString().slice(0, 10);
  $("modal-form").innerHTML = `
    <div class="form-grid">
      <div class="form-group full"><label>Book *</label><select name="book_id" required>
        <option value="">Select book</option>${availableBooks.map(b => `<option value="${b.id}">${escapeHtml(b.title)} (${b.available_copies} available)</option>`).join("")}
      </select></div>
      <div class="form-group full"><label>Member *</label><select name="member_id" required>
        <option value="">Select member</option>${memberList.map(m => `<option value="${m.id}">${escapeHtml(m.name)} — ${escapeHtml(m.email)}</option>`).join("")}
      </select></div>
      <div class="form-group full"><label>Due Date *</label><input type="date" name="due_date" min="${defaultDate}" value="${defaultDate}" required></div>
    </div>
    <div class="form-actions"><button type="button" onclick="closeModal()">Cancel</button><button class="primary">Borrow Book</button></div>`;
  $("modal-form").onsubmit = async e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    try {
      await api("/api/loans", { method: "POST", body: JSON.stringify(data) });
      closeModal(); await loadLoans(); await loadDashboard(); await loadBooks();
    } catch (err) { alert(err.message); }
  };
  $("modal").classList.remove("hidden");
}

async function returnLoan(id) {
  if (!confirm("Mark this book as returned?")) return;
  try { await api(`/api/loans/${id}/return`, { method: "POST" }); await loadLoans(); await loadDashboard(); }
  catch (err) { alert(err.message); }
}

function closeModal() {
  $("modal").classList.add("hidden");
  $("modal-form").innerHTML = "";
}
$("modal").addEventListener("click", e => { if (e.target.id === "modal") closeModal(); });

["book-search", "member-search"].forEach(id => {
  $(id).addEventListener("input", () => id === "book-search" ? loadBooks() : loadMembers());
});
$("book-category").addEventListener("change", loadBooks);
$("book-status").addEventListener("change", loadBooks);
$("loan-status").addEventListener("change", loadLoans);

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;" }[c]));
}
function escapeAttr(value) { return escapeHtml(value); }

loadDashboard();