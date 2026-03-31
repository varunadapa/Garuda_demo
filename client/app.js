/* ============================================
   Garuda — Main Application JS
   ============================================ */

const API = '';
let DATA = {};
let currentPage = 'dashboard';
let chartInstances = {};

// ---- Helpers ----
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const el = (tag, cls, html) => {
  const d = document.createElement(tag);
  if (cls) d.className = cls;
  if (html) d.innerHTML = html;
  return d;
};

function fmt(n) {
  if (n === null || n === undefined) return '—';
  if (typeof n === 'number') {
    if (n >= 10000000) return (n / 10000000).toFixed(1) + ' Cr';
    if (n >= 100000) return (n / 100000).toFixed(1) + ' L';
    if (n >= 1000) return n.toLocaleString('en-IN');
    return n.toString();
  }
  return n;
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function statusBadge(status) {
  if (!status) return '<span class="badge badge-unknown">Unknown</span>';
  const s = status.toLowerCase();
  if (s.includes('arrest')) return '<span class="badge badge-arrested">Arrested</span>';
  if (s.includes('abscond')) return '<span class="badge badge-absconding">Absconding</span>';
  if (s.includes('notice') || s.includes('issued')) return '<span class="badge badge-notice">Issued Notice</span>';
  if (s.includes('surrender')) return '<span class="badge badge-arrested">Surrendered</span>';
  return '<span class="badge badge-unknown">' + status + '</span>';
}

function roleBadge(role) {
  if (!role) return '';
  const map = {
    organizer_kingpin: 'badge-kingpin', peddler: 'badge-peddler',
    supplier: 'badge-supplier', transporter: 'badge-notice',
    consumer: 'badge-non-commercial', financier: 'badge-absconding',
    harbourer: 'badge-partial', manufacturer: 'badge-drug'
  };
  const cls = map[role] || 'badge-drug';
  return `<span class="badge ${cls}">${role.replace('_', ' ')}</span>`;
}

function initials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
}

// ---- Data Loading ----
async function loadData() {
  if (window.MOCK_DATA) {
    const endpoints = ['dashboard', 'crimes', 'persons', 'accuseds', 'hierarchy', 'integrations', 'interrogations', 'chargesheets', 'seizures', 'networks'];
    endpoints.forEach(e => {
      DATA[e] = window.MOCK_DATA[e] || {};
    });
    DATA['integration_details'] = window.MOCK_DATA['integration_details'] || {};
  } else {
    console.error("MOCK_DATA not loaded");
  }
}

// ---- Navigation ----
function navigate(page, subData) {
  // Destroy old charts
  Object.values(chartInstances).forEach(c => { try { c.destroy(); } catch (e) { } });
  chartInstances = {};

  currentPage = page;
  const content = $('#page-content');
  content.innerHTML = '';

  // Update nav
  $$('.nav-item').forEach(n => n.classList.remove('active'));
  const navEl = $(`[data-page="${page}"]`);
  if (navEl) navEl.classList.add('active');

  // Render page
  const titles = {
    dashboard: 'Command Center', firs: 'FIR Management', accuseds: 'Accused Search',
    profiles: 'Criminal Profiles', chargesheets: 'Chargesheets',
    interrogations: 'Interrogation Reports', seizures: 'Drug Seizures & Properties',
    integrations: 'Database Integrations', networks: 'Network Intelligence',
    'Garuda-ai': 'Garuda LLM',
    firDetail: 'FIR Detail', profileDetail: 'Criminal Profile', irDetail: 'Interrogation Report',
    integrationDetail: 'Integration Detail', networkDetail: 'Network Analysis'
  };
  $('#page-title').textContent = titles[page] || 'Garuda';

  const renderers = {
    dashboard: renderDashboard, firs: renderFIRs, accuseds: renderAccuseds,
    profiles: renderProfiles, chargesheets: renderChargesheets,
    interrogations: renderInterrogations, seizures: renderSeizures,
    integrations: renderIntegrations, networks: renderNetworks,
    'Garuda-ai': renderGarudaAI,
    firDetail: () => renderFIRDetail(subData),
    profileDetail: () => renderProfileDetail(subData),
    irDetail: () => renderIRDetail(subData),
    integrationDetail: () => renderIntegrationDetail(subData),
    networkDetail: () => renderNetworkDetail(subData)
  };

  if (renderers[page]) renderers[page]();
}

// ---- Pages ----

// === DASHBOARD (Command Center) ===
function renderDashboard() {
  const d = DATA.dashboard;
  const s = d.stats || {};
  const content = $('#page-content');

  let html = '<div class="dashboard-container">';

  // Page Intro
  html += `<div class="dash-intro">
    <div>
      <h1>Command Center</h1>
      <p>Real-time unified criminal intelligence dashboard</p>
    </div>
    <div class="dash-user">
      <div>
        <div style="font-size:0.85rem;font-weight:600;color:var(--text-primary)">DCP K. Sharma</div>
        <div style="font-size:0.75rem;color:var(--text-muted)">System Administrator</div>
      </div>
      <div class="dash-user-avatar">KS</div>
    </div>
  </div>`;

  // Live Ticker
  html += '<div class="banner-ticker"><div class="ticker-track">';
  const tickerItems = d.recentActivity || [];
  tickerItems.forEach(a => {
    html += `<span class="ticker-item">● ${a.text}</span>`;
  });
  // Duplicate items for seamless loop if enough items
  if (tickerItems.length > 0) {
    tickerItems.forEach(a => {
      html += `<span class="ticker-item">● ${a.text}</span>`;
    });
  }
  html += '</div></div>';

  // Stats Grid
  const sList = [
    { icon: 'fas fa-file-alt', val: '12,847', label: 'Active FIRs', badge: '↑ 8.3% this month', type: 'up' },
    { icon: 'fas fa-user', val: '3,492', label: 'Criminal Profiles', badge: '↑ 150 new', type: 'up' },
    { icon: 'fas fa-check', val: '89.2%', label: 'Case Clearance', badge: '↑ 3.1%', type: 'up' },
    { icon: 'fas fa-exclamation-triangle', val: '247', label: 'Active Alerts', badge: '↓ 12 today', type: 'down' },
    { icon: 'fas fa-link', val: '14/18', label: 'DB Integrations', badge: '4 pending', type: 'info' },
    { icon: 'fas fa-wallet', val: '₹24.5Cr', label: 'Seizure Value MTD', badge: '↑ ₹3.2Cr', type: 'up' },
    { icon: 'fas fa-phone', val: '89,456', label: 'CDR Records', badge: '↑ 2,340', type: 'up' },
    { icon: 'fas fa-bullseye', val: '38', label: 'Most Wanted', badge: '↓ 5 apprehended', type: 'down' }
  ];

  html += '<div class="stats-grid">';
  sList.forEach(st => {
    const badgeClass = st.type === 'up' ? 'badge-arrested' : st.type === 'down' ? 'badge-absconding' : 'badge-undertrial';
    html += `<div class="stat-card2">
      <div class="stat-icon-wrapper neutral"><i class="${st.icon}"></i></div>
      <div class="stat-value-large">${st.val}</div>
      <div class="stat-label-bold">${st.label}</div>
      <div class="stat-badge-pill ${badgeClass}">${st.badge}</div>
    </div>`;
  });
  html += '</div>';

  // Middle Row: Top Wanted + District Intelligence
  html += '<div class="grid-sidebar gap-24 mb-24">';

  // Top Wanted
  html += `<div class="card">
    <div class="card-header">
      <div class="card-title"><i class="fas fa-crosshairs" style="color:var(--accent-red);margin-right:8px"></i>Top Wanted Criminals</div>
      <a href="#" style="font-size:0.8rem;color:var(--accent-blue);text-decoration:none;font-weight:600">View All →</a>
    </div>
    <div class="wanted-list2">`;
  (d.topWanted || []).forEach((w, i) => {
    html += `<div class="wanted-item2">
      <div style="width:28px;height:28px;border-radius:50%;background:var(--accent-blue);color:white;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.85rem">${i + 1}</div>
      <div style="width:48px;height:48px;border-radius:8px;background:#cbd5e1;flex-shrink:0"></div>
      <div style="flex:1">
        <div style="font-weight:700;color:var(--text-primary);font-size:0.95rem">${w.name}</div>
        <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:6px">Alias: "${w.alias}"</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          ${(w.badges || []).map(b => `<span style="padding:2px 8px;border-radius:4px;font-size:0.65rem;font-weight:700;${b === 'Drug Kingpin' || b === 'Murder' || b === 'Trafficking' ? 'color:#ef4444;background:#fee2e2' : b.includes('FIR') ? 'color:#3b82f6;background:#eff6ff' : 'color:#eab308;background:#fef9c3'}">${b}</span>`).join('')}
        </div>
      </div>
      <div style="text-align:right">
        <div style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px">Reward</div>
        <div style="font-size:1.2rem;font-weight:800;color:#10b981">${w.reward}</div>
      </div>
    </div>`;
  });
  html += '</div></div>';

  // District Intelligence
  html += `<div class="card">
    <div class="card-header">
      <div class="card-title"><i class="fas fa-map-marker-alt" style="color:#ef4444;margin-right:8px"></i>District Intelligence</div>
      <a href="#" style="font-size:0.8rem;color:var(--accent-blue);text-decoration:none;font-weight:600">Details →</a>
    </div>
    <div class="district-grid-mini">`;
  (d.districtWise || []).forEach(dw => {
    const colMap = { 'High': '#ef4444', 'Medium': '#eab308', 'Low': '#10b981' };
    const col = colMap[dw.severity] || '#3b82f6';
    const pct = dw.severity === 'High' ? '85%' : dw.severity === 'Medium' ? '55%' : '25%';
    html += `<div class="district-mini-card">
      <div style="font-weight:700;font-size:0.85rem;color:var(--text-primary);margin-bottom:8px">${dw.district}</div>
      <div style="height:6px;background:#e2e8f0;border-radius:3px;margin-bottom:8px;overflow:hidden"><div style="height:100%;width:${pct};background:${col};border-radius:3px"></div></div>
      <div style="display:flex;justify-content:space-between;font-size:0.75rem;font-weight:600"><span style="color:var(--text-muted)">${dw.firs} Cases</span><span style="color:${col}">${dw.severity}</span></div>
    </div>`;
  });
  html += '</div></div></div>'; // end Middle Row

  // Bottom Row: Charts
  html += `<div class="grid-2 gap-24 mb-24">
    <div class="card">
      <div class="card-header">
        <div class="card-title">Monthly FIR Trends</div>
        <div class="card-subtitle">Last 6 months</div>
      </div>
      <div class="chart-container" style="height:300px"><canvas id="chart-firs"></canvas></div>
    </div>
    <div class="card">
      <div class="card-header">
        <div class="card-title">Drug Seizure Breakdown</div>
        <div class="card-subtitle">Value in Crores</div>
      </div>
      <div class="chart-container" style="height:300px"><canvas id="chart-drugs"></canvas></div>
    </div>
  </div>`;

  // Recent Seizures
  html += `<div class="card mb-24">
    <div class="card-header">
      <div class="card-title"><i class="fas fa-briefcase" style="color:#854d0e;margin-right:8px"></i>Major Recent Seizures</div>
      <a href="#" style="font-size:0.8rem;color:var(--accent-blue);text-decoration:none;font-weight:600">View All →</a>
    </div>
    <div class="data-table-wrapper">
      <table class="data-table" style="min-width:600px">
        <thead>
          <tr>
            <th style="background:transparent">TYPE</th>
            <th style="background:transparent">QUANTITY</th>
            <th style="background:transparent">VALUE</th>
            <th style="background:transparent">LOCATION</th>
            <th style="background:transparent">DATE</th>
            <th style="background:transparent">STATUS</th>
          </tr>
        </thead>
        <tbody>`;
  (d.recentSeizuresHighlight || []).forEach(sz => {
    const stCol = sz.status === 'In Progress' ? 'color:#ef4444;background:#fee2e2' : 'color:#3b82f6;background:#eff6ff';
    html += `<tr>
      <td style="font-weight:600;color:var(--text-primary)"><span style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:6px;background:#f1f5f9;margin-right:10px">${sz.icon}</span>${sz.type}</td>
      <td style="color:var(--text-secondary)">${sz.quantity}</td>
      <td style="font-weight:800;color:var(--text-primary)">${sz.value}</td>
      <td style="color:var(--text-secondary);font-size:0.8rem">${sz.location}</td>
      <td style="color:var(--text-secondary);font-size:0.8rem">${sz.date}</td>
      <td><span style="padding:4px 10px;border-radius:20px;font-size:0.7rem;font-weight:700;${stCol}">${sz.status}</span></td>
    </tr>`;
  });
  html += '</tbody></table></div></div>';

  html += '</div>'; // end dashboard-container
  content.innerHTML = html;

  requestAnimationFrame(() => {
    renderFIRChart(d.monthlyFIRs || []);
    renderDrugChart(d.drugSeizures || []);
  });
}

function renderFIRChart(data) {
  const ctx = document.getElementById('chart-firs');
  if (!ctx) return;
  chartInstances.firs = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.map(d => d.month),
      datasets: [{
        label: 'FIRs Registered',
        data: data.map(d => d.count),
        backgroundColor: 'rgba(37, 99, 235, 0.7)',
        borderColor: '#2563eb',
        borderWidth: 2, borderRadius: 4, barPercentage: 0.6
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { ticks: { color: '#64748b', font: { weight: '600' } }, grid: { color: 'rgba(0,0,0,0.05)' } },
        x: { ticks: { color: '#64748b', font: { weight: '600' } }, grid: { display: false } }
      }
    }
  });
}

function renderDrugChart(data) {
  const ctx = document.getElementById('chart-drugs');
  if (!ctx) return;
  chartInstances.drugs = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.map(d => d.drug),
      datasets: [
        { label: 'Worth (₹ Cr)', data: data.map(d => d.worth), backgroundColor: 'rgba(79, 70, 229, 0.8)', borderColor: '#4f46e5', borderWidth: 2, borderRadius: 4, barPercentage: 0.5 },
        { label: 'Cases', data: data.map(d => d.cases), backgroundColor: 'rgba(16, 185, 129, 0.8)', borderColor: '#10b981', borderWidth: 2, borderRadius: 4, barPercentage: 0.5 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#8892b0' } } },
      scales: {
        y: { ticks: { color: '#64748b', font: { weight: '600' } }, grid: { color: 'rgba(0,0,0,0.05)' } },
        x: { ticks: { color: '#64748b', font: { weight: '600' } }, grid: { display: false } }
      }
    }
  });
}

function renderStatusPie(data) {
  const ctx = document.getElementById('chart-status');
  if (!ctx || !data) return;
  const colors = ['#10b981', '#f43f5e', '#f59e0b', '#6366f1', '#94a3b8'];
  chartInstances.status = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: Object.keys(data),
      datasets: [{ data: Object.values(data), backgroundColor: colors, borderWidth: 0 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '65%',
      plugins: { legend: { position: 'right', labels: { color: '#8892b0', padding: 10, font: { size: 11 } } } }
    }
  });
}

// === FIR MANAGEMENT ===
function renderFIRs() {
  const crimes = DATA.crimes || [];
  const content = $('#page-content');

  // Filter Bar
  let html = '<div class="filter-bar"><input class="filter-input" placeholder="Search FIR number, crime ID..." id="fir-search" />'
    + '<select class="filter-select" id="fir-status-filter"><option value="">All Status</option><option value="Under Investigation">Under Investigation</option><option value="Chargesheet Filed">Chargesheet Filed</option><option value="Convicted">Convicted</option><option value="Under Trial">Under Trial</option></select>'
    + '<select class="filter-select" id="fir-class-filter"><option value="">All Classification</option><option value="Commercial Quantity">Commercial</option><option value="Non-Commercial Quantity">Non-Commercial</option><option value="Heinous">Heinous</option></select>'
    + '<button class="btn btn-primary btn-sm" id="fir-apply"><i class="fas fa-filter"></i> Filter</button></div>';

  // Table inside a card
  html += '<div class="card mt-24"><div class="card-header"><div class="card-title"><i class="fas fa-file-alt" style="color:var(--accent-blue);margin-right:8px"></i>FIR Management</div><div class="card-subtitle">Showing all FIR records and statuses</div></div>'
    + '<div class="data-table-wrapper"><table class="data-table" id="fir-table"><thead><tr>'
    + '<th>FIR Number</th><th>Police Station</th><th>Date</th><th>Acts & Sections</th><th>Classification</th><th>Accused</th><th>Drug Type</th><th>Status</th><th></th></tr></thead><tbody>';

  crimes.forEach(c => {
    const drugs = (c.drug_details || []).map(d => d.name).join(', ') || '—';
    const classBadge = c.class_classification === 'Commercial Quantity' ? 'badge-commercial' : c.class_classification === 'Heinous' ? 'badge-absconding' : 'badge-non-commercial';
    html += `<tr onclick="navigate('firDetail','${c.crime_id}')">
      <td style="color:var(--accent-cyan);font-weight:600">${c.fir_num}</td>
      <td>${c.ps_name}<br><span style="font-size:0.7rem;color:var(--text-muted)">${c.dist_name}</span></td>
      <td>${fmtDate(c.fir_date)}</td>
      <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${c.acts_sections}">${c.acts_sections}</td>
      <td><span class="badge ${classBadge}">${c.class_classification || '—'}</span></td>
      <td>${c.no_of_accused}</td>
      <td>${drugs.split(', ').map(d => `<span class="badge badge-drug">${d}</span>`).join(' ')}</td>
      <td>${statusBadgeFIR(c.case_status)}</td>
      <td><i class="fas fa-chevron-right" style="color:var(--text-muted)"></i></td></tr>`;
  });
  html += '</tbody></table></div></div>';
  content.innerHTML = html;

  // Filter logic
  $('#fir-apply').onclick = () => filterFIRs();
  $('#fir-search').addEventListener('keyup', filterFIRs);
}

function statusBadgeFIR(status) {
  if (!status) return '<span class="badge badge-unknown">—</span>';
  if (status.includes('Investigation')) return '<span class="badge badge-pending">Under Investigation</span>';
  if (status.includes('Chargesheet') || status.includes('Filed')) return '<span class="badge badge-filed">Chargesheet Filed</span>';
  if (status.includes('Convicted')) return '<span class="badge badge-convicted">Convicted</span>';
  if (status.includes('Trial')) return '<span class="badge badge-undertrial">Under Trial</span>';
  return '<span class="badge badge-unknown">' + status + '</span>';
}

function filterFIRs() {
  const search = ($('#fir-search') || {}).value?.toLowerCase() || '';
  const statusFilter = ($('#fir-status-filter') || {}).value || '';
  const classFilter = ($('#fir-class-filter') || {}).value || '';
  const rows = $$('#fir-table tbody tr');
  rows.forEach(row => {
    const text = row.textContent.toLowerCase();
    const matchSearch = !search || text.includes(search);
    const matchStatus = !statusFilter || text.includes(statusFilter.toLowerCase());
    const matchClass = !classFilter || text.includes(classFilter.toLowerCase());
    row.style.display = (matchSearch && matchStatus && matchClass) ? '' : 'none';
  });
}

// === FIR DETAIL ===
function renderFIRDetail(crimeId) {
  const crime = (DATA.crimes || []).find(c => c.crime_id === crimeId);
  if (!crime) { navigate('firs'); return; }

  const content = $('#page-content');
  let html = '<button class="back-btn" onclick="navigate(\'firs\')"><i class="fas fa-arrow-left"></i> Back to FIR List</button>';

  html += '<div class="detail-panel"><div class="detail-header"><div style="display:flex;justify-content:space-between;align-items:center">'
    + `<div><h2 style="font-size:1.5rem;font-weight:800">FIR ${crime.fir_num}</h2><p style="color:var(--text-muted);margin-top:4px">${crime.crime_id}</p></div>`
    + `<div style="text-align:right">${statusBadgeFIR(crime.case_status)} <span class="badge ${crime.class_classification === 'Commercial Quantity' ? 'badge-commercial' : 'badge-non-commercial'}" style="margin-left:8px">${crime.class_classification || ''}</span></div>`
    + '</div></div><div class="detail-body">';

  // Case Info
  html += '<div class="detail-section"><div class="detail-section-title">Case Information</div><div class="detail-grid">'
    + field('Police Station', crime.ps_name + ' — ' + crime.dist_name)
    + field('FIR Date', fmtDate(crime.fir_date))
    + field('FIR Type', crime.fir_type)
    + field('Major Head', crime.major_head)
    + field('Minor Head', crime.minor_head)
    + field('Crime Type', crime.crime_type)
    + field('IO Name', crime.io_name)
    + field('IO Rank', crime.io_rank)
    + field('Acts & Sections', crime.acts_sections)
    + '</div></div>';

  // Brief Facts
  html += `<div class="detail-section"><div class="detail-section-title">Brief Facts</div><p style="color:var(--text-secondary);line-height:1.6;font-size:0.88rem">${crime.brief_facts || '—'}</p></div>`;

  // Accused
  if (crime.accused_details && crime.accused_details.length) {
    html += '<div class="detail-section"><div class="detail-section-title">Accused Persons (' + crime.accused_details.length + ')</div><div class="data-table-wrapper"><table class="data-table"><thead><tr><th>Code</th><th>Name</th><th>Role</th><th>Status</th></tr></thead><tbody>';
    crime.accused_details.forEach(a => {
      html += `<tr><td style="color:var(--accent-cyan);font-weight:600">${a.personCode}</td><td style="color:var(--text-primary);font-weight:500">${a.fullName}</td><td>${roleBadge(a.accusedType)}</td><td>${statusBadge(a.status)}</td></tr>`;
    });
    html += '</tbody></table></div></div>';
  }

  // Drugs
  if (crime.drug_details && crime.drug_details.length) {
    html += '<div class="detail-section"><div class="detail-section-title">Drug Seizure Details</div><div class="data-table-wrapper"><table class="data-table"><thead><tr><th>Drug</th><th>Quantity (Kg)</th><th>Worth (₹)</th><th>Commercial</th></tr></thead><tbody>';
    crime.drug_details.forEach(d => {
      html += `<tr><td><span class="badge badge-drug">${d.name}</span></td><td>${d.quantityKg} Kg</td><td>₹${fmt(d.worth)}</td><td>${d.isCommercial ? '<span class="badge badge-commercial">Yes</span>' : '<span class="badge badge-non-commercial">No</span>'}</td></tr>`;
    });
    html += '</tbody></table></div></div>';
  }

  // Chargesheet & Disposal
  html += '<div class="detail-section"><div class="detail-section-title">Chargesheet & Disposal</div><div class="detail-grid">'
    + field('Chargesheet Status', crime.chargesheet_status || 'Pending');
  if (crime.disposal_details && crime.disposal_details.length) {
    crime.disposal_details.forEach(d => {
      html += field('Disposal', d.disposalType) + field('Case Status', d.caseStatus);
    });
  }
  html += '</div></div>';

  // Action buttons
  html += `<div style="display:flex;gap:10px;margin-top:16px">
    <button class="btn btn-primary" onclick="alert('Opening FIR copy PDF...')"><i class="fas fa-file-pdf"></i> View FIR Copy</button>
    <button class="btn btn-ghost" onclick="alert('Generating Interrogation Report...')"><i class="fas fa-print"></i> Generate IR</button>
    <button class="btn btn-ghost" onclick="alert('Opening Garuda Link Analysis...')"><i class="fas fa-project-diagram"></i> Link Analysis</button>
    <button class="btn btn-ghost" onclick="alert('Drafting Unocross email...')"><i class="fas fa-envelope"></i> Unocross Draft</button>
  </div>`;

  html += '</div></div>';
  content.innerHTML = html;
}

function field(label, value) {
  return `<div class="detail-field"><div class="label">${label}</div><div class="value">${value || '—'}</div></div>`;
}

// === ACCUSED SEARCH ===
function renderAccuseds() {
  const content = $('#page-content');
  const acc = DATA.accuseds || [];

  let html = '<div class="filter-bar">'
    + '<input class="filter-input" placeholder="Search name, alias..." id="acc-search" />'
    + '<select class="filter-select" id="acc-status"><option value="">All Status</option><option value="Arrested">Arrested</option><option value="Absconding">Absconding</option><option value="Issued Notice">Issued Notice</option></select>'
    + '<select class="filter-select" id="acc-drug"><option value="">All Drug Types</option><option value="GANJA">Ganja</option><option value="MDMA">MDMA</option><option value="COCAINE">Cocaine</option><option value="HEROIN">Heroin</option></select>'
    + '<select class="filter-select" id="acc-role"><option value="">All Roles</option><option value="organizer_kingpin">Kingpin</option><option value="peddler">Peddler</option><option value="supplier">Supplier</option><option value="transporter">Transporter</option><option value="consumer">Consumer</option></select>'
    + '<button class="btn btn-primary btn-sm" id="acc-apply"><i class="fas fa-search"></i> Search</button></div>';

  html += '<div class="card mt-24"><div class="card-header"><div class="card-title"><i class="fas fa-users" style="color:var(--accent-blue);margin-right:8px"></i>Accused Search</div><div class="card-subtitle">Search and filter across the unified accused database</div></div>'
    + '<div class="data-table-wrapper"><table class="data-table" id="acc-table"><thead><tr>'
    + '<th>Name</th><th>Alias</th><th>FIR</th><th>PS</th><th>Role</th><th>Drug Type</th><th>Cases</th><th>Status</th><th></th></tr></thead><tbody>';

  acc.forEach(a => {
    const drugs = (a.drug_type || []).map(d => `<span class="badge badge-drug">${d}</span>`).join(' ') || '—';
    html += `<tr onclick="navigate('profileDetail','${a.person_id || ''}')">
      <td style="color:var(--text-primary);font-weight:600">${a.full_name}</td>
      <td style="color:var(--text-muted)">${a.alias || '—'}</td>
      <td style="color:var(--accent-cyan)">${a.fir_num}</td>
      <td>${a.ps_name}<br><span style="font-size:0.7rem;color:var(--text-muted)">${a.district}</span></td>
      <td>${roleBadge(a.accused_type)}</td>
      <td>${drugs}</td>
      <td style="text-align:center;font-weight:700">${a.no_of_crimes}</td>
      <td>${statusBadge(a.accused_status)}</td>
      <td><i class="fas fa-chevron-right" style="color:var(--text-muted)"></i></td></tr>`;
  });
  html += '</tbody></table></div></div>';
  content.innerHTML = html;

  $('#acc-apply').onclick = () => filterAccuseds();
  $('#acc-search').addEventListener('keyup', filterAccuseds);
}

function filterAccuseds() {
  const search = ($('#acc-search') || {}).value?.toLowerCase() || '';
  const statusF = ($('#acc-status') || {}).value || '';
  const drugF = ($('#acc-drug') || {}).value || '';
  const roleF = ($('#acc-role') || {}).value || '';
  const rows = $$('#acc-table tbody tr');
  rows.forEach(row => {
    const text = row.textContent.toLowerCase();
    row.style.display = (
      (!search || text.includes(search)) &&
      (!statusF || text.includes(statusF.toLowerCase())) &&
      (!drugF || text.includes(drugF.toLowerCase())) &&
      (!roleF || text.includes(roleF.replace('_', ' ').toLowerCase()))
    ) ? '' : 'none';
  });
}

// === CRIMINAL PROFILES ===
function renderProfiles() {
  const persons = DATA.persons || [];
  const content = $('#page-content');

  let html = '<div class="filter-bar"><input class="filter-input" placeholder="Search by name, alias, district..." id="prof-search" style="width:300px" /><button class="btn btn-primary btn-sm" onclick="filterProfiles()"><i class="fas fa-search"></i> Search</button></div>';

  html += '<div class="integration-grid">';
  persons.forEach(p => {
    const drugs = (p.associated_drugs || []).map(d => `<span class="badge badge-drug">${d}</span>`).join(' ');
    html += `<div class="integration-card" onclick="navigate('profileDetail','${p.person_id}')">
      <div class="ic-header">
        <div style="display:flex;align-items:center;gap:12px">
          <div class="user-avatar" style="width:44px;height:44px;font-size:0.9rem">${initials(p.full_name)}</div>
          <div><div class="ic-name">${p.full_name}</div><div class="ic-dept">${p.alias ? 'Alias: ' + p.alias : ''} • ${p.occupation || ''}</div></div>
        </div>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin:8px 0">${drugs}</div>
      <div class="ic-stats">
        <div class="ic-stat"><div class="num">${p.no_of_crimes}</div><div class="lbl">Total Cases</div></div>
        <div class="ic-stat"><div class="num">${p.arrest_count}</div><div class="lbl">Arrests</div></div>
        <div class="ic-stat"><div class="num">${p.age || '—'}</div><div class="lbl">Age</div></div>
        <div class="ic-stat"><div class="num">${p.present_district || '—'}</div><div class="lbl">District</div></div>
      </div>
    </div>`;
  });
  html += '</div>';
  content.innerHTML = html;
  $('#prof-search').addEventListener('keyup', filterProfiles);
}

function filterProfiles() {
  const search = ($('#prof-search') || {}).value?.toLowerCase() || '';
  $$('.integration-card').forEach(card => {
    card.style.display = (!search || card.textContent.toLowerCase().includes(search)) ? '' : 'none';
  });
}

// === PROFILE DETAIL ===
function renderProfileDetail(personId) {
  const person = (DATA.persons || []).find(p => p.person_id === personId);
  if (!person) { navigate('profiles'); return; }
  const content = $('#page-content');

  let html = '<button class="back-btn" onclick="navigate(\'profiles\')"><i class="fas fa-arrow-left"></i> Back to Profiles</button>';

  html += '<div class="detail-panel">';

  // Profile Header
  html += `<div class="profile-header">
    <div class="profile-avatar">${initials(person.full_name)}</div>
    <div>
      <div class="profile-name">${person.full_name}</div>
      <div class="profile-subtitle">${person.alias ? 'Alias: ' + person.alias : ''} • ${person.person_id}</div>
      <div class="profile-meta">
        <span class="profile-tag"><i class="fas fa-map-marker-alt"></i> ${person.present_district || '—'}, ${person.present_state_ut || ''}</span>
        <span class="profile-tag"><i class="fas fa-birthday-cake"></i> Age ${person.age || '—'}</span>
        <span class="profile-tag"><i class="fas fa-phone"></i> ${person.phone_number || '—'}</span>
        <span class="profile-tag"><i class="fas fa-briefcase"></i> ${person.occupation || '—'}</span>
      </div>
      <div style="margin-top:8px">${(person.associated_drugs || []).map(d => `<span class="badge badge-drug">${d}</span>`).join(' ')}</div>
    </div>
    <div style="margin-left:auto;text-align:right">
      <div style="font-size:2.5rem;font-weight:900;color:var(--accent-red)">${person.no_of_crimes}</div>
      <div style="font-size:0.78rem;color:var(--text-muted)">Total Cases</div>
    </div>
  </div>`;

  html += '<div class="detail-body">';

  // Personal Info
  html += '<div class="detail-section"><div class="detail-section-title">Personal Information</div><div class="detail-grid">'
    + field('Full Name', person.full_name) + field('Alias', person.alias)
    + field('Date of Birth', fmtDate(person.date_of_birth)) + field('Age', person.age)
    + field('Gender', person.gender) + field('Relation', (person.relation_type || '') + ' ' + (person.relative_name || ''))
    + field('Occupation', person.occupation) + field('Education', person.education_qualification)
    + field('Caste', person.caste) + field('Religion', person.religion)
    + field('Nationality', person.nationality) + field('Domicile', person.domicile_classification)
    + field('Phone', person.phone_number) + '</div></div>';

  // Addresses
  html += '<div class="detail-section"><div class="detail-section-title">Address Information</div><div class="grid-2 gap-16">'
    + `<div class="card"><div class="card-title" style="margin-bottom:8px"><i class="fas fa-home" style="color:var(--accent-cyan);margin-right:6px"></i>Present Address</div><p style="color:var(--text-secondary);font-size:0.85rem">${person.present_address || '—'}</p></div>`
    + `<div class="card"><div class="card-title" style="margin-bottom:8px"><i class="fas fa-map" style="color:var(--accent-purple);margin-right:6px"></i>Permanent Address</div><p style="color:var(--text-secondary);font-size:0.85rem">${person.permanent_address || '—'}</p></div>`
    + '</div></div>';

  // Physical Features
  if (person.physical_features) {
    const pf = person.physical_features;
    html += '<div class="detail-section"><div class="detail-section-title">Physical Features</div><div class="detail-grid">';
    Object.entries(pf).forEach(([k, v]) => { html += field(k.replace(/([A-Z])/g, ' $1').trim(), v); });
    html += '</div></div>';
  }

  // Crime History
  if (person.crimes && person.crimes.length) {
    html += '<div class="detail-section"><div class="detail-section-title">Crime History (' + person.crimes.length + ' Cases)</div><div class="data-table-wrapper"><table class="data-table"><thead><tr><th>FIR Number</th><th>Crime ID</th><th>Date</th><th>Action</th></tr></thead><tbody>';
    person.crimes.forEach(c => {
      html += `<tr><td style="color:var(--accent-cyan);font-weight:600">${c.firNumber}</td><td>${c.id}</td><td>${fmtDate(c.crimeRegDate)}</td>
        <td><button class="btn btn-sm btn-ghost" onclick="event.stopPropagation();navigate('firDetail','${c.id}')">View FIR</button></td></tr>`;
    });
    html += '</tbody></table></div></div>';
  }

  // Identity Documents
  if (person.identity_documents && person.identity_documents.length) {
    html += '<div class="detail-section"><div class="detail-section-title">Identity Documents</div><div class="detail-grid">';
    person.identity_documents.forEach(id => { html += field(id.identityType, id.identityNumber); });
    html += '</div></div>';
  }

  // === Associates & Gang Links ===
  if (person.associates && person.associates.length) {
    html += '<div class="detail-section"><div class="detail-section-title"><i class="fas fa-users" style="color:var(--accent-red);margin-right:8px"></i>Known Associates & Gang Links</div>';
    html += '<div class="data-table-wrapper"><table class="data-table"><thead><tr><th>Name</th><th>Alias</th><th>Gang / Network</th><th>Relationship</th><th>Shared Cases</th><th>Status</th></tr></thead><tbody>';
    person.associates.forEach(a => {
      html += `<tr><td style="color:var(--text-primary);font-weight:600">${a.name}</td><td style="color:var(--text-muted)">${a.alias || '—'}</td><td><span class="badge badge-drug">${a.gang}</span></td><td>${a.relation}</td><td style="text-align:center;font-weight:700">${a.sharedCases}</td><td>${statusBadge(a.status)}</td></tr>`;
    });
    html += '</tbody></table></div></div>';
  }

  // === Call History (CDR) ===
  if (person.call_history && person.call_history.length) {
    html += '<div class="detail-section"><div class="detail-section-title"><i class="fas fa-phone-alt" style="color:var(--accent-cyan);margin-right:8px"></i>Call Detail Records (CDR)</div>';
    html += '<div class="data-table-wrapper"><table class="data-table"><thead><tr><th>Direction</th><th>Caller</th><th>Called</th><th>Duration</th><th>Tower</th><th>Date & Time</th></tr></thead><tbody>';
    person.call_history.forEach(c => {
      const dirIcon = c.type === 'Outgoing' ? '<i class="fas fa-arrow-up" style="color:var(--accent-green)"></i>' : '<i class="fas fa-arrow-down" style="color:var(--accent-amber)"></i>';
      html += `<tr><td>${dirIcon} ${c.type}</td><td style="font-weight:500">${c.callerName}<br><span style="font-size:0.72rem;color:var(--text-muted)">${c.caller}</span></td><td style="font-weight:500">${c.calledName}<br><span style="font-size:0.72rem;color:var(--text-muted)">${c.called}</span></td><td>${c.duration}</td><td style="font-size:0.78rem">${c.tower}</td><td style="font-size:0.78rem">${c.date}</td></tr>`;
    });
    html += '</tbody></table></div></div>';
  }

  // === Financial Intelligence ===
  if (person.financial_intel && person.financial_intel.length) {
    html += '<div class="detail-section"><div class="detail-section-title"><i class="fas fa-university" style="color:var(--accent-purple);margin-right:8px"></i>Financial Intelligence (Unocross)</div>';
    html += '<div class="data-table-wrapper"><table class="data-table"><thead><tr><th>Account</th><th>Bank</th><th>Type</th><th>Amount</th><th>Date</th><th>Flagged</th></tr></thead><tbody>';
    person.financial_intel.forEach(f => {
      html += `<tr><td style="font-family:monospace">${f.account}</td><td>${f.bank}</td><td>${f.type}</td><td style="font-weight:700;color:var(--accent-amber)">${f.amount}</td><td>${f.date}</td><td>${f.flagged ? '<span class="badge badge-absconding">⚠ Suspicious</span>' : '<span class="badge badge-arrested">Normal</span>'}</td></tr>`;
    });
    html += '</tbody></table></div></div>';
  }

  // === Vehicle Links ===
  if (person.vehicles && person.vehicles.length) {
    html += '<div class="detail-section"><div class="detail-section-title"><i class="fas fa-car" style="color:var(--accent-teal);margin-right:8px"></i>Vehicle Links (RTA)</div>';
    html += '<div class="data-table-wrapper"><table class="data-table"><thead><tr><th>Reg. Number</th><th>Vehicle</th><th>Chassis</th><th>Insurance</th><th>Linked FIR</th></tr></thead><tbody>';
    person.vehicles.forEach(v => {
      html += `<tr><td style="color:var(--accent-cyan);font-weight:600">${v.regNo}</td><td>${v.vehicle}</td><td style="font-family:monospace;font-size:0.75rem">${v.chassis}</td><td>${v.insurance}</td><td>${v.linkedFir}</td></tr>`;
    });
    html += '</tbody></table></div></div>';
  }

  // Single export button
  html += `<div style="display:flex;gap:10px;margin-top:16px"><button class="btn btn-primary" onclick="alert('Generating full criminal profile PDF...')"><i class="fas fa-file-pdf"></i> Export Full Profile</button></div>`;

  html += '</div></div>';
  content.innerHTML = html;
}

// === INTERROGATION REPORTS ===
function renderInterrogations() {
  const irs = DATA.interrogations || [];
  const content = $('#page-content');

  let html = '<div class="card"><div class="card-header"><div class="card-title"><i class="fas fa-clipboard-list" style="color:var(--accent-blue);margin-right:8px"></i>Interrogation Reports</div><div class="card-subtitle">Comprehensive field interrogation and modus operandi records</div></div>'
    + '<div class="data-table-wrapper"><table class="data-table"><thead><tr>'
    + '<th>IR ID</th><th>Accused</th><th>FIR</th><th>PS</th><th>MO Summary</th><th>Drug Details</th><th>Date</th><th></th></tr></thead><tbody>';

  irs.forEach(ir => {
    const mo = (ir.modus_operandi || []).map(m => m.modusOperandi).join('; ').substring(0, 80);
    const drugs = (ir.drug_details || []).map(d => d.typeOfDrug).join(', ');
    html += `<tr onclick="navigate('irDetail','${ir.interrogation_report_id}')">
      <td style="color:var(--accent-cyan);font-weight:600">${ir.interrogation_report_id}</td>
      <td style="color:var(--text-primary);font-weight:500">${ir.person_name}</td>
      <td>${ir.fir_num}</td><td>${ir.ps_name}</td>
      <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${mo}">${mo || '—'}...</td>
      <td>${drugs.split(', ').map(d => `<span class="badge badge-drug">${d}</span>`).join(' ')}</td>
      <td>${fmtDate(ir.date_created)}</td>
      <td><i class="fas fa-chevron-right" style="color:var(--text-muted)"></i></td></tr>`;
  });
  html += '</tbody></table></div></div>';
  content.innerHTML = html;
}

// === IR DETAIL ===
function renderIRDetail(irId) {
  const ir = (DATA.interrogations || []).find(i => i.interrogation_report_id === irId);
  if (!ir) { navigate('interrogations'); return; }
  const content = $('#page-content');

  let html = '<button class="back-btn" onclick="navigate(\'interrogations\')"><i class="fas fa-arrow-left"></i> Back to IRs</button>';
  html += '<div class="detail-panel"><div class="detail-header"><h2 style="font-size:1.3rem;font-weight:800">' + ir.interrogation_report_id + '</h2><p style="color:var(--text-muted);margin-top:4px">Accused: <strong style="color:var(--text-primary)">' + ir.person_name + '</strong> • FIR: ' + ir.fir_num + ' • PS: ' + ir.ps_name + '</p></div><div class="detail-body">';

  // Physical
  if (ir.physical) {
    html += '<div class="detail-section"><div class="detail-section-title">Physical Description</div><div class="detail-grid">';
    Object.entries(ir.physical).forEach(([k, v]) => { html += field(k.replace(/([A-Z])/g, ' $1'), v); });
    html += '</div></div>';
  }

  // Socio
  if (ir.socio) {
    html += '<div class="detail-section"><div class="detail-section-title">Socio-Economic Profile</div><div class="detail-grid">';
    Object.entries(ir.socio).forEach(([k, v]) => { html += field(k.replace(/([A-Z])/g, ' $1'), v); });
    html += '</div></div>';
  }

  // Family
  if (ir.family_history && ir.family_history.length) {
    html += '<div class="detail-section"><div class="detail-section-title">Family History</div><div class="data-table-wrapper"><table class="data-table"><thead><tr><th>Name</th><th>Relation</th><th>Criminal Background</th><th>Alive</th></tr></thead><tbody>';
    ir.family_history.forEach(f => {
      html += `<tr><td style="color:var(--text-primary)">${f.name}</td><td>${f.relation}</td><td>${f.criminalBackground ? '<span class="badge badge-absconding">Yes</span>' : '<span class="badge badge-arrested">No</span>'}</td><td>${f.isAlive ? 'Yes' : 'No'}</td></tr>`;
    });
    html += '</tbody></table></div></div>';
  }

  // Associates
  if (ir.associates && ir.associates.length) {
    html += '<div class="detail-section"><div class="detail-section-title">Known Associates</div><div class="data-table-wrapper"><table class="data-table"><thead><tr><th>Name</th><th>Gang/Network</th><th>Relation</th></tr></thead><tbody>';
    ir.associates.forEach(a => {
      html += `<tr><td style="color:var(--text-primary)">${a.name}</td><td>${a.gang || '—'}</td><td>${a.relation}</td></tr>`;
    });
    html += '</tbody></table></div></div>';
  }

  // Modus Operandi
  if (ir.modus_operandi && ir.modus_operandi.length) {
    html += '<div class="detail-section"><div class="detail-section-title">Modus Operandi</div>';
    ir.modus_operandi.forEach(m => {
      html += `<div class="card mb-16"><div style="display:flex;gap:10px;margin-bottom:8px"><span class="badge badge-drug">${m.crimeHead}</span><span class="badge badge-notice">${m.crimeSubHead}</span></div><p style="color:var(--text-secondary);line-height:1.6">${m.modusOperandi}</p></div>`;
    });
    html += '</div>';
  }

  // Drug Details
  if (ir.drug_details && ir.drug_details.length) {
    html += '<div class="detail-section"><div class="detail-section-title">Drug Details</div><div class="data-table-wrapper"><table class="data-table"><thead><tr><th>Drug</th><th>Quantity</th><th>Purchase Amount</th><th>Payment</th><th>Transport</th></tr></thead><tbody>';
    ir.drug_details.forEach(d => {
      html += `<tr><td><span class="badge badge-drug">${d.typeOfDrug}</span></td><td>${d.quantity}</td><td>${d.purchaseAmount}</td><td>${d.modeOfPayment}</td><td>${d.modeOfTransport}</td></tr>`;
    });
    html += '</tbody></table></div></div>';
  }

  // Financial
  if (ir.financial_history && ir.financial_history.length) {
    html += '<div class="detail-section"><div class="detail-section-title">Financial History</div><div class="data-table-wrapper"><table class="data-table"><thead><tr><th>Bank</th><th>Account</th><th>Branch</th><th>UPI</th></tr></thead><tbody>';
    ir.financial_history.forEach(f => {
      html += `<tr><td>${f.bankName}</td><td>${f.accountNumber}</td><td>${f.branchName}</td><td>${f.upiId || '—'}</td></tr>`;
    });
    html += '</tbody></table></div></div>';
  }

  // SIM Details
  if (ir.sim_details && ir.sim_details.length) {
    html += '<div class="detail-section"><div class="detail-section-title">SIM / Phone Details</div><div class="data-table-wrapper"><table class="data-table"><thead><tr><th>Phone</th><th>IMEI</th><th>TrueCaller Name</th></tr></thead><tbody>';
    ir.sim_details.forEach(s => {
      html += `<tr><td style="color:var(--accent-cyan)">${s.phoneNumber}</td><td>${s.imei}</td><td>${s.trueCallerName}</td></tr>`;
    });
    html += '</tbody></table></div></div>';
  }

  // Previous Offences
  if (ir.previous_offences && ir.previous_offences.length) {
    html += '<div class="detail-section"><div class="detail-section-title">Previous Offences Confessed</div><div class="data-table-wrapper"><table class="data-table"><thead><tr><th>Crime No</th><th>Section</th><th>Arrest Date</th><th>PS</th></tr></thead><tbody>';
    ir.previous_offences.forEach(o => {
      html += `<tr><td>${o.crimeNum}</td><td>${o.lawSection}</td><td>${fmtDate(o.arrestDate)}</td><td>${o.psCode}</td></tr>`;
    });
    html += '</tbody></table></div></div>';
  }

  html += `<div style="display:flex;gap:10px;margin-top:16px">
    <button class="btn btn-primary" onclick="alert('Generating IR PDF...')"><i class="fas fa-file-pdf"></i> Export IR</button>
    <button class="btn btn-ghost" onclick="alert('Auto-filling IR template...')"><i class="fas fa-magic"></i> Auto-Fill Template</button>
  </div>`;

  html += '</div></div>';
  content.innerHTML = html;
}

// === DRUG SEIZURES ===
function renderSeizures() {
  const seizures = DATA.seizures || [];
  const drugs = (DATA.dashboard.drugSeizures || []);
  const content = $('#page-content');

  // Drug Stats
  let html = '<div class="stats-grid" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr))">';
  drugs.forEach(d => {
    html += `<div class="stat-card"><div class="stat-icon purple"><i class="fas fa-pills"></i></div>
      <div class="stat-info"><div class="stat-value">${d.cases}</div><div class="stat-label">${d.drug}</div>
      <div class="stat-change up">₹${d.worth} Cr worth</div></div></div>`;
  });
  html += '</div>';

  // Seizures Table
  html += '<div class="card mt-24"><div class="card-header"><div class="card-title">Recent MO Seizures</div></div>';
  html += '<div class="data-table-wrapper"><table class="data-table"><thead><tr>'
    + '<th>MO ID</th><th>Type</th><th>Description</th><th>Seized From</th><th>Location</th><th>Date</th><th>FIR</th></tr></thead><tbody>';

  seizures.forEach(s => {
    const crime = (DATA.crimes || []).find(c => c.crime_id === s.crime_id);
    html += `<tr onclick="navigate('firDetail','${s.crime_id}')">
      <td style="color:var(--accent-cyan);font-weight:600">${s.seq_no}</td>
      <td><span class="badge badge-drug">${s.sub_type || s.type}</span></td>
      <td style="max-width:250px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${s.description}">${s.description}</td>
      <td>${s.seized_from}</td>
      <td>${s.pos_city}, ${s.pos_district}</td>
      <td>${fmtDate(s.seized_at)}</td>
      <td style="color:var(--accent-cyan)">${crime ? crime.fir_num : '—'}</td></tr>`;
  });
  html += '</tbody></table></div></div>';
  content.innerHTML = html;
}

// === CHARGESHEETS ===
function renderChargesheets() {
  const cs = DATA.chargesheets || [];
  const content = $('#page-content');

  let html = '<div class="card"><div class="card-header"><div class="card-title"><i class="fas fa-gavel" style="color:var(--accent-blue);margin-right:8px"></i>Chargesheets Filed</div><div class="card-subtitle">Court filing records and disposal tracking</div></div>'
    + '<div class="data-table-wrapper"><table class="data-table"><thead><tr>'
    + '<th>CS Number</th><th>FIR</th><th>PS</th><th>Date</th><th>Court</th><th>Accused</th><th>Sections</th><th>Status</th><th>Court Case</th></tr></thead><tbody>';

  cs.forEach(c => {
    const sections = (c.acts || []).map(a => a.section + ' ' + a.actDescription).join(', ');
    html += `<tr>
      <td style="color:var(--accent-cyan);font-weight:600">${c.chargesheet_no}</td>
      <td>${c.fir_num}</td><td>${c.ps_name}</td>
      <td>${fmtDate(c.chargesheet_date)}</td>
      <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${c.court_name}</td>
      <td>${(c.accused_names || []).join(', ')}</td>
      <td style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${sections}</td>
      <td>${c.status === 'Convicted' ? '<span class="badge badge-convicted">Convicted</span>' : '<span class="badge badge-undertrial">Under Trial</span>'}</td>
      <td>${c.court_case_no || '—'}</td></tr>`;
  });
  html += '</tbody></table></div></div>';
  content.innerHTML = html;
}

// === DATABASE INTEGRATIONS ===
function renderIntegrations() {
  const intg = DATA.integrations || [];
  const content = $('#page-content');

  // Summary stats
  const connected = intg.filter(i => i.status === 'connected').length;
  const partial = intg.filter(i => i.status === 'partial').length;
  const pending = intg.filter(i => i.status === 'pending').length;
  const totalRecords = intg.reduce((sum, i) => sum + (i.recordsIngested || 0), 0);

  let html = '<div class="stats-grid" style="grid-template-columns:repeat(4,1fr)">'
    + `<div class="stat-card"><div class="stat-icon green"><i class="fas fa-plug"></i></div><div class="stat-info"><div class="stat-value">${connected}</div><div class="stat-label">Connected</div></div></div>`
    + `<div class="stat-card"><div class="stat-icon amber"><i class="fas fa-exclamation-circle"></i></div><div class="stat-info"><div class="stat-value">${partial}</div><div class="stat-label">Partial</div></div></div>`
    + `<div class="stat-card"><div class="stat-icon red"><i class="fas fa-times-circle"></i></div><div class="stat-info"><div class="stat-value">${pending}</div><div class="stat-label">Pending</div></div></div>`
    + `<div class="stat-card"><div class="stat-icon cyan"><i class="fas fa-database"></i></div><div class="stat-info"><div class="stat-value">${fmt(totalRecords)}</div><div class="stat-label">Total Records</div></div></div>`
    + '</div>';

  // Integration Cards
  html += '<div class="integration-grid">';
  intg.forEach(i => {
    const statusBdg = i.status === 'connected' ? 'badge-connected' : i.status === 'partial' ? 'badge-partial' : 'badge-offline';
    const statusLabel = i.status === 'connected' ? 'Connected' : i.status === 'partial' ? 'Partial' : 'Pending';
    const healthCls = i.health >= 90 ? 'green' : i.health >= 60 ? 'amber' : 'red';

    html += `<div class="integration-card" onclick="navigate('integrationDetail','${i.id}')" style="cursor:pointer">
      <div class="ic-header"><div><div class="ic-name">${i.system}</div><div class="ic-dept">${i.department} • ${i.type}</div></div><span class="badge ${statusBdg}">${statusLabel}</span></div>
      <div style="font-size:0.75rem;color:var(--text-muted)">Mode: ${i.mode}</div>
      <div class="ic-stats">
        <div class="ic-stat"><div class="num">${fmt(i.recordsIngested)}</div><div class="lbl">Records</div></div>
        <div class="ic-stat"><div class="num">${i.health}%</div><div class="lbl">Health</div></div>
        <div class="ic-stat"><div class="num" style="font-size:0.85rem">${i.lastSync ? fmtDate(i.lastSync) : 'Never'}</div><div class="lbl">Last Sync</div></div>
      </div>
      <div class="health-bar"><div class="fill ${healthCls}" style="width:${i.health}%"></div></div>
      <div style="text-align:center;margin-top:8px;font-size:0.72rem;color:var(--accent-cyan)"><i class="fas fa-eye"></i> Click to view records</div>
    </div>`;
  });
  html += '</div>';
  content.innerHTML = html;
}

// === INTEGRATION DETAIL ===
function renderIntegrationDetail(integrationId) {
  const details = DATA.integration_details || {};
  const detail = details[String(integrationId)];
  const intg = (DATA.integrations || []).find(i => i.id == integrationId);
  const content = $('#page-content');
  let html = '<button class="back-btn" onclick="navigate(\'integrations\')"><i class="fas fa-arrow-left"></i> Back to Integrations</button>';
  if (!detail) { html += '<div class="card" style="text-align:center;padding:60px"><i class="fas fa-database" style="font-size:3rem;color:var(--text-muted);margin-bottom:16px"></i><h3>No data available</h3></div>'; content.innerHTML = html; return; }
  const statusBdg = intg && intg.status === 'connected' ? 'badge-connected' : intg && intg.status === 'partial' ? 'badge-partial' : 'badge-offline';
  html += `<div class="card mb-24"><div style="display:flex;justify-content:space-between;align-items:center"><div><h2 style="font-size:1.4rem;font-weight:800;color:var(--text-primary)">${detail.system}</h2><p style="color:var(--text-secondary);margin-top:4px;font-size:0.85rem;max-width:700px">${detail.description}</p></div><div style="text-align:right">${intg ? `<span class="badge ${statusBdg}">${intg.status}</span><div style="margin-top:6px;font-size:0.78rem;color:var(--text-muted)">${fmt(intg.recordsIngested)} records</div>` : ''}</div></div></div>`;
  if (detail.pendingMessage) {
    html += `<div class="card" style="text-align:center;padding:48px"><i class="fas fa-clock" style="font-size:2.5rem;color:var(--accent-amber);margin-bottom:16px"></i><h3 style="color:var(--text-primary)">${detail.system} — Integration Pending</h3><p style="color:var(--text-secondary);margin-top:8px">${detail.pendingMessage}</p></div>`;
  } else if (detail.columns && detail.records && detail.records.length) {
    html += '<div class="card"><div class="card-header"><div class="card-title">Sample Records</div><div class="card-subtitle">' + detail.records.length + ' records shown</div></div><div class="data-table-wrapper"><table class="data-table"><thead><tr>';
    detail.columns.forEach(col => { html += `<th>${col}</th>`; });
    html += '</tr></thead><tbody>';
    detail.records.forEach(row => { html += '<tr>'; row.forEach((cell, idx) => { html += `<td ${idx === 0 ? 'style="color:var(--accent-cyan);font-weight:600"' : ''}>${cell}</td>`; }); html += '</tr>'; });
    html += '</tbody></table></div></div>';
  }
  content.innerHTML = html;
}

// === NETWORK INTELLIGENCE ===
function renderNetworks() {
  const netData = DATA.networks || {};
  const criminals = netData.criminals || [];
  const content = $('#page-content');
  let html = '<div class="card mb-24"><div class="card-header"><div class="card-title"><i class="fas fa-project-diagram" style="color:var(--accent-cyan);margin-right:8px"></i>Criminal Network Intelligence</div><div class="card-subtitle">Select a criminal to view their full network, gang links, call history, and contact analysis</div></div><div class="network-selector">';
  criminals.forEach(c => {
    const riskCls = c.riskLevel === 'critical' ? 'badge-absconding' : 'badge-notice';
    html += `<div class="network-select-card" onclick="navigate('networkDetail','${c.id}')" style="cursor:pointer"><div class="user-avatar" style="width:48px;height:48px;font-size:1rem;background:var(--gradient-${c.riskLevel === 'critical' ? 'danger' : 'primary'})">${initials(c.name)}</div><div style="flex:1"><div style="font-weight:700;font-size:1rem;color:var(--text-primary)">${c.name}</div><div style="font-size:0.78rem;color:var(--text-muted)">Alias: ${c.alias} • ${c.gang}</div></div><div><span class="badge ${riskCls}">Risk: ${c.riskLevel.toUpperCase()}</span><div style="font-size:0.72rem;color:var(--text-muted);margin-top:4px;text-align:right">${c.associates.length} associates</div></div></div>`;
  });
  html += '</div></div>';
  if (!criminals.length) html += '<div class="card" style="text-align:center;padding:60px"><i class="fas fa-project-diagram" style="font-size:3rem;color:var(--text-muted)"></i><h3>No network data</h3></div>';
  content.innerHTML = html;
}

// === NETWORK DETAIL ===
function renderNetworkDetail(criminalId) {
  const netData = DATA.networks || {};
  const criminal = (netData.criminals || []).find(c => c.id === criminalId);
  if (!criminal) { navigate('networks'); return; }
  const content = $('#page-content');
  let html = '<button class="back-btn" onclick="navigate(\'networks\')"><i class="fas fa-arrow-left"></i> Back to Network Intelligence</button>';
  const riskCls = criminal.riskLevel === 'critical' ? 'badge-absconding' : 'badge-notice';
  html += `<div class="profile-header"><div class="profile-avatar" style="background:var(--gradient-danger)">${initials(criminal.name)}</div><div><div class="profile-name">${criminal.name}</div><div class="profile-subtitle">Alias: ${criminal.alias} • ${criminal.id}</div><div class="profile-meta"><span class="badge ${riskCls}">Risk: ${criminal.riskLevel.toUpperCase()}</span><span class="badge badge-drug">${criminal.gang}</span></div></div><div style="margin-left:auto;text-align:right"><div style="font-size:2rem;font-weight:900;color:var(--accent-red)">${criminal.associates.length}</div><div style="font-size:0.78rem;color:var(--text-muted)">Associates</div></div></div>`;

  // Network Graph
  html += '<div class="card mb-24"><div class="card-header"><div class="card-title"><i class="fas fa-project-diagram" style="color:var(--accent-cyan);margin-right:8px"></i>Network Graph</div></div><div class="network-graph">';
  html += `<div class="net-center"><div class="user-avatar" style="width:64px;height:64px;font-size:1.2rem;background:var(--gradient-danger)">${initials(criminal.name)}</div><div style="font-size:0.75rem;font-weight:700;margin-top:4px">${criminal.name}</div></div>`;
  const positions = [{ x: 20, y: 15 }, { x: 75, y: 10 }, { x: 10, y: 55 }, { x: 85, y: 50 }, { x: 30, y: 85 }, { x: 70, y: 80 }, { x: 50, y: 8 }, { x: 15, y: 35 }, { x: 80, y: 30 }];
  criminal.associates.forEach((a, i) => {
    const pos = positions[i % positions.length];
    const colMap = { 'Arrested': 'var(--accent-green)', 'Absconding': 'var(--accent-red)', 'Issued Notice': 'var(--accent-amber)' };
    const col = colMap[a.status] || 'var(--accent-purple)';
    html += `<div class="net-node" style="left:${pos.x}%;top:${pos.y}%;border-color:${col}"><div class="user-avatar" style="width:40px;height:40px;font-size:0.7rem;border:2px solid ${col}">${initials(a.name)}</div><div style="font-size:0.68rem;font-weight:600;margin-top:2px;white-space:nowrap">${a.name}</div><div style="font-size:0.6rem;color:var(--text-muted)">${a.relation}</div></div>`;
  });
  html += '</div></div>';

  // Gang Profile
  if (criminal.gangProfile) {
    const gp = criminal.gangProfile;
    html += '<div class="card mb-24"><div class="card-header"><div class="card-title"><i class="fas fa-skull-crossbones" style="color:var(--accent-red);margin-right:8px"></i>Gang Profile: ' + gp.name + '</div></div><div class="detail-grid">';
    html += field('Leader', gp.leader) + field('Active Members', gp.activeMembers) + field('Territory', gp.territory) + field('Primary Drugs', gp.primaryDrugs.join(', ')) + field('Total Cases', gp.totalCases) + field('Est. Turnover', gp.estimatedTurnover);
    html += '</div><div class="detail-section-title" style="margin-top:16px">Activity Timeline</div><div class="activity-feed">';
    gp.activityTimeline.forEach(t => { html += `<div class="activity-item"><div class="activity-dot high"></div><div class="activity-text"><strong>${t.date}:</strong> ${t.event}</div></div>`; });
    html += '</div></div>';
  }

  // Call History
  if (criminal.callHistory && criminal.callHistory.length) {
    html += '<div class="card mb-24"><div class="card-header"><div class="card-title"><i class="fas fa-phone-alt" style="color:var(--accent-cyan);margin-right:8px"></i>Call History (CDR)</div></div><div class="data-table-wrapper"><table class="data-table"><thead><tr><th>Dir</th><th>Caller</th><th>Called</th><th>Duration</th><th>Tower</th><th>Date</th></tr></thead><tbody>';
    criminal.callHistory.forEach(c => {
      const icon = c.type === 'Outgoing' ? '<i class="fas fa-arrow-up" style="color:var(--accent-green)"></i>' : '<i class="fas fa-arrow-down" style="color:var(--accent-amber)"></i>';
      html += `<tr><td>${icon} ${c.type}</td><td style="font-weight:500">${c.callerName}<br><span style="font-size:0.7rem;color:var(--text-muted)">${c.caller}</span></td><td style="font-weight:500">${c.calledName}<br><span style="font-size:0.7rem;color:var(--text-muted)">${c.called}</span></td><td>${c.duration}</td><td style="font-size:0.78rem">${c.tower}</td><td style="font-size:0.78rem">${c.date}</td></tr>`;
    });
    html += '</tbody></table></div></div>';
  }

  // Contact Frequency
  if (criminal.contactNetwork && criminal.contactNetwork.length) {
    html += '<div class="card"><div class="card-header"><div class="card-title"><i class="fas fa-address-book" style="color:var(--accent-purple);margin-right:8px"></i>Contact Frequency Analysis</div></div><div class="contact-list">';
    const maxF = Math.max(...criminal.contactNetwork.map(c => c.frequency));
    criminal.contactNetwork.forEach(c => {
      const pct = Math.round((c.frequency / maxF) * 100);
      const relCol = c.relationship === 'Gang' ? 'var(--accent-red)' : c.relationship === 'Family' ? 'var(--accent-green)' : c.relationship === 'Financial' ? 'var(--accent-amber)' : c.relationship === 'Personal' ? 'var(--accent-purple)' : c.relationship === 'Legal' ? 'var(--accent-blue)' : 'var(--accent-teal)';
      html += `<div class="contact-item"><div style="display:flex;align-items:center;gap:10px;min-width:200px"><div class="user-avatar" style="width:32px;height:32px;font-size:0.65rem">${initials(c.name)}</div><div><div style="font-weight:600;font-size:0.85rem;color:var(--text-primary)">${c.name}</div><div style="font-size:0.7rem;color:var(--text-muted)">${c.phone}</div></div></div><div style="flex:1;margin:0 16px"><div class="health-bar" style="height:8px"><div class="fill" style="width:${pct}%;background:${relCol}"></div></div></div><div style="min-width:40px;text-align:center;font-weight:700">${c.frequency}</div><span class="badge" style="background:${relCol}20;color:${relCol};min-width:65px;text-align:center">${c.relationship}</span><div style="font-size:0.72rem;color:var(--text-muted);min-width:80px;text-align:right">${c.lastContact}</div></div>`;
    });
    html += '</div></div>';
  }
  content.innerHTML = html;
}


// ---- Modal ----
function openModal(title, bodyHtml) {
  $('#modal-title').textContent = title;
  $('#modal-body').innerHTML = bodyHtml;
  $('#modal-overlay').classList.add('active');
}

function closeModal() {
  $('#modal-overlay').classList.remove('active');
}

// ---- Event Listeners ----
function setupEvents() {
  // Navigation
  $$('.nav-item').forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      const page = item.dataset.page;
      if (page) navigate(page);
    });
  });

  // Brand click → dashboard
  $('#brand-home').addEventListener('click', () => navigate('dashboard'));

  // Modal close
  $('#modal-close').addEventListener('click', closeModal);
  $('#modal-overlay').addEventListener('click', e => { if (e.target === e.currentTarget) closeModal(); });

  // Sidebar toggle (Mobile)
  const sidebar = $('#sidebar');
  const overlay = $('#sidebar-overlay');
  const btnToggle = $('#btn-sidebar-toggle');

  function toggleSidebar() {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('active');
  }

  if (btnToggle) btnToggle.addEventListener('click', toggleSidebar);
  if (overlay) overlay.addEventListener('click', toggleSidebar);

  // Close sidebar on nav item click (Mobile)
  $$('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      if (window.innerWidth <= 900 && sidebar.classList.contains('open')) toggleSidebar();
    });
  });

  // Global search
  $('#global-search').addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const q = e.target.value.toLowerCase();
      if (!q) return;
      // Search across data
      const crime = (DATA.crimes || []).find(c => c.fir_num.toLowerCase().includes(q) || c.crime_id.toLowerCase().includes(q));
      if (crime) { navigate('firDetail', crime.crime_id); e.target.value = ''; return; }
      const person = (DATA.persons || []).find(p => p.full_name.toLowerCase().includes(q) || (p.alias || '').toLowerCase().includes(q));
      if (person) { navigate('profileDetail', person.person_id); e.target.value = ''; return; }
      alert('No results found for "' + q + '"');
    }
  });

  // Alerts button
  $('#btn-alerts').addEventListener('click', () => {
    const alerts = (DATA.dashboard.recentActivity || []).filter(a => a.severity === 'critical' || a.severity === 'high');
    let html = '<div class="activity-feed">';
    alerts.forEach(a => { html += `<div class="activity-item"><div class="activity-dot ${a.severity}"></div><div class="activity-text">${a.text}</div><div class="activity-time">${a.time}</div></div>`; });
    html += '</div>';
    openModal('Active Alerts', html);
  });
}

// ---- Init ----
async function init() {
  await loadData();
  setupEvents();
  initTheme();
  navigate('dashboard');
}

// ---- Features ----
function initTheme() {
  const themeBtn = $('#btn-theme-toggle');
  const themeIcon = $('#theme-icon');
  if (!themeBtn || !themeIcon) return;

  // Check localStorage or system preference
  const savedTheme = localStorage.getItem('Garuda-theme');
  const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;

  let isLight = true; // Default to white theme
  if (savedTheme === 'dark') {
    isLight = false;
  }

  // Apply initial theme
  if (isLight) {
    document.body.classList.add('light-theme');
    themeIcon.classList.replace('fa-sun', 'fa-moon');
  }

  // Toggle handler
  themeBtn.addEventListener('click', () => {
    isLight = !document.body.classList.contains('light-theme');

    if (isLight) {
      document.body.classList.add('light-theme');
      themeIcon.classList.replace('fa-sun', 'fa-moon');
      localStorage.setItem('Garuda-theme', 'light');
    } else {
      document.body.classList.remove('light-theme');
      themeIcon.classList.replace('fa-moon', 'fa-sun');
      localStorage.setItem('Garuda-theme', 'dark');
    }
  });
}

// === Garuda AI ASSISTANT ===
let chatHistory = [];
function renderGarudaAI() {
  const content = $('#page-content');
  const hasHistory = chatHistory.length > 0;

  let html = `<div class="ai-chat-container ${hasHistory ? 'has-messages' : 'empty-state'}">`;

  // Chat Messages Area (only visible if history exists)
  html += `<div class="ai-chat-messages" id="ai-chat-messages" style="${!hasHistory ? 'display:none;' : ''}">`;
  chatHistory.forEach(msg => {
    const isUser = msg.role === 'user';
    const icon = isUser ? '<div class="user-avatar" style="width:32px;height:32px;font-size:0.8rem">U</div>' : '<i class="fas fa-sparkles ai-sparkle"></i>';
    const formatted = isUser ? msg.content : (window.marked ? marked.parse(msg.content) : msg.content);
    html += `<div class="ai-message ${msg.role}">
               <div class="ai-avatar-wrapper">${icon}</div>
               <div class="ai-bubble">${formatted}</div>
             </div>`;
  });
  html += `</div>`;

  // Input Section (Centers vertically when empty, sticks to bottom when chatting)
  html += `
    <div class="ai-bottom-section">
      ${!hasHistory ? `
        <div class="ai-hero">
          <img src="/assets/logo.png" alt="Garuda Logo" style="width: 100px; height: 100px; margin-bottom: 24px; object-fit: contain;">
          <h2>Meet Garuda, your intelligence assistant</h2>
        </div>
      ` : ''}

      <div class="ai-input-pill">
        <i class="fas fa-plus action-icon"></i>
        <input type="text" id="ai-input" placeholder="Ask Garuda..." autocomplete="off" onkeypress="if(event.key==='Enter') sendChatMessage()" />
        <button id="btn-send-chat" onclick="sendChatMessage()"><i class="fas fa-paper-plane"></i></button>
      </div>

      ${!hasHistory ? `
        <div class="ai-suggestion-chips">
          <button onclick="$('#ai-input').value='Summarize FIR 142/2026'; sendChatMessage()">Summarize</button>
          <button onclick="$('#ai-input').value='Details on accused Rafiq Khan'; sendChatMessage()">Profile</button>
          <button onclick="$('#ai-input').value='Analyze recent drug seizures'; sendChatMessage()">Research</button>
          <button onclick="$('#ai-input').value='Pending database integrations'; sendChatMessage()">System</button>
        </div>
      ` : ''}
    </div>
  </div>`;

  content.innerHTML = html;

  if (hasHistory) {
    const msgContainer = $('#ai-chat-messages');
    msgContainer.scrollTop = msgContainer.scrollHeight;
  }
}

window.sendChatMessage = async function () {
  const input = $('#ai-input');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;

  input.value = '';
  chatHistory.push({ role: 'user', content: text });
  renderGarudaAI();

  const msgContainer = $('#ai-chat-messages');
  const typingDiv = document.createElement('div');
  typingDiv.className = 'ai-message assistant typing';
  typingDiv.innerHTML = '<div class="ai-avatar-wrapper"><i class="fas fa-sparkles ai-sparkle" style="animation: pulse 1s infinite"></i></div><div class="ai-bubble">Analyzing...</div>';
  msgContainer.appendChild(typingDiv);
  msgContainer.scrollTop = msgContainer.scrollHeight;

  try {
    const res = await fetch('http://localhost:4000/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, history: chatHistory.slice(0, -1) })
    });
    const data = await res.json();
    chatHistory.push({ role: 'assistant', content: data.reply || "Error: No reply" });
  } catch (err) {
    chatHistory.push({ role: 'assistant', content: "Connection error." });
  }

  renderGarudaAI();
};

init();
