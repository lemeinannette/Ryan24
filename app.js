// --- 1. CONFIGURATION ---
const API_URL = "http://localhost:3000";

async function getData(endpoint) {
  const res = await fetch(`${API_URL}/${endpoint}`);
  return await res.json();
}

async function sendData(method, endpoint, data = null) {
  const options = {
    method: method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (data) options.body = JSON.stringify(data);
  const res = await fetch(`${API_URL}/${endpoint}`, options);
  return await res.json();
}

async function deleteData(endpoint, id) {
  await fetch(`${API_URL}/${endpoint}/${id}`, { method: 'DELETE' });
}


// --- 2. THEME ---
function loadTheme() {
  const isDark = localStorage.getItem("theme") === "dark";
  if (isDark) document.body.classList.add("dark");

  const toggle = document.getElementById("theme-toggle-checkbox");
  if (toggle) {
    toggle.checked = isDark;
    toggle.addEventListener("change", (e) => {
      document.body.classList.toggle("dark", e.target.checked);
      localStorage.setItem("theme", e.target.checked ? "dark" : "light");
      if (document.getElementById("speciesChart")) loadInventory();
    });
  }
}


// --- 3. AUTHENTICATION ---
function togglePassword(fieldId) {
  const field = document.getElementById(fieldId);
  if (!field) return;
  field.type = field.type === "password" ? "text" : "password";
}

function isStrongPassword(password) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(password);
}

async function login() {
  const u = document.getElementById("username").value.trim();
  const p = document.getElementById("password").value;
  const users = await getData("users");

  if (users.length === 0) {
    alert("No users found. Please register.");
    window.location.href = "register.html";
    return;
  }

  const exists = users.find(user => user.id === u && user.password === p);

  if (exists) {
    if (!exists.role) exists.role = "User";
    localStorage.setItem("loggedInUser", JSON.stringify(exists));
    window.location.href = "dashboard.html";
  } else {
    alert("Invalid ID or Password.");
  }
}

function logout() {
  localStorage.removeItem("loggedInUser");
  window.location.href = "index.html";
}

async function register() {
  const fullname      = document.getElementById("reg-fullname").value.trim();
  const usernameField = document.getElementById("reg-username");
  const password      = document.getElementById("reg-password").value;
  const confirm       = document.getElementById("reg-confirm").value;

  if (!fullname || !password) { alert("Full name and password are required."); return; }
  if (password !== confirm)   { alert("Passwords do not match."); return; }

  if (!isStrongPassword(password)) {
    alert("Password is too weak!\n\nMust be:\n- At least 8 characters\n- 1 Uppercase letter\n- 1 Number\n- 1 Special character (!@#$% etc)");
    return;
  }

  const users       = await getData("users");
  const lastId      = users.length > 0 ? users[users.length - 1].id : "USR-100";
  const numericPart = parseInt(lastId.split("-")[1]) + 1;
  let newId         = "USR-" + numericPart;

  if (usernameField && usernameField.value.trim()) {
    const typed = usernameField.value.trim();
    if (users.find(u => u.id === typed)) { alert("That User ID is already taken. Please choose another."); return; }
    newId = typed;
  }

  const role = users.length === 0 ? "Admin" : "User";
  await sendData("POST", "users", { id: newId, fullname, password, role });
  alert(`Registration successful!\n\nYour Login ID: ${newId}\nYour Role: ${role}`);
  window.location.href = "index.html";
}


// --- 4. ROUTE GUARDS ---
(function routeGuard() {
  const protectedPages = ["dashboard.html", "forests.html", "inventory.html", "species.html", "blocks.html"];
  const adminOnlyPages = ["forests.html", "blocks.html", "species.html"];
  const page = window.location.pathname.split('/').pop() || window.location.href.split('/').pop();

  const loggedIn = localStorage.getItem("loggedInUser");
  if (protectedPages.includes(page) && !loggedIn) {
    window.location.href = "index.html";
    return;
  }

  if (adminOnlyPages.includes(page)) {
    const user = JSON.parse(loggedIn);
    if (user && user.role !== "Admin") {
      alert("Access denied. Admin privileges required.");
      window.location.href = "dashboard.html";
    }
  }
})();

function isAdmin() {
  const user = JSON.parse(localStorage.getItem("loggedInUser"));
  return user && user.role === "Admin";
}


// --- 5. DASHBOARD ---
async function loadDashboard() {
  const dateEl = document.getElementById("date");
  if (dateEl) dateEl.innerText = new Date().toDateString();

  const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
  if (loggedInUser) {
    const welcomeMsg = document.getElementById("welcome-msg");
    const userRole   = document.getElementById("user-role");

    if (welcomeMsg) welcomeMsg.innerText = `Welcome, ${loggedInUser.fullname}`;

    if (userRole) {
      userRole.innerText = loggedInUser.role || "User";
      // CSS classes only — no style.background
      userRole.className = loggedInUser.role === "Admin" ? "badge badge-admin" : "badge badge-user";
    }

    // Use .hidden class instead of style.display = "none"
    if (loggedInUser.role !== "Admin") {
      document.querySelectorAll(".admin-only").forEach(el => el.classList.add("hidden"));
    }
  }

  const [forests, species, blocks, inventory] = await Promise.all([
    getData("forests"),
    getData("species"),
    getData("blocks"),
    getData("inventory"),
  ]);

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
  set("stat-forests", forests.length);
  set("stat-species", species.length);
  set("stat-blocks",  blocks.length);
  set("stat-records", inventory.length);

  const dashForests = document.getElementById("dash-forests");
  if (dashForests) {
    dashForests.innerHTML = forests.slice(-5).reverse()
      .map(f => `<tr><td>${f.name}</td><td>${f.county}</td><td>${f.area} ha</td></tr>`)
      .join("");
  }

  const dashInventory = document.getElementById("dash-inventory");
  if (dashInventory) {
    dashInventory.innerHTML = inventory.slice(-5).reverse()
      .map(r => `<tr><td>${r.blockName || 'N/A'}</td><td>${r.speciesName || 'N/A'}</td><td>${r.count}</td><td>${r.date}</td></tr>`)
      .join("");
  }
}


// --- 6. FORESTS ---
async function loadForests() {
  const tbody = document.getElementById("forest-tbody");
  if (!tbody) return;

  const forests = await getData("forests");
  tbody.innerHTML = forests.map(f => {
    const actions = isAdmin()
      ? `<button onclick="deleteForest(${f.id})">Delete</button>`
      : `<span class="read-only-label">Read Only</span>`;
    return `<tr><td>${f.id}</td><td>${f.name}</td><td>${f.location}</td><td>${f.county}</td><td>${f.area}</td><td>${actions}</td></tr>`;
  }).join("");

  if (!isAdmin()) {
    const card = document.querySelector('.form-card');
    if (card) card.classList.add("hidden");
  }
}

async function addForest() {
  const name     = document.getElementById("fname").value.trim();
  const location = document.getElementById("flocation").value.trim();
  const county   = document.getElementById("fcounty").value.trim();
  const area     = document.getElementById("farea").value;

  if (!name || !area) { alert("Forest name and area are required."); return; }

  await sendData("POST", "forests", { name, location, county, area: parseFloat(area) });
  alert("Forest added.");
  ["fname", "flocation", "fcounty", "farea"].forEach(id => document.getElementById(id).value = "");
  loadForests();
}

async function deleteForest(id) {
  if (confirm("Delete this forest?")) {
    await deleteData("forests", id);
    loadForests();
  }
}

function searchForest() {
  const query = document.getElementById("forest-search").value.toLowerCase();
  document.querySelectorAll("#forest-tbody tr").forEach(row => {
    row.classList.toggle("hidden", !row.innerText.toLowerCase().includes(query));
  });
}


// --- 7. SPECIES ---
async function loadSpecies() {
  const tbody = document.getElementById("spec-tbody");
  if (!tbody) return;

  const species = await getData("species");
  tbody.innerHTML = species.map(s => {
    const actions = isAdmin()
      ? `<button onclick="deleteSpecies(${s.id})">Delete</button>`
      : `<span class="read-only-label">Read Only</span>`;
    return `<tr><td>${s.id}</td><td>${s.name}</td><td>${actions}</td></tr>`;
  }).join("");

  if (!isAdmin()) {
    const card = document.querySelector('.form-card');
    if (card) card.classList.add("hidden");
  }
}

async function addSpecies() {
  const name = document.getElementById("spec-name").value.trim();
  if (!name) { alert("Enter a species name."); return; }
  await sendData("POST", "species", { name });
  alert("Species added.");
  document.getElementById("spec-name").value = "";
  loadSpecies();
}

async function deleteSpecies(id) {
  if (confirm("Delete this species?")) {
    await deleteData("species", id);
    loadSpecies();
  }
}


// --- 8. BLOCKS ---
async function loadBlocks() {
  const forests = await getData("forests");

  const forestSelect = document.getElementById("bforest");
  if (forestSelect) {
    forestSelect.innerHTML = forests
      .map(f => `<option value="${f.id}">${f.name}</option>`)
      .join("");
  }

  const tbody = document.getElementById("block-tbody");
  if (!tbody) return;

  const blocks = await getData("blocks");
  tbody.innerHTML = blocks.map(b => {
    const forest     = forests.find(f => f.id == b.forestId);
    const forestName = forest ? forest.name : "N/A";
    const actions    = isAdmin()
      ? `<button onclick="deleteBlock(${b.id})">Delete</button>`
      : `<span class="read-only-label">Read Only</span>`;
    return `<tr><td>${b.id}</td><td>${b.name}</td><td>${forestName}</td><td>${b.size || 0}</td><td>${actions}</td></tr>`;
  }).join("");

  if (!isAdmin()) {
    const card = document.querySelector('.form-card');
    if (card) card.classList.add("hidden");
  }
}

async function addBlock() {
  const forestId = document.getElementById("bforest").value;
  const name     = document.getElementById("bname").value.trim();
  const size     = document.getElementById("bsize").value;

  if (!name) { alert("Enter a block name."); return; }

  await sendData("POST", "blocks", { name, forestId: parseInt(forestId), size: parseFloat(size) || 0 });
  alert("Block added.");
  document.getElementById("bname").value = "";
  document.getElementById("bsize").value = "";
  loadBlocks();
}

async function deleteBlock(id) {
  if (confirm("Delete this block?")) {
    await deleteData("blocks", id);
    loadBlocks();
  }
}

function searchBlocks() {
  const query = document.getElementById("block-search").value.toLowerCase();
  document.querySelectorAll("#block-tbody tr").forEach(row => {
    row.classList.toggle("hidden", !row.innerText.toLowerCase().includes(query));
  });
}


// --- 9. INVENTORY ---
let myChart = null;

async function populateInventoryDropdowns() {
  const [blocks, species] = await Promise.all([getData("blocks"), getData("species")]);

  const blockSelect   = document.getElementById("iblock");
  const speciesSelect = document.getElementById("ispecies");

  if (blockSelect) {
    blockSelect.innerHTML = '<option value="" disabled selected>Select Block</option>'
      + blocks.map(b => `<option value="${b.name}">${b.name}</option>`).join("");
  }

  if (speciesSelect) {
    speciesSelect.innerHTML = '<option value="" disabled selected>Select Species</option>'
      + species.map(s => `<option value="${s.name}">${s.name}</option>`).join("");
  }
}

async function loadInventory() {
  const tbody = document.getElementById("inv-tbody");
  if (!tbody) return;

  await populateInventoryDropdowns();

  const inventory = await getData("inventory");
  let totalTrees = 0;
  const chartData = {};

  tbody.innerHTML = inventory.map(rec => {
    const count = parseInt(rec.count) || 0;
    totalTrees += count;
    const sName = rec.speciesName || "Unknown";
    chartData[sName] = (chartData[sName] || 0) + count;
    return `<tr><td>${rec.id}</td><td>${rec.blockName || 'N/A'}</td><td>${sName}</td><td>${count}</td><td>${rec.date}</td><td><button onclick="deleteRecord(${rec.id})">Delete</button></td></tr>`;
  }).join("");

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
  set("total-trees",   totalTrees);
  set("total-records", inventory.length);

  renderPieChart(chartData);
}

async function addRecord() {
  const blockName   = document.getElementById("iblock").value;
  const speciesName = document.getElementById("ispecies").value;
  const count       = document.getElementById("icount").value;
  const date        = document.getElementById("idate").value;

  if (!blockName || !speciesName || !count || !date) {
    alert("Please fill in all fields.");
    return;
  }

  const inventory = await getData("inventory");
  const newId = inventory.length > 0 ? inventory[inventory.length - 1].id + 1 : 1;

  await sendData("POST", "inventory", { id: newId, blockName, speciesName, count: parseInt(count), date });

  alert("Record added.");
  document.getElementById("iblock").selectedIndex   = 0;
  document.getElementById("ispecies").selectedIndex = 0;
  document.getElementById("icount").value = "";
  document.getElementById("idate").value  = "";

  await loadInventory();
}

async function deleteRecord(id) {
  if (confirm("Delete this record?")) {
    await deleteData("inventory", id);
    await loadInventory();
  }
}

function searchRecords() {
  const query = document.getElementById("inv-search").value.toLowerCase();
  document.querySelectorAll("#inv-tbody tr").forEach(row => {
    row.classList.toggle("hidden", !row.innerText.toLowerCase().includes(query));
  });
}

function renderPieChart(data) {
  const ctx = document.getElementById("speciesChart");
  if (!ctx) return;
  if (myChart) myChart.destroy();

  const labels = Object.keys(data);
  const values = Object.values(data);

  const baseColors = [
    'rgba(46, 125, 50, 0.8)',
    'rgba(255, 193, 7, 0.8)',
    'rgba(33, 150, 243, 0.8)',
    'rgba(233, 30, 99, 0.8)',
    'rgba(156, 39, 176, 0.8)',
    'rgba(0, 188, 212, 0.8)',
    'rgba(255, 87, 34, 0.8)',
  ];

  const isDark    = document.body.classList.contains("dark");
  const textColor = isDark ? '#e2f0e8' : '#1b3a27';

  myChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: labels.map((_, i) => baseColors[i % baseColors.length]),
        borderColor: isDark ? '#132a1c' : '#ffffff',
        borderWidth: 4,
        hoverOffset: 15,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            font: { family: "'Segoe UI', sans-serif", size: 14 },
            color: textColor,
            padding: 20,
            usePointStyle: true,
          },
        },
      },
    },
  });
}


// --- 10. INIT ---
window.onload = function () {
  loadTheme();
  if (document.getElementById("dash-forests"))  loadDashboard();
  if (document.getElementById("forest-tbody"))  loadForests();
  if (document.getElementById("spec-tbody"))    loadSpecies();
  if (document.getElementById("block-tbody"))   loadBlocks();
  if (document.getElementById("inv-tbody"))     loadInventory();
};