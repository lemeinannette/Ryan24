/* ==========================================
   FOREST INVENTORY SYSTEM - APP.JS
   ========================================== */

// --- 1. DATA MANAGEMENT ---
const getData = (key) => JSON.parse(localStorage.getItem(key)) || [];
const setData = (key, data) => localStorage.setItem(key, JSON.stringify(data));

function initSystem() {
  // 1. Base initialization (runs once)
  if (!localStorage.getItem("systemInitialized")) {
    setData("users", []);
    setData("forests", [ { id: 1, name: "Default Forest", county: "General", location: "HQ", area: 50 } ]);
    setData("inventory", []);
    localStorage.setItem("systemInitialized", "true");
  }

  // 2. Safety Check: Ensure default Species & Blocks exist
  // This fixes the "N/A" issue if dropdowns were empty
  let species = getData("species");
  if (species.length === 0) {
      setData("species", [ { id: 1, name: "Oak" }, { id: 2, name: "Pine" }, { id: 3, name: "Maple" } ]);
  }

  let blocks = getData("blocks");
  if (blocks.length === 0) {
      // Ensure we reference an existing forest ID (default to 1)
      setData("blocks", [ { id: 1, name: "Block A", forestId: 1, size: 10 } ]);
  }
}
initSystem();

// --- 2. AUTHENTICATION ---
function login() {
  const u = document.getElementById("username").value;
  const p = document.getElementById("password").value;
  const users = getData("users");

  if (users.length === 0) { alert("No users found. Please register."); window.location.href = "register.html"; return; }

  const exists = users.find(user => user.username === u && user.password === p);
  if (exists) { localStorage.setItem("loggedInUser", JSON.stringify(exists)); window.location.href = "dashboard.html"; } 
  else { alert("Invalid credentials."); }
}

function logout() { localStorage.removeItem("loggedInUser"); window.location.href = "index.html"; }

function register() {
  const fullname = document.getElementById("reg-fullname").value;
  const username = document.getElementById("reg-username").value;
  const password = document.getElementById("reg-password").value;
  const confirm = document.getElementById("reg-confirm").value;

  if (!fullname || !username || !password) { alert("All fields required."); return; }
  if (password !== confirm) { alert("Passwords do not match."); return; }

  const users = getData("users");
  if (users.find(u => u.username === username)) { alert("Username taken."); return; }

  users.push({ fullname, username, password });
  setData("users", users);
  alert("Success! Please login.");
  window.location.href = "index.html";
}

// Guard
const protectedPages = ["dashboard.html", "forests.html", "inventory.html", "species.html", "blocks.html"];
if (protectedPages.some(p => window.location.href.includes(p)) && !localStorage.getItem("loggedInUser")) {
  window.location.href = "index.html";
}

// --- 3. DASHBOARD ---
function loadDashboard() {
  if(document.getElementById("date")) document.getElementById("date").innerText = new Date().toDateString();
  
  const forests = getData("forests");
  const species = getData("species");
  const blocks = getData("blocks");
  const inventory = getData("inventory");

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
function loadForests() {
  const tbody = document.getElementById("forest-tbody"); if(!tbody) return;
  const forests = getData("forests");
  tbody.innerHTML = "";
  forests.forEach(f => {
    tbody.innerHTML += `<tr><td>${f.id}</td><td>${f.name}</td><td>${f.location}</td><td>${f.county}</td><td>${f.area}</td><td><button onclick="deleteForest(${f.id})">Delete</button></td></tr>`;
  });
}

function addForest() {
  const name = document.getElementById("fname").value;
  const location = document.getElementById("flocation").value;
  const county = document.getElementById("fcounty").value;
  const area = document.getElementById("farea").value;
  if (!name || !area) { alert("Name and Area required"); return; }

  const forests = getData("forests");
  const newId = forests.length > 0 ? forests[forests.length - 1].id + 1 : 1;
  forests.push({ id: newId, name, location, county, area: parseFloat(area) });
  setData("forests", forests);
  alert("Forest Added");
  loadForests();
  document.getElementById("fname").value = ""; document.getElementById("flocation").value = ""; document.getElementById("fcounty").value = ""; document.getElementById("farea").value = "";
}

function deleteForest(id) { if(confirm("Delete?")) { setData("forests", getData("forests").filter(f => f.id !== id)); loadForests(); } }

// --- 5. SPECIES MANAGEMENT ---
function loadSpecies() {
  const tbody = document.getElementById("spec-tbody");
  if(!tbody) return;
  const species = getData("species");
  tbody.innerHTML = "";
  species.forEach(s => {
    tbody.innerHTML += `<tr><td>${s.id}</td><td>${s.name}</td><td><button onclick="deleteSpecies(${s.id})">Delete</button></td></tr>`;
  });
}

function addSpecies() {
  const name = document.getElementById("spec-name").value.trim();
  if(!name) { alert("Enter a name"); return; }
  const species = getData("species");
  const newId = species.length > 0 ? species[species.length - 1].id + 1 : 1;
  species.push({ id: newId, name });
  setData("species", species);
  alert("Species Added");
  document.getElementById("spec-name").value = "";
  loadSpecies();
}

function deleteSpecies(id) { if(confirm("Delete?")) { setData("species", getData("species").filter(s => s.id !== id)); loadSpecies(); } }

// --- 6. BLOCKS MANAGEMENT ---
function loadBlocks() {
  // 1. Populate Forest Dropdown
  const forestSelect = document.getElementById("bforest");
  const forests = getData("forests");
  if(forestSelect) {
    forestSelect.innerHTML = forests.map(f => `<option value="${f.id}">${f.name}</option>`).join("");
  }

  // 2. Populate Table
  const tbody = document.getElementById("block-tbody");
  if(!tbody) return;
  
  const blocks = getData("blocks");
  tbody.innerHTML = "";

  blocks.forEach(b => {
    // Find Forest Name
    const forest = forests.find(f => f.id == b.forestId);
    const forestName = forest ? forest.name : "N/A";

    tbody.innerHTML += `
      <tr>
        <td>${b.id}</td>
        <td>${b.name}</td>
        <td>${forestName}</td>
        <td>${b.size || 0}</td>
        <td><button onclick="deleteBlock(${b.id})">Delete</button></td>
      </tr>`;
  });
}

function addBlock() {
  const forestId = document.getElementById("bforest").value;
  const name = document.getElementById("bname").value.trim();
  const size = document.getElementById("bsize").value;

  if(!name) { alert("Enter a block name"); return; }

  const blocks = getData("blocks");
  const newId = blocks.length > 0 ? blocks[blocks.length - 1].id + 1 : 1;
  
  blocks.push({ 
    id: newId, 
    name, 
    forestId: parseInt(forestId), 
    size: parseFloat(size) || 0 
  });
  
  setData("blocks", blocks);
  alert("Block Added");
  document.getElementById("bname").value = "";
  document.getElementById("bsize").value = "";
  loadBlocks();
}

function deleteBlock(id) { 
  if(confirm("Delete?")) { 
    setData("blocks", getData("blocks").filter(b => b.id !== id)); 
    loadBlocks(); 
  } 
}

function searchBlocks() {
  const query = document.getElementById("block-search").value.toLowerCase();
  const rows = document.querySelectorAll("#block-tbody tr");
  rows.forEach(row => {
    const text = row.innerText.toLowerCase();
    row.style.display = text.includes(query) ? "" : "none";
  });
}

// --- 7. INVENTORY & PIE CHART ---
let myChart = null;

function loadInventory() {
  // 1. Populate Dropdowns
  const blockSelect = document.getElementById("iblock");
  const speciesSelect = document.getElementById("ispecies");
  const blocks = getData("blocks");
  const species = getData("species");

  // Populate Block Dropdown
  if(blockSelect) {
    blockSelect.innerHTML = blocks.map(b => `<option value="${b.id}">${b.name}</option>`).join("");
  }
  // Populate Species Dropdown
  if(speciesSelect) {
    speciesSelect.innerHTML = species.map(s => `<option value="${s.id}">${s.name}</option>`).join("");
  }

  // 2. Load Table
  const tbody = document.getElementById("inv-tbody");
  if(!tbody) return;

  const inventory = getData("inventory");
  tbody.innerHTML = "";
  let totalTrees = 0;
  const chartData = {}; 

  inventory.forEach(rec => {
    totalTrees += parseInt(rec.count);
    
    // Aggregate for Chart
    chartData[rec.speciesName] = (chartData[rec.speciesName] || 0) + parseInt(rec.count);

    tbody.innerHTML += `
      <tr>
        <td>${rec.id}</td>
        <td>${rec.blockName || 'N/A'}</td>
        <td>${rec.speciesName || 'N/A'}</td>
        <td>${rec.count}</td>
        <td>${rec.date}</td>
        <td><button onclick="deleteRecord(${rec.id})">Delete</button></td>
      </tr>`;
  });

  if(document.getElementById("total-trees")) document.getElementById("total-trees").innerText = totalTrees;
  if(document.getElementById("total-records")) document.getElementById("total-records").innerText = inventory.length;

  renderPieChart(chartData);
}

function addRecord() {
  const blockId = document.getElementById("iblock").value;
  const speciesId = document.getElementById("ispecies").value;
  const count = document.getElementById("icount").value;
  const date = document.getElementById("idate").value;

  if(!count || !date) { alert("Fill all fields"); return; }

  // Find Names
  const blocks = getData("blocks");
  const species = getData("species");
  const blockObj = blocks.find(b => b.id == blockId);
  const speciesObj = species.find(s => s.id == speciesId);

  const inventory = getData("inventory");
  const newId = inventory.length > 0 ? (inventory[inventory.length - 1].id + 1) : 1;

  inventory.push({
    id: newId,
    blockId,
    blockName: blockObj ? blockObj.name : "N/A",
    speciesId,
    speciesName: speciesObj ? speciesObj.name : "N/A",
    count: parseInt(count),
    date
  });

  setData("inventory", inventory);
  alert("Record Added");
  loadInventory();
  document.getElementById("icount").value = ""; 
  document.getElementById("idate").value = "";
}

function deleteRecord(id) { if(confirm("Delete?")) { setData("inventory", getData("inventory").filter(r => r.id !== id)); loadInventory(); } }

function searchRecords() {
  const query = document.getElementById("inv-search").value.toLowerCase();
  const rows = document.querySelectorAll("#inv-tbody tr");
  rows.forEach(row => { row.style.display = row.innerText.toLowerCase().includes(query) ? "" : "none"; });
}

function renderPieChart(data) {
  const ctx = document.getElementById('speciesChart');
  if (!ctx) return;
  if (myChart) myChart.destroy();

  const colors = [ 'rgba(46, 125, 50, 0.8)', 'rgba(255, 193, 7, 0.8)', 'rgba(33, 150, 243, 0.8)', 'rgba(233, 30, 99, 0.8)', 'rgba(156, 39, 176, 0.8)' ];

  myChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: Object.keys(data),
      datasets: [{ data: Object.values(data), backgroundColor: colors, borderColor: '#ffffff', borderWidth: 4, hoverOffset: 15 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { font: { family: "'Segoe UI', sans-serif", size: 14 }, color: '#1b3a27', padding: 20, usePointStyle: true } } }
    }
  });
}

// --- INIT ---
window.onload = function() {
  if (document.getElementById("dash-forests")) loadDashboard();
  if (document.getElementById("forest-tbody")) loadForests();
  if (document.getElementById("spec-tbody")) loadSpecies();
  if (document.getElementById("block-tbody")) loadBlocks();
  if (document.getElementById("inv-tbody")) loadInventory();
};