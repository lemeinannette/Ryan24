
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

// --- 2. AUTHENTICATION ---
async function login() {
  const u = document.getElementById("username").value.trim();
  const p = document.getElementById("password").value;
  const users = await getData("users");

  if (users.length === 0) { alert("No users found. Please register."); window.location.href = "register.html"; return; }

  let exists = users.find(user => user.id === u && user.password === p);
  
  if (exists) { 
    if (!exists.role) exists.role = "User";
    localStorage.setItem("loggedInUser", JSON.stringify(exists)); 
    window.location.href = "dashboard.html"; 
  } else { 
    alert("Invalid ID or Password."); 
  }
}

function logout() { localStorage.removeItem("loggedInUser"); window.location.href = "index.html"; }

// --- Password Strength Validator ---
function isStrongPassword(password) {
    // Min 8 chars, 1 Uppercase, 1 Number, 1 Special Char
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    return regex.test(password);
}

async function register() {
  const fullname = document.getElementById("reg-fullname").value;
  const password = document.getElementById("reg-password").value;
  const confirm = document.getElementById("reg-confirm").value;

  if (!fullname || !password) { alert("Full Name and Password required."); return; }
  if (password !== confirm) { alert("Passwords do not match."); return; }
  
  // Check Password Strength
  if (!isStrongPassword(password)) {
      alert("Password is too weak!\n\nMust be:\n- At least 8 characters\n- 1 Uppercase letter\n- 1 Number\n- 1 Special character (!@#$% etc)");
      return;
  }

  const users = await getData("users");
  const lastId = users.length > 0 ? users[users.length - 1].id : "USR-100";
  const numericPart = parseInt(lastId.split("-")[1]) + 1;
  const newId = "USR-" + numericPart;
  const role = users.length === 0 ? "Admin" : "User";

  await sendData("POST", "users", { id: newId, fullname, password, role: role });
  
  alert(`Registration Successful!\n\nYour Login ID: ${newId}\nYour Role: ${role}`);
  window.location.href = "index.html";
}

// Guard
const protectedPages = ["dashboard.html", "forests.html", "inventory.html", "species.html", "blocks.html"];
if (protectedPages.some(p => window.location.href.includes(p)) && !localStorage.getItem("loggedInUser")) {
  window.location.href = "index.html";
}

// Role Guard
const adminOnlyPages = ["forests.html", "blocks.html", "species.html"];
const currentPage = window.location.pathname.split('/').pop() || window.location.href.split('/').pop();
if (adminOnlyPages.includes(currentPage)) {
    const currentUser = JSON.parse(localStorage.getItem("loggedInUser"));
    if (currentUser && currentUser.role !== "Admin") {
        alert("Access Denied. Admin privileges required.");
        window.location.href = "dashboard.html";
    }
}

// Helper to check Admin Role
function isAdmin() {
    const user = JSON.parse(localStorage.getItem("loggedInUser"));
    return user && user.role === "Admin";
}

// --- 3. DASHBOARD ---
async function loadDashboard() {
  if(document.getElementById("date")) document.getElementById("date").innerText = new Date().toDateString();
  
  const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
  const welcomeMsg = document.getElementById("welcome-msg");
  const userRole = document.getElementById("user-role");

  if (loggedInUser) {
    if (welcomeMsg) welcomeMsg.innerText = `Welcome, ${loggedInUser.fullname}`;
    if (userRole) {
      userRole.innerText = loggedInUser.role || "User";
      userRole.style.background = loggedInUser.role === "Admin" ? "var(--green)" : "var(--text-secondary)";
    }
    if (loggedInUser.role !== "Admin") {
      document.querySelectorAll(".admin-only").forEach(el => el.style.display = "none");
    }
  }

  const forests = await getData("forests");
  const species = await getData("species");
  const blocks = await getData("blocks");
  const inventory = await getData("inventory");

  if(document.getElementById("stat-forests")) document.getElementById("stat-forests").innerText = forests.length;
  if(document.getElementById("stat-species")) document.getElementById("stat-species").innerText = species.length;
  if(document.getElementById("stat-blocks")) document.getElementById("stat-blocks").innerText = blocks.length;
  if(document.getElementById("stat-records")) document.getElementById("stat-records").innerText = inventory.length;

  const dashForests = document.getElementById("dash-forests");
  if (dashForests) {
    dashForests.innerHTML = "";
    forests.slice(-5).reverse().forEach(f => {
      dashForests.innerHTML += `<tr><td>${f.name}</td><td>${f.county}</td><td>${f.area} ha</td></tr>`;
    });
  }

  const dashInventory = document.getElementById("dash-inventory");
  if(dashInventory) {
    dashInventory.innerHTML = "";
    inventory.slice(-5).reverse().forEach(rec => {
      dashInventory.innerHTML += `<tr><td>${rec.blockName || 'N/A'}</td><td>${rec.speciesName || 'N/A'}</td><td>${rec.count}</td><td>${rec.date}</td></tr>`;
    });
  }
}

// --- 4. FORESTS ---
async function loadForests() {
  const tbody = document.getElementById("forest-tbody"); if(!tbody) return;
  const forests = await getData("forests");
  tbody.innerHTML = "";
  forests.forEach(f => {
    let actions = '';
    if(isAdmin()) {
        actions = `<button onclick="deleteForest(${f.id})">Delete</button>`;
    } else {
        actions = '<span style="color:var(--text-muted); font-size:0.8rem;">Read Only</span>';
    }
    tbody.innerHTML += `<tr><td>${f.id}</td><td>${f.name}</td><td>${f.location}</td><td>${f.county}</td><td>${f.area}</td><td>${actions}</td></tr>`;
  });

  if (!isAdmin()) {
      const card = document.querySelector('.form-card');
      if(card) card.style.display = 'none';
  }
}

async function addForest() {
  const name = document.getElementById("fname").value;
  const location = document.getElementById("flocation").value;
  const county = document.getElementById("fcounty").value;
  const area = document.getElementById("farea").value;
  if (!name || !area) { alert("Name and Area required"); return; }

  await sendData("POST", "forests", { name, location, county, area: parseFloat(area) });
  alert("Forest Added");
  loadForests();
  document.getElementById("fname").value = ""; document.getElementById("flocation").value = ""; document.getElementById("fcounty").value = ""; document.getElementById("farea").value = "";
}

async function deleteForest(id) { 
  if(confirm("Delete?")) { 
    await deleteData("forests", id);
    loadForests(); 
  } 
}

// --- 5. SPECIES MANAGEMENT ---
async function loadSpecies() {
  const tbody = document.getElementById("spec-tbody");
  if(!tbody) return;
  const species = await getData("species");
  tbody.innerHTML = "";
  species.forEach(s => {
    let actions = '';
    if(isAdmin()) {
        actions = `<button onclick="deleteSpecies(${s.id})">Delete</button>`;
    } else {
        actions = '<span style="color:var(--text-muted); font-size:0.8rem;">Read Only</span>';
    }
    tbody.innerHTML += `<tr><td>${s.id}</td><td>${s.name}</td><td>${actions}</td></tr>`;
  });

  if (!isAdmin()) {
      const card = document.querySelector('.form-card');
      if(card) card.style.display = 'none';
  }
}

async function addSpecies() {
  const name = document.getElementById("spec-name").value.trim();
  if(!name) { alert("Enter a name"); return; }
  await sendData("POST", "species", { name });
  alert("Species Added");
  document.getElementById("spec-name").value = "";
  loadSpecies();
}

async function deleteSpecies(id) { 
  if(confirm("Delete?")) { 
    await deleteData("species", id);
    loadSpecies(); 
  } 
}

// --- 6. BLOCKS MANAGEMENT ---
async function loadBlocks() {
  const forestSelect = document.getElementById("bforest");
  const forests = await getData("forests");
  if(forestSelect) {
    forestSelect.innerHTML = forests.map(f => `<option value="${f.id}">${f.name}</option>`).join("");
  }

  const tbody = document.getElementById("block-tbody");
  if(!tbody) return;
  
  const blocks = await getData("blocks");
  tbody.innerHTML = "";

  blocks.forEach(b => {
    const forest = forests.find(f => f.id == b.forestId);
    const forestName = forest ? forest.name : "N/A";
    
    let actions = '';
    if(isAdmin()) {
        actions = `<button onclick="deleteBlock(${b.id})">Delete</button>`;
    } else {
        actions = '<span style="color:var(--text-muted); font-size:0.8rem;">Read Only</span>';
    }
    
    tbody.innerHTML += `<tr><td>${b.id}</td><td>${b.name}</td><td>${forestName}</td><td>${b.size || 0}</td><td>${actions}</td></tr>`;
  });

  if (!isAdmin()) {
      const card = document.querySelector('.form-card');
      if(card) card.style.display = 'none';
  }
}

async function addBlock() {
  const forestId = document.getElementById("bforest").value;
  const name = document.getElementById("bname").value.trim();
  const size = document.getElementById("bsize").value;
  if(!name) { alert("Enter a block name"); return; }
  await sendData("POST", "blocks", { name, forestId: parseInt(forestId), size: parseFloat(size) || 0 });
  alert("Block Added");
  document.getElementById("bname").value = ""; document.getElementById("bsize").value = "";
  loadBlocks();
}

async function deleteBlock(id) { 
  if(confirm("Delete?")) { 
    await deleteData("blocks", id);
    loadBlocks(); 
  } 
}

function searchBlocks() {
  const query = document.getElementById("block-search").value.toLowerCase();
  const rows = document.querySelectorAll("#block-tbody tr");
  rows.forEach(row => { row.style.display = row.innerText.toLowerCase().includes(query) ? "" : "none"; });
}

// --- 7. INVENTORY & PIE CHART ---
let myChart = null;

async function loadInventory() {
  const tbody = document.getElementById("inv-tbody");
  if(!tbody) return;

  const inventory = await getData("inventory");
  tbody.innerHTML = "";
  let totalTrees = 0;
  const chartData = {}; 

  inventory.forEach(rec => {
    const countVal = parseInt(rec.count) || 0;
    totalTrees += countVal;
    const sName = rec.speciesName || "Unknown";
    chartData[sName] = (chartData[sName] || 0) + countVal;
    tbody.innerHTML += `<tr><td>${rec.id}</td><td>${rec.blockName || 'N/A'}</td><td>${sName}</td><td>${countVal}</td><td>${rec.date}</td><td><button onclick="deleteRecord(${rec.id})">Delete</button></td></tr>`;
  });

  if(document.getElementById("total-trees")) document.getElementById("total-trees").innerText = totalTrees;
  if(document.getElementById("total-records")) document.getElementById("total-records").innerText = inventory.length;

  renderPieChart(chartData);
}

async function addRecord() {
  const blockName = document.getElementById("iblock").value.trim();
  const speciesName = document.getElementById("ispecies").value.trim();
  const count = document.getElementById("icount").value;
  const date = document.getElementById("idate").value;

  if(!blockName || !speciesName || !count || !date) { 
      alert("Please fill in all fields."); 
      return; 
  }

  const inventory = await getData("inventory");
  const newId = inventory.length > 0 ? (inventory[inventory.length - 1].id + 1) : 1;

  const newRecord = {
      id: newId,
      blockName,
      speciesName,
      count: parseInt(count),
      date
  };

  await sendData("POST", "inventory", newRecord);
  alert("Record Added");
  await loadInventory();
  
  document.getElementById("iblock").value = ""; 
  document.getElementById("ispecies").value = "";
  document.getElementById("icount").value = ""; 
  document.getElementById("idate").value = "";
}

async function deleteRecord(id) { 
  if(confirm("Delete?")) { 
    await deleteData("inventory", id);
    await loadInventory(); 
  } 
}

function searchRecords() {
  const query = document.getElementById("inv-search").value.toLowerCase();
  const rows = document.querySelectorAll("#inv-tbody tr");
  rows.forEach(row => { row.style.display = row.innerText.toLowerCase().includes(query) ? "" : "none"; });
}

function renderPieChart(data) {
  const ctx = document.getElementById('speciesChart');
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
    'rgba(255, 87, 34, 0.8)'
  ];
  
  const backgroundColors = labels.map((_, i) => baseColors[i % baseColors.length]);

  const isDarkMode = document.body.classList.contains("dark-mode");
  const textColor = isDarkMode ? '#e2f0e8' : '#1b3a27';

  myChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: labels,
      datasets: [{
        data: values,
        backgroundColor: backgroundColors,
        borderColor: isDarkMode ? '#132a1c' : '#ffffff',
        borderWidth: 4,
        hoverOffset: 15
      }]
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
            usePointStyle: true 
          } 
        } 
      }
    }
  });
}

// --- 9. THEME TOGGLE (DARK/LIGHT MODE) ---
function loadTheme() {
  const isDark = localStorage.getItem("theme") === "dark";
  if (isDark) {
    document.body.classList.add("dark-mode");
    const toggle = document.getElementById("theme-toggle-checkbox");
    if (toggle) toggle.checked = true;
  }
}

function toggleTheme(event) {
  if (event.target.checked) {
    document.body.classList.add("dark-mode");
    localStorage.setItem("theme", "dark");
  } else {
    document.body.classList.remove("dark-mode");
    localStorage.setItem("theme", "light");
  }
  if (document.getElementById("inv-tbody")) loadInventory();
}

// --- INIT ---
const appInit = function() {
  loadTheme();
  if (document.getElementById("dash-forests")) loadDashboard();
  if (document.getElementById("forest-tbody")) loadForests();
  if (document.getElementById("spec-tbody")) loadSpecies();
  if (document.getElementById("block-tbody")) loadBlocks();
  if (document.getElementById("inv-tbody")) loadInventory();

  const toggle = document.getElementById("theme-toggle-checkbox");
  if (toggle) toggle.addEventListener("change", toggleTheme);
};

window.onload = appInit;