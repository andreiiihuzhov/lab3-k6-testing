const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// ── In-memory "database" ──────────────────────────────
let users = [
  { id: 1, username: 'alice', email: 'alice@example.com' },
  { id: 2, username: 'bob',   email: 'bob@example.com'   },
];
let nextId = 3;

// ── GET /api/health ───────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── GET /api/users ────────────────────────────────────
app.get('/api/users', (_req, res) => {
  res.json(users);
});

// ── GET /api/users/:id ────────────────────────────────
app.get('/api/users/:id', (req, res) => {
  const user = users.find(u => u.id === parseInt(req.params.id));
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// ── POST /api/users ───────────────────────────────────
app.post('/api/users', (req, res) => {
  const { username, email } = req.body;
  if (!username || !email) {
    return res.status(400).json({ error: 'username and email are required' });
  }
  const newUser = { id: nextId++, username, email };
  users.push(newUser);
  res.status(201).json(newUser);
});

// ── DELETE /api/users/:id ─────────────────────────────
app.delete('/api/users/:id', (req, res) => {
  const idx = users.findIndex(u => u.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'User not found' });
  const deleted = users.splice(idx, 1);
  res.json(deleted[0]);
});

// ── Start server ──────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
