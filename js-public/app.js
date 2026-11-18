/**
 * Boda 360 IoT Enterprise Telematics Platform
 * 1. Customer Portal (Fleet & Motorcycle Owners)
 * 2. Vendor Portal (Dealers / Auto-Electrician Workshops)
 * 3. Manufacturer Portal (Hardware Operations & Cloud Provisioning)
 * Commercial Fleet OS • Kampala, Uganda
 */

// Application Global State
const state = {
  currentPortal: 'customer', // 'customer' | 'vendor' | 'manufacturer'
  currentScreen: 'dashboard',
  token: localStorage.getItem('boda_token') || 'bg_telematics_auth_token',

  // Personas
  currentUser: {
    user_id: 3,
    full_name: 'John Baptist Mukasa',
    email: 'john.mukasa@boda.ug',
    role: 'customer'
  },

  // Telemetry & Assets
  motorcycles: [],
  devices: [],
  batches: [],
  vendors: [],
  selectedImei: '865421045981201',
  geofences: [],
  securityEvents: [],
  commandLogs: [],

  // Map & Visualizer
  mainMap: null,
  vehicleMarkers: {},
  geofenceCircles: [],

  // Connectivity
  isBackendConnected: false,
  ws: null,
  autonomousInterval: null
};

// Seed Data for Standalone / Client Execution
const INITIAL_SEED = {
  users: [
    { user_id: 1, full_name: 'System Superadmin', role: 'manufacturer', email: 'admin@boda360.io' },
    { user_id: 2, full_name: 'Sarah Nalwanga', role: 'vendor', email: 'sarah.vendor@katwe-boda.ug' },
    { user_id: 3, full_name: 'John Baptist Mukasa', role: 'customer', email: 'john.mukasa@boda.ug' },
    { user_id: 4, full_name: 'Denis Kato', role: 'vendor', email: 'denis@kisekka-electronics.ug' },
    { user_id: 5, full_name: 'Emmanuel Otim', role: 'customer', email: 'emmanuel.otim@gmail.com' }
  ],
  vendors: [
    { vendor_id: 1, business_name: 'Katwe Auto Electronics Ltd', shop_location: 'Katwe Auto Spare Market, Ring Road, Kampala', contact_phone: '+256 752 445 566', status: 'approved', allocated_units: 15, sold_units: 4 },
    { vendor_id: 2, business_name: 'Kisekka Market Boda Solutions', shop_location: 'Kisekka Market Block B-12, Kampala', contact_phone: '+256 782 112 233', status: 'approved', allocated_units: 10, sold_units: 1 },
    { vendor_id: 3, business_name: 'Lugogo Express Auto Care', shop_location: 'Lugogo Bypass, Shell Petrol Station, Kampala', contact_phone: '+256 700 554 433', status: 'pending', allocated_units: 0, sold_units: 0 }
  ],
  batches: [
    { batch_id: 'BATCH-2026-UG01', production_date: '2026-01-05', hardware_version: 'ESP32-SIM800L-v2.1', firmware_version: 'v1.4.2-EAT', total_units: 25, allocated: 25, activated: 5, qa_status: 'Passed (100%)' },
    { batch_id: 'BATCH-2026-UG02', production_date: '2026-02-10', hardware_version: 'ESP32-SIM800L-v2.1', firmware_version: 'v1.4.2-EAT', total_units: 50, allocated: 15, activated: 0, qa_status: 'Passed (100%)' }
  ],
  devices: [
    { device_id: 1, device_imei: '865421045981201', serial_number: 'SN-UG26-001', batch_id: 'BATCH-2026-UG01', vendor_id: 1, status: 'activated_to_customer' },
    { device_id: 2, device_imei: '865421045981202', serial_number: 'SN-UG26-002', batch_id: 'BATCH-2026-UG01', vendor_id: 1, status: 'activated_to_customer' },
    { device_id: 3, device_imei: '865421045981203', serial_number: 'SN-UG26-003', batch_id: 'BATCH-2026-UG01', vendor_id: 1, status: 'activated_to_customer' },
    { device_id: 4, device_imei: '865421045981204', serial_number: 'SN-UG26-004', batch_id: 'BATCH-2026-UG01', vendor_id: 1, status: 'activated_to_customer' },
    { device_id: 5, device_imei: '865421045981205', serial_number: 'SN-UG26-005', batch_id: 'BATCH-2026-UG01', vendor_id: 2, status: 'activated_to_customer' },
    { device_id: 6, device_imei: '865421045981206', serial_number: 'SN-UG26-006', batch_id: 'BATCH-2026-UG02', vendor_id: 1, status: 'allocated_to_vendor' },
    { device_id: 7, device_imei: '865421045981207', serial_number: 'SN-UG26-007', batch_id: 'BATCH-2026-UG02', vendor_id: 1, status: 'allocated_to_vendor' },
    { device_id: 8, device_imei: '865421045981208', serial_number: 'SN-UG26-008', batch_id: 'BATCH-2026-UG02', vendor_id: 2, status: 'allocated_to_vendor' },
    { device_id: 9, device_imei: '865421045981209', serial_number: 'SN-UG26-009', batch_id: 'BATCH-2026-UG02', vendor_id: null, status: 'manufactured' },
    { device_id: 10, device_imei: '865421045981210', serial_number: 'SN-UG26-010', batch_id: 'BATCH-2026-UG02', vendor_id: null, status: 'manufactured' }
  ],
  motorcycles: [
    {
      motorcycle_id: 1,
      user_id: 3,
      vendor_id: 1,
      plate_number: 'UEV 412K',
      device_imei: '865421045981201',
      status: 'active',
      model: 'Bajaj Boxer BM150 (ESP32 Hardware Node)',
      chassis_number: 'MD2A12AY3PW004128',
      pin_code: '1234',
      subscription_status: 'active',
      latest_telemetry: {
        latitude: 0.327500,
        longitude: 32.602500,
        speed: 0.0,
        heading: 45.0,
        battery_voltage: 12.6,
        ignition_status: true,
        gsm_signal: 29,
        timestamp: new Date()
      }
    }
  ],
  securityEvents: [
    {
      event_id: 1,
      device_imei: '865421045981204',
      plate_number: 'UFD 770E',
      event_type: 'TAMPER_DETECTED',
      severity: 'CRITICAL',
      latitude: 0.335500,
      longitude: 32.592500,
      notes: 'Onboard MPU6050 detected violent vibration exceeding 3.5G while parked. Potential theft attempt.',
      is_acknowledged: false,
      triggered_at: new Date(Date.now() - 3 * 60 * 1000)
    },
    {
      event_id: 2,
      device_imei: '865421045981203',
      plate_number: 'UFB 204C',
      event_type: 'GEOFENCE_BREACH',
      severity: 'HIGH',
      latitude: 0.334200,
      longitude: 32.569100,
      notes: 'Motorcycle crossed Wandegeya safe boundary after curfew. Remote cut-off initiated.',
      is_acknowledged: true,
      triggered_at: new Date(Date.now() - 45 * 60 * 1000)
    }
  ],
  geofences: [
    {
      geofence_id: 1,
      motorcycle_id: 1,
      name: 'Kampala Central Campus Safe Zone',
      center_lat: 0.327500,
      center_lng: 32.602500,
      radius_meters: 600,
      is_active: true
    }
  ]
};

// ============================================================================
// INITIALIZATION
// ============================================================================
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🏍️ Initializing Boda 360 Platform...');

  // Load Seed State
  state.motorcycles = JSON.parse(JSON.stringify(INITIAL_SEED.motorcycles));
  state.devices = JSON.parse(JSON.stringify(INITIAL_SEED.devices));
  state.batches = JSON.parse(JSON.stringify(INITIAL_SEED.batches));
  state.vendors = JSON.parse(JSON.stringify(INITIAL_SEED.vendors));
  state.securityEvents = JSON.parse(JSON.stringify(INITIAL_SEED.securityEvents));
  state.geofences = JSON.parse(JSON.stringify(INITIAL_SEED.geofences));

  startLiveClock();
  initPortalNavigation();
  initSimulatorBar();
  initCustomerControls();
  initVendorTerminal();
  initManufacturerPortal();
  initModals();

  // Initialize Leaflet Map
  initMainMap();

  // Switch to default portal: Customer
  switchPortal('customer');

  // Attempt backend connection
  await checkBackendConnection();

  // Start autonomous movement for realistic telemetry
  startAutonomousTelemetryLoop();
});

// ============================================================================
// LIVE CLOCK
// ============================================================================
function startLiveClock() {
  const clockEl = document.getElementById('live-clock');
  function update() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-GB', { hour12: false });
    if (clockEl) clockEl.textContent = `${timeStr} EAT`;
  }
  update();
  setInterval(update, 1000);
}

// ============================================================================
// PORTAL NAVIGATION & SWITCHER
// ============================================================================
function initPortalNavigation() {
  const portalBtns = document.querySelectorAll('.portal-btn');
  portalBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      switchPortal(btn.dataset.portal);
    });
  });
}

function switchPortal(portalName) {
  state.currentPortal = portalName;

  // 1. Update Portal Top Buttons
  document.querySelectorAll('.portal-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.portal === portalName);
  });

  // 2. Hide all Portal Containers and show active
  document.querySelectorAll('.portal-container').forEach(c => c.classList.remove('active'));
  const activeContainer = document.getElementById(`portal-${portalName}-view`);
  if (activeContainer) activeContainer.classList.add('active');

  // 3. Render Sub-Navigation Bar tailored for this portal
  renderSubNavBar(portalName);

  // 4. Update Header Persona
  updatePersonaForPortal(portalName);

  // 5. Trigger resize for Leaflet map if entering customer portal
  if (portalName === 'customer') {
    switchCustomerScreen('dashboard');
    setTimeout(() => {
      if (state.mainMap) state.mainMap.invalidateSize();
    }, 150);
  } else if (portalName === 'vendor') {
    switchVendorScreen('terminal');
    renderVendorInventoryTable();
    updateAvailableDevicesDropdown();
  } else if (portalName === 'manufacturer') {
    switchManufacturerScreen('batches');
    renderManufacturerBatchesTable();
    renderManufacturerVendorsTable();
    renderHealthMonitor();
  }
}

function renderSubNavBar(portalName) {
  const subNav = document.getElementById('sub-nav-container');
  const indicator = document.getElementById('portal-badge-indicator');
  if (!subNav) return;

  if (portalName === 'customer') {
    subNav.innerHTML = `
      <button class="sub-nav-tab active" id="subtab-cust-dashboard" data-screen="dashboard">
        <i class="fa-solid fa-map-location-dot"></i> Live Map & Telematics
      </button>
      <button class="sub-nav-tab" id="subtab-cust-alerts" data-screen="alerts">
        <i class="fa-solid fa-bell"></i> Alert Center (<span id="cust-alerts-count">1</span>)
      </button>
      <button class="sub-nav-tab" id="subtab-cust-profile" data-screen="profile">
        <i class="fa-solid fa-id-card"></i> My Profile & Device Info
      </button>
    `;
    if (indicator) {
      indicator.innerHTML = `<i class="fa-solid fa-user-shield text-accent"></i> Active: <strong>Customer Portal (Bike Owner)</strong>`;
    }
    subNav.querySelector('#subtab-cust-dashboard').onclick = () => switchCustomerScreen('dashboard');
    subNav.querySelector('#subtab-cust-alerts').onclick = () => switchCustomerScreen('alerts');
    subNav.querySelector('#subtab-cust-profile').onclick = () => switchCustomerScreen('profile');
  } else if (portalName === 'vendor') {
    subNav.innerHTML = `
      <button class="sub-nav-tab active" id="subtab-vend-terminal" data-screen="terminal">
        <i class="fa-solid fa-link"></i> Device Registration Terminal
      </button>
      <button class="sub-nav-tab" id="subtab-vend-check" data-screen="check">
        <i class="fa-solid fa-satellite-dish"></i> Pre-Handover Activation Check
      </button>
      <button class="sub-nav-tab" id="subtab-vend-inventory" data-screen="inventory">
        <i class="fa-solid fa-boxes-stacked"></i> Sales & Device Inventory
      </button>
    `;
    if (indicator) {
      indicator.innerHTML = `<i class="fa-solid fa-store text-warning"></i> Active: <strong>Vendor Portal (Dealer / Installer)</strong>`;
    }
    subNav.querySelector('#subtab-vend-terminal').onclick = () => switchVendorScreen('terminal');
    subNav.querySelector('#subtab-vend-check').onclick = () => switchVendorScreen('check');
    subNav.querySelector('#subtab-vend-inventory').onclick = () => switchVendorScreen('inventory');
  } else if (portalName === 'manufacturer') {
    subNav.innerHTML = `
      <button class="sub-nav-tab active" id="subtab-mfg-batches" data-screen="batches">
        <i class="fa-solid fa-boxes-packing"></i> Hardware Batch Provisioning
      </button>
      <button class="sub-nav-tab" id="subtab-mfg-health" data-screen="health">
        <i class="fa-solid fa-heart-pulse"></i> Global Health & Broker Monitor
      </button>
      <button class="sub-nav-tab" id="subtab-mfg-vendors" data-screen="vendors">
        <i class="fa-solid fa-users-gear"></i> User & Vendor Management
      </button>
    `;
    if (indicator) {
      indicator.innerHTML = `<i class="fa-solid fa-industry text-success"></i> Active: <strong>Manufacturer Portal (Lead Engineer)</strong>`;
    }
    subNav.querySelector('#subtab-mfg-batches').onclick = () => switchManufacturerScreen('batches');
    subNav.querySelector('#subtab-mfg-health').onclick = () => switchManufacturerScreen('health');
    subNav.querySelector('#subtab-mfg-vendors').onclick = () => switchManufacturerScreen('vendors');
  }
}

function updatePersonaForPortal(portalName) {
  const nameEl = document.getElementById('nav-user-name');
  const roleEl = document.getElementById('nav-user-role');
  const avatarEl = document.getElementById('nav-user-avatar');

  if (portalName === 'customer') {
    state.currentUser = { user_id: 3, full_name: 'John Baptist Mukasa', role: 'customer' };
    if (nameEl) nameEl.textContent = 'John B. Mukasa';
    if (roleEl) roleEl.textContent = 'Customer (Owner)';
    if (avatarEl) avatarEl.innerHTML = '<i class="fa-solid fa-user-shield"></i>';
  } else if (portalName === 'vendor') {
    state.currentUser = { user_id: 2, full_name: 'Sarah Nalwanga', role: 'vendor' };
    if (nameEl) nameEl.textContent = 'Sarah Nalwanga';
    if (roleEl) roleEl.textContent = 'Katwe Auto Electronics';
    if (avatarEl) avatarEl.innerHTML = '<i class="fa-solid fa-store"></i>';
  } else if (portalName === 'manufacturer') {
    state.currentUser = { user_id: 1, full_name: 'System Superadmin', role: 'manufacturer' };
    if (nameEl) nameEl.textContent = 'System Superadmin';
    if (roleEl) roleEl.textContent = 'Manufacturer / Admin';
    if (avatarEl) avatarEl.innerHTML = '<i class="fa-solid fa-industry"></i>';
  }
}

// Sub-screen switchers
window.switchCustomerScreen = function (screenName) {
  updateSubNavActiveClass(screenName);
  document.querySelectorAll('#portal-customer-view .portal-screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(`customer-screen-${screenName}`);
  if (target) target.classList.add('active');

  if (screenName === 'alerts') renderCustomerAlertsList();
  if (screenName === 'profile') renderCustomerProfile();
};

window.switchVendorScreen = function (screenName) {
  updateSubNavActiveClass(screenName);
  document.querySelectorAll('#portal-vendor-view .portal-screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(`vendor-screen-${screenName}`);
  if (target) target.classList.add('active');

  if (screenName === 'inventory') renderVendorInventoryTable();
  if (screenName === 'check') runActivationCheck('865421045981201');
};

window.switchManufacturerScreen = function (screenName) {
  updateSubNavActiveClass(screenName);
  document.querySelectorAll('#portal-manufacturer-view .portal-screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(`mfg-screen-${screenName}`);
  if (target) target.classList.add('active');

  if (screenName === 'batches') renderManufacturerBatchesTable();
  if (screenName === 'health') renderHealthMonitor();
  if (screenName === 'vendors') renderManufacturerVendorsTable();
};

function updateSubNavActiveClass(screenName) {
  document.querySelectorAll('.sub-nav-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.screen === screenName);
  });
}

// ============================================================================
// PORTAL 1: CUSTOMER PORTAL CONTROLLERS & MAP
// ============================================================================
function initCustomerControls() {
  const btnImmobilize = document.getElementById('btn-cust-immobilize');
  const btnRestore = document.getElementById('btn-cust-restore');
  const btnRecenter = document.getElementById('btn-map-recenter');
  const btnSiren = document.getElementById('btn-test-cust-siren');

  if (btnImmobilize) {
    btnImmobilize.addEventListener('click', () => {
      openImmobilizeConfirmationModal();
    });
  }

  if (btnRestore) {
    btnRestore.addEventListener('click', () => {
      executeRestoreCommand();
    });
  }

  if (btnRecenter) {
    btnRecenter.addEventListener('click', () => {
      const moto = getSelectedMotorcycle();
      if (moto && moto.latest_telemetry && state.mainMap) {
        state.mainMap.flyTo([moto.latest_telemetry.latitude, moto.latest_telemetry.longitude], 16, { duration: 1.0 });
      }
    });
  }

  if (btnSiren) {
    btnSiren.addEventListener('click', () => {
      window.bodaAudio.playTamperAlarm(3.0);
      showToast('🔊 Security Tamper Siren Test Active (3s)', 'danger');
    });
  }
}

function initMainMap() {
  const mapEl = document.getElementById('leaflet-map');
  if (!mapEl) return;

  state.mainMap = L.map('leaflet-map', {
    zoomControl: false,
    attributionControl: false
  }).setView([0.3275, 32.6025], 14);

  L.control.zoom({ position: 'topright' }).addTo(state.mainMap);

  // Official Standard Leaflet OpenStreetMap Layer (Default)
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'
  }).addTo(state.mainMap);

  renderCustomerBikesList();
  renderSelectedVehicleHUD();
  updateAllMapMarkers();
}

function createMarkerIcon(moto) {
  const statusClass = moto.status === 'immobilized'
    ? 'immobilized'
    : (moto.status === 'tamper_alert' ? 'alert' : 'active');

  const heading = moto.latest_telemetry ? moto.latest_telemetry.heading : 0;

  const html = `
    <div class="boda-marker-icon">
      <div class="boda-marker-inner ${statusClass}">
        <div class="marker-heading-arrow" style="transform: rotate(${heading}deg);"></div>
        <i class="fa-solid fa-motorcycle"></i>
        <div class="marker-label-plate">${moto.plate_number}</div>
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-leaflet-marker',
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  });
}

function updateAllMapMarkers() {
  if (!state.mainMap) return;
  state.motorcycles.forEach(moto => updateMarkerPosition(moto));
}

function updateMarkerPosition(moto) {
  if (!state.mainMap || !moto.latest_telemetry) return;

  const lat = moto.latest_telemetry.latitude;
  const lng = moto.latest_telemetry.longitude;

  if (state.vehicleMarkers[moto.device_imei]) {
    const marker = state.vehicleMarkers[moto.device_imei];
    marker.setLatLng([lat, lng]);
    marker.setIcon(createMarkerIcon(moto));
  } else {
    const marker = L.marker([lat, lng], { icon: createMarkerIcon(moto) }).addTo(state.mainMap);
    marker.on('click', () => selectMotorcycle(moto.device_imei));
    state.vehicleMarkers[moto.device_imei] = marker;
  }
}

function getSelectedMotorcycle() {
  return state.motorcycles.find(m => m.device_imei === state.selectedImei) || state.motorcycles[0];
}

function selectMotorcycle(imei) {
  state.selectedImei = imei;
  renderCustomerBikesList();
  renderSelectedVehicleHUD();

  const moto = getSelectedMotorcycle();
  if (moto && moto.latest_telemetry && state.mainMap) {
    state.mainMap.flyTo([moto.latest_telemetry.latitude, moto.latest_telemetry.longitude], 16, { duration: 1.0 });
  }
}

function renderCustomerBikesList() {
  const container = document.getElementById('cust-bikes-list');
  const countBadge = document.getElementById('cust-bikes-count');
  if (!container) return;

  // Filter to Customer's registered fleet assets
  const list = state.motorcycles;
  if (countBadge) countBadge.textContent = list.length;

  container.innerHTML = list.map(m => {
    const isSelected = m.device_imei === state.selectedImei;
    const tel = m.latest_telemetry || {};

    let badgeClass = 'active';
    let badgeText = 'ACTIVE';
    if (m.status === 'immobilized') {
      badgeClass = 'immobilized';
      badgeText = 'CUT-OFF';
    } else if (m.status === 'tamper_alert') {
      badgeClass = 'tamper_alert';
      badgeText = 'TAMPER!';
    }

    return `
      <div class="moto-card ${isSelected ? 'selected' : ''}" onclick="selectMotorcycle('${m.device_imei}')">
        <div class="card-top">
          <span class="card-plate">${m.plate_number}</span>
          <span class="card-status-badge ${badgeClass}">${badgeText}</span>
        </div>
        <div class="card-model">${m.model}</div>
        <div class="card-metrics-row">
          <div class="card-speed"><i class="fa-solid fa-gauge-simple"></i> ${tel.speed || 0} km/h</div>
          <div class="card-battery"><i class="fa-solid fa-car-battery"></i> ${(tel.battery_voltage || 12.6).toFixed(1)}V</div>
          <div class="card-ignition">
            <i class="fa-solid fa-key ${tel.ignition_status ? 'text-good' : 'text-danger'}"></i>
            ${tel.ignition_status ? 'IGN ON' : 'IGN OFF'}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderSelectedVehicleHUD() {
  const moto = getSelectedMotorcycle();
  if (!moto) return;

  const tel = moto.latest_telemetry || {
    latitude: 0.327500,
    longitude: 32.602500,
    speed: 0,
    heading: 0,
    battery_voltage: 12.6,
    ignition_status: false,
    gsm_signal: 28
  };

  const plateEl = document.getElementById('cust-hud-plate');
  const modelEl = document.getElementById('cust-hud-model');
  const imeiEl = document.getElementById('cust-hud-imei');
  const statusBadge = document.getElementById('cust-hud-status');

  if (plateEl) plateEl.textContent = moto.plate_number;
  if (modelEl) modelEl.textContent = moto.model;
  if (imeiEl) imeiEl.textContent = moto.device_imei;

  if (statusBadge) {
    if (moto.status === 'immobilized') {
      statusBadge.className = 'v-status-badge status-immobilized';
      statusBadge.innerHTML = '<i class="fa-solid fa-lock"></i> IMMOBILIZED (CUT-OFF)';
    } else if (moto.status === 'tamper_alert') {
      statusBadge.className = 'v-status-badge status-immobilized';
      statusBadge.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> TAMPER ALERT';
    } else {
      statusBadge.className = 'v-status-badge status-active';
      statusBadge.innerHTML = '<i class="fa-solid fa-circle-check"></i> ACTIVE & TRACKED';
    }
  }

  // Speedometer
  const spdEl = document.getElementById('cust-hud-speed');
  const spdBar = document.getElementById('cust-hud-speed-bar');
  if (spdEl) spdEl.textContent = Number(tel.speed || 0).toFixed(1);
  if (spdBar) spdBar.style.width = `${Math.min(100, tel.speed || 0)}%`;

  // Battery
  const batEl = document.getElementById('cust-hud-battery');
  if (batEl) batEl.innerHTML = `${(tel.battery_voltage || 12.6).toFixed(1)} <span class="unit">V</span>`;

  // Ignition
  const ignEl = document.getElementById('cust-hud-ignition');
  const ignSub = document.getElementById('cust-hud-ignition-sub');
  if (ignEl) {
    if (tel.ignition_status) {
      ignEl.className = 'ignition-state on';
      ignEl.innerHTML = '<i class="fa-solid fa-fire"></i> SWITCHED ON';
      if (ignSub) ignSub.textContent = 'Relay Closed (Normal)';
    } else {
      ignEl.className = 'ignition-state off';
      ignEl.innerHTML = '<i class="fa-solid fa-power-off"></i> SWITCHED OFF';
      if (ignSub) ignSub.textContent = 'Relay Open (Cut-Off)';
    }
  }

  // GSM
  const gsmEl = document.getElementById('cust-hud-gsm');
  if (gsmEl) gsmEl.innerHTML = `CSQ ${tel.gsm_signal || 29} <span class="unit">/ 31</span>`;

  // Heading & G-Force
  const headEl = document.getElementById('cust-hud-heading');
  const gforceEl = document.getElementById('cust-hud-gforce');
  if (headEl) headEl.textContent = `${Math.round(tel.heading || 0)}°`;
  if (gforceEl) gforceEl.textContent = moto.status === 'tamper_alert' ? '3.82 G (Spike)' : '0.98 G';

  const mapCoords = document.getElementById('cust-map-coords');
  if (mapCoords) mapCoords.textContent = `${tel.latitude.toFixed(6)}° N, ${tel.longitude.toFixed(6)}° E`;
}

// Remote Cut-off Execution
function openImmobilizeConfirmationModal() {
  const moto = getSelectedMotorcycle();
  if (!moto) return;

  const modal = document.getElementById('modal-immobilize-confirm');
  const plateText = document.getElementById('modal-target-plate');
  const speedText = document.getElementById('modal-target-speed');
  const pinInput = document.getElementById('modal-security-pin');

  if (plateText) plateText.textContent = moto.plate_number;
  if (speedText) speedText.textContent = `${moto.latest_telemetry ? moto.latest_telemetry.speed : 0} km/h`;
  if (pinInput) pinInput.value = '1234';

  if (modal) modal.classList.remove('hidden');
}

async function executeImmobilizeCommand(pin) {
  const moto = getSelectedMotorcycle();
  if (!moto) return;

  animatePipelineVisualizer('ENGINE_CUT');

  try {
    if (state.isBackendConnected) {
      const res = await fetch('/api/command/immobilize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${state.token}` },
        body: JSON.stringify({ device_imei: moto.device_imei, pin_code: pin })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Cut-off failed');
      finishPipelineVisualizer(true, data.data.latency_ms || 240);
    } else {
      await new Promise(r => setTimeout(r, 260));
      finishPipelineVisualizer(true, 260);

      moto.status = 'immobilized';
      if (moto.latest_telemetry) {
        moto.latest_telemetry.speed = 0;
        moto.latest_telemetry.ignition_status = false;
      }
    }

    window.bodaAudio.playRelayClick(true);
    showToast(`⛔ Engine Cut-Off Executed on ${moto.plate_number}! Relay energized.`, 'danger');

    renderCustomerBikesList();
    renderSelectedVehicleHUD();
    updateMarkerPosition(moto);
  } catch (err) {
    finishPipelineVisualizer(false, 0);
    showToast(`Error: ${err.message}`, 'danger');
  }
}

async function executeRestoreCommand() {
  const moto = getSelectedMotorcycle();
  if (!moto) return;

  animatePipelineVisualizer('ENGINE_RESTORE');

  try {
    if (state.isBackendConnected) {
      const res = await fetch('/api/command/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${state.token}` },
        body: JSON.stringify({ device_imei: moto.device_imei, pin_code: '1234' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Restore failed');
      finishPipelineVisualizer(true, data.data.latency_ms || 210);
    } else {
      await new Promise(r => setTimeout(r, 220));
      finishPipelineVisualizer(true, 220);

      moto.status = 'active';
      if (moto.latest_telemetry) {
        moto.latest_telemetry.ignition_status = true;
      }
    }

    window.bodaAudio.playRelayClick(false);
    showToast(`✅ Ignition Restored on ${moto.plate_number}. Engine ready.`, 'success');

    renderCustomerBikesList();
    renderSelectedVehicleHUD();
    updateMarkerPosition(moto);
  } catch (err) {
    finishPipelineVisualizer(false, 0);
    showToast(`Error: ${err.message}`, 'danger');
  }
}

function animatePipelineVisualizer(actionName) {
  const feedback = document.getElementById('pipeline-feedback-text');
  if (feedback) feedback.textContent = `Publishing ${actionName} command to MQTT broker...`;

  const s1 = document.getElementById('pipe-step-1');
  const s2 = document.getElementById('pipe-step-2');
  const s3 = document.getElementById('pipe-step-3');
  const s4 = document.getElementById('pipe-step-4');

  [s1, s2, s3, s4].forEach(s => s && (s.className = 'pipeline-step'));
  if (s1) s1.className = 'pipeline-step active';
  setTimeout(() => { if (s2) s2.className = 'pipeline-step active'; }, 70);
  setTimeout(() => { if (s3) s3.className = 'pipeline-step active'; }, 150);
}

function finishPipelineVisualizer(success, latency) {
  const feedback = document.getElementById('pipeline-feedback-text');
  const s1 = document.getElementById('pipe-step-1');
  const s2 = document.getElementById('pipe-step-2');
  const s3 = document.getElementById('pipe-step-3');
  const s4 = document.getElementById('pipe-step-4');

  if (success) {
    [s1, s2, s3, s4].forEach(s => s && (s.className = 'pipeline-step success'));
    if (feedback) feedback.textContent = `Hardware node confirmed ACK in ${latency}ms. CDI power cut.`;
  } else {
    if (feedback) feedback.textContent = `Pipeline error: Invalid PIN or hardware unresponsive.`;
  }
}

function renderCustomerAlertsList() {
  const container = document.getElementById('customer-alerts-list');
  const countEl = document.getElementById('cust-alerts-count');
  if (!container) return;

  const unack = state.securityEvents.filter(e => !e.is_acknowledged);
  if (countEl) countEl.textContent = unack.length;

  if (state.securityEvents.length === 0) {
    container.innerHTML = `<div class="text-muted" style="text-align:center; padding:20px;">No security alerts. Your motorcycle is safe.</div>`;
    return;
  }

  container.innerHTML = state.securityEvents.map(e => {
    const timeStr = new Date(e.triggered_at).toLocaleTimeString('en-GB');
    return `
      <div class="alert-event-card ${e.severity === 'CRITICAL' ? '' : 'warning'}">
        <div>
          <div style="font-weight:700; color:#fff; display:flex; align-items:center; gap:8px;">
            <i class="fa-solid fa-triangle-exclamation ${e.severity === 'CRITICAL' ? 'text-danger' : 'text-warning'}"></i>
            <span>${e.event_type} &bull; ${e.plate_number || 'UEV 412K'}</span>
            <span class="badge-sev ${e.severity}">${e.severity}</span>
          </div>
          <p style="font-size:0.78rem; color:var(--text-muted); margin:4px 0;">${e.notes}</p>
          <small class="font-mono" style="color:var(--text-dark);">${timeStr} &bull; Lat: ${Number(e.latitude).toFixed(5)}, Lng: ${Number(e.longitude).toFixed(5)}</small>
        </div>
        <div>
          ${e.is_acknowledged
        ? '<span class="text-success small"><i class="fa-solid fa-check"></i> Acknowledged</span>'
        : `<button class="btn btn-xs btn-outline" onclick="ackSecurityEvent(${e.event_id})"><i class="fa-solid fa-check"></i> Acknowledge</button>`}
        </div>
      </div>
    `;
  }).join('');
}

window.ackSecurityEvent = function (id) {
  const ev = state.securityEvents.find(e => e.event_id === id);
  if (ev) {
    ev.is_acknowledged = true;
    renderCustomerAlertsList();
    updateTopAlertBanner();
    showToast('Alert cleared.', 'success');
  }
};

function renderCustomerProfile() {
  const moto = getSelectedMotorcycle();
  if (!moto) return;

  const profName = document.getElementById('prof-name');
  const profPhone = document.getElementById('prof-phone');
  const profImei = document.getElementById('prof-imei');
  const profPlate = document.getElementById('prof-plate');
  const profChassis = document.getElementById('prof-chassis');

  if (profName) profName.textContent = state.currentUser.full_name;
  if (profPhone) profPhone.textContent = '+256 701 987 654 (Airtel Uganda)';
  if (profImei) profImei.textContent = moto.device_imei;
  if (profPlate) profPlate.textContent = moto.plate_number;
  if (profChassis) profChassis.textContent = moto.chassis_number || 'MD2A12AY3PW004128';
}

// ============================================================================
// PORTAL 2: VENDOR PORTAL (DEALERS & INSTALLERS)
// ============================================================================
function initVendorTerminal() {
  const form = document.getElementById('form-vendor-bind');
  const btnRunCheck = document.getElementById('btn-run-activation-test');
  const checkSelect = document.getElementById('vend-check-imei');

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const imei = document.getElementById('vend-dev-imei-select').value;
      const plate = document.getElementById('vend-plate').value.trim().toUpperCase();
      const name = document.getElementById('vend-cust-name').value.trim();
      const phone = document.getElementById('vend-cust-phone').value.trim();
      const email = document.getElementById('vend-cust-email').value.trim();
      const model = document.getElementById('vend-model').value.trim();
      const chassis = document.getElementById('vend-chassis').value.trim();
      const pin = document.getElementById('vend-pin').value.trim();

      if (!imei || !plate || !name || !phone) {
        showToast('Please fill all required registration fields.', 'danger');
        return;
      }

      const newMoto = {
        motorcycle_id: state.motorcycles.length + 1,
        user_id: 3, // Customer
        vendor_id: 1, // Katwe
        plate_number: plate,
        device_imei: imei,
        status: 'active',
        model: model || 'Bajaj Boxer BM150',
        chassis_number: chassis || 'MD2A12AY9RW008812',
        pin_code: pin || '1234',
        subscription_status: 'active',
        installed_at: new Date(),
        latest_telemetry: {
          latitude: 0.327500 + (Math.random() - 0.5) * 0.01,
          longitude: 32.602500 + (Math.random() - 0.5) * 0.01,
          speed: 0,
          heading: 0,
          battery_voltage: 12.65,
          ignition_status: false,
          gsm_signal: 30,
          timestamp: new Date()
        }
      };

      state.motorcycles.push(newMoto);

      // Update device state in inventory
      const dev = state.devices.find(d => d.device_imei === imei);
      if (dev) {
        dev.status = 'activated_to_customer';
      }

      if (state.isBackendConnected) {
        try {
          await fetch('/api/vendor/register-device', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              vendor_id: 1,
              device_imei: imei,
              customer_name: name,
              customer_phone: phone,
              customer_email: email,
              plate_number: plate,
              model,
              chassis_number: chassis,
              pin_code: pin
            })
          });
        } catch (err) { }
      }

      showToast(`✅ Device ${imei} bound to ${plate} for ${name}!`, 'success');
      form.reset();

      // Switch to Activation Check tab automatically so vendor can verify connection
      switchVendorScreen('check');
      const testImeiSelect = document.getElementById('vend-check-imei');
      if (testImeiSelect) {
        const opt = document.createElement('option');
        opt.value = imei;
        opt.textContent = `${imei} (${plate} • ${name})`;
        opt.selected = true;
        testImeiSelect.appendChild(opt);
      }
      runActivationCheck(imei);
    });
  }

  if (btnRunCheck) {
    btnRunCheck.addEventListener('click', () => {
      const imei = document.getElementById('vend-check-imei').value;
      runActivationCheck(imei);
    });
  }
}

function updateAvailableDevicesDropdown() {
  const select = document.getElementById('vend-dev-imei-select');
  if (!select) return;

  const inStock = state.devices.filter(d => d.status === 'allocated_to_vendor' && d.vendor_id === 1);
  select.innerHTML = '<option value="">-- Choose from Available Dealer Stock --</option>' +
    inStock.map(d => `<option value="${d.device_imei}">${d.device_imei} (${d.serial_number} &bull; In Stock)</option>`).join('');
}

function runActivationCheck(imei) {
  showToast(`Running live diagnostic handshake on ${imei}...`, 'info');

  const banner = document.getElementById('readiness-banner');
  if (banner) banner.style.opacity = '0.5';

  setTimeout(() => {
    if (banner) banner.style.opacity = '1';
    window.bodaAudio.playChirp(true);
    showToast(`✅ 100% Passed: Device ${imei} verified online and ready for customer handover!`, 'success');
  }, 600);
}

function renderVendorInventoryTable() {
  const tbody = document.getElementById('tbody-vendor-inventory');
  const statAlloc = document.getElementById('vend-stat-allocated');
  const statSold = document.getElementById('vend-stat-sold');
  const statInStock = document.getElementById('vend-stat-instock');
  if (!tbody) return;

  const vendorDevices = state.devices.filter(d => d.vendor_id === 1);
  const soldBikes = state.motorcycles.filter(m => m.vendor_id === 1);

  if (statAlloc) statAlloc.textContent = vendorDevices.length;
  if (statSold) statSold.textContent = soldBikes.length;
  if (statInStock) statInStock.textContent = vendorDevices.filter(d => d.status === 'allocated_to_vendor').length;

  tbody.innerHTML = soldBikes.map(m => {
    const cust = INITIAL_SEED.users.find(u => u.user_id === m.user_id) || { full_name: 'Customer', phone_number: '+256 701 987 654' };
    return `
      <tr>
        <td class="font-mono"><strong>${m.device_imei}</strong></td>
        <td><strong>${cust.full_name}</strong></td>
        <td>${cust.phone_number}</td>
        <td><strong class="text-accent">${m.plate_number}</strong></td>
        <td>${m.model}</td>
        <td><span class="text-success"><i class="fa-solid fa-circle-check"></i> Activated</span></td>
        <td>2026-01-15</td>
        <td>
          <button class="btn btn-xs btn-outline" onclick="testActivationForImei('${m.device_imei}')">
            <i class="fa-solid fa-satellite-dish"></i> Ping Check
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

window.testActivationForImei = function (imei) {
  switchVendorScreen('check');
  const sel = document.getElementById('vend-check-imei');
  if (sel) sel.value = imei;
  runActivationCheck(imei);
};

// ============================================================================
// PORTAL 3: MANUFACTURER PORTAL (SYSTEM ADMIN & OVERSIGHT)
// ============================================================================
function initManufacturerPortal() {
  const formBatch = document.getElementById('form-mfg-batch');
  const btnRefreshHealth = document.getElementById('btn-refresh-health');

  if (formBatch) {
    formBatch.addEventListener('submit', (e) => {
      e.preventDefault();
      const batchId = document.getElementById('mfg-batch-id').value.trim();
      const hw = document.getElementById('mfg-hw-ver').value.trim();
      const fw = document.getElementById('mfg-fw-ver').value.trim();
      const qty = parseInt(document.getElementById('mfg-batch-qty').value, 10);
      const notes = document.getElementById('mfg-batch-notes').value.trim();

      const newBatch = {
        batch_id: batchId,
        production_date: new Date().toISOString().split('T')[0],
        hardware_version: hw,
        firmware_version: fw,
        total_units: qty,
        allocated: 0,
        activated: 0,
        qa_status: 'Passed (100%)',
        notes
      };

      state.batches.unshift(newBatch);

      // Pre-load units into inventory
      const startId = state.devices.length + 1;
      for (let i = 0; i < qty; i++) {
        const id = startId + i;
        state.devices.push({
          device_id: id,
          device_imei: `8654210459812${String(id).padStart(2, '0')}`,
          serial_number: `SN-UG26-${String(id).padStart(3, '0')}`,
          batch_id: batchId,
          vendor_id: null,
          status: 'manufactured'
        });
      }

      showToast(`⚡ Batch ${batchId} provisioned with ${qty} units pre-loaded into inventory!`, 'success');
      formBatch.reset();
      renderManufacturerBatchesTable();
      renderHealthMonitor();
    });
  }

  if (btnRefreshHealth) {
    btnRefreshHealth.addEventListener('click', () => {
      renderHealthMonitor();
      showToast('Global health telemetry updated.', 'info');
    });
  }
}

function renderManufacturerBatchesTable() {
  const tbody = document.getElementById('tbody-mfg-batches');
  if (!tbody) return;

  tbody.innerHTML = state.batches.map(b => {
    return `
      <tr>
        <td class="font-mono"><strong>${b.batch_id}</strong></td>
        <td>${b.production_date}</td>
        <td>${b.hardware_version} &bull; ${b.firmware_version}</td>
        <td><strong>${b.total_units} Units</strong></td>
        <td><span class="text-warning">${b.allocated || 0} Units</span></td>
        <td><span class="text-success">${b.activated || 0} Units</span></td>
        <td><span class="text-success"><i class="fa-solid fa-check"></i> ${b.qa_status}</span></td>
      </tr>
    `;
  }).join('');
}

function renderManufacturerVendorsTable() {
  const tbody = document.getElementById('tbody-mfg-vendors');
  if (!tbody) return;

  tbody.innerHTML = state.vendors.map(v => {
    return `
      <tr>
        <td>#0${v.vendor_id}</td>
        <td><strong>${v.business_name}</strong></td>
        <td>${v.shop_location}</td>
        <td>${v.contact_phone}</td>
        <td><strong>${v.allocated_units}</strong></td>
        <td><strong class="text-success">${v.sold_units}</strong></td>
        <td>
          <span class="badge-sev ${v.status === 'approved' ? 'MEDIUM' : 'HIGH'}">${v.status.toUpperCase()}</span>
        </td>
        <td>
          <button class="btn btn-xs btn-outline" onclick="allocateMoreUnitsToVendor(${v.vendor_id})">
            <i class="fa-solid fa-plus"></i> Allocate Stock
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

window.allocateMoreUnitsToVendor = function (vendorId) {
  const unallocated = state.devices.filter(d => d.status === 'manufactured');
  if (unallocated.length === 0) {
    showToast('No unallocated units in warehouse. Provision a new batch first!', 'warning');
    return;
  }

  // Allocate 5 units
  const toAllocate = unallocated.slice(0, 5);
  toAllocate.forEach(d => {
    d.vendor_id = vendorId;
    d.status = 'allocated_to_vendor';
  });

  const vendor = state.vendors.find(v => v.vendor_id === vendorId);
  if (vendor) vendor.allocated_units += toAllocate.length;

  renderManufacturerVendorsTable();
  renderHealthMonitor();
  showToast(`Allocated 5 tracking units to ${vendor ? vendor.business_name : 'dealer'}.`, 'success');
};

function renderHealthMonitor() {
  const totalDev = document.getElementById('kpi-total-devices');
  const activeRoad = document.getElementById('kpi-active-road');
  const dealerStock = document.getElementById('kpi-dealer-stock');
  const immobCount = document.getElementById('kpi-immobilized');

  if (totalDev) totalDev.textContent = state.devices.length;
  if (activeRoad) activeRoad.textContent = state.motorcycles.filter(m => m.status === 'active' || m.status === 'tamper_alert').length;
  if (dealerStock) dealerStock.textContent = state.devices.filter(d => d.status === 'allocated_to_vendor').length;
  if (immobCount) immobCount.textContent = state.motorcycles.filter(m => m.status === 'immobilized').length;
}

// ============================================================================
// SIMULATOR CONTROLS (TOP BAR)
// ============================================================================
function initSimulatorBar() {
  const btnTamper = document.getElementById('sim-trigger-tamper');
  const btnBreach = document.getElementById('sim-trigger-breach');
  const btnIgnition = document.getElementById('sim-toggle-ignition');
  const btnBattery = document.getElementById('sim-drop-battery');

  if (btnTamper) {
    btnTamper.addEventListener('click', () => {
      const moto = getSelectedMotorcycle();
      if (!moto) return;

      moto.status = 'tamper_alert';

      const newEvent = {
        event_id: state.securityEvents.length + 1,
        device_imei: moto.device_imei,
        plate_number: moto.plate_number,
        event_type: 'TAMPER_DETECTED',
        severity: 'CRITICAL',
        latitude: moto.latest_telemetry ? moto.latest_telemetry.latitude : 0.3275,
        longitude: moto.latest_telemetry ? moto.latest_telemetry.longitude : 32.6025,
        notes: `Simulated MPU6050 accelerometer impact: 3.82G shock detected while bike stationary.`,
        is_acknowledged: false,
        triggered_at: new Date()
      };

      state.securityEvents.unshift(newEvent);
      window.bodaAudio.playTamperAlarm(3.0);
      showToast(`💥 TAMPER ALARM: Accelerometer shock detected on ${moto.plate_number}!`, 'danger');

      updateTopAlertBanner();
      renderCustomerBikesList();
      renderSelectedVehicleHUD();
      updateMarkerPosition(moto);
      appendConsoleLog(`[ALERT] [TAMPER] Shock 3.82G on Node ${moto.device_imei} (${moto.plate_number})`);
    });
  }

  if (btnBreach) {
    btnBreach.addEventListener('click', () => {
      const moto = getSelectedMotorcycle();
      if (!moto || !moto.latest_telemetry) return;

      moto.latest_telemetry.latitude += 0.012;
      moto.latest_telemetry.longitude += 0.012;

      const newEvent = {
        event_id: state.securityEvents.length + 1,
        device_imei: moto.device_imei,
        plate_number: moto.plate_number,
        event_type: 'GEOFENCE_BREACH',
        severity: 'HIGH',
        latitude: moto.latest_telemetry.latitude,
        longitude: moto.latest_telemetry.longitude,
        notes: `Boundary breach: Exited Kampala Central Campus Safe Zone. Distance: 1,280m.`,
        is_acknowledged: false,
        triggered_at: new Date()
      };

      state.securityEvents.unshift(newEvent);
      window.bodaAudio.playTamperAlarm(2.0);
      showToast(`🚧 GEOFENCE BREACH: ${moto.plate_number} exited designated perimeter!`, 'warning');

      updateTopAlertBanner();
      renderCustomerBikesList();
      renderSelectedVehicleHUD();
      updateMarkerPosition(moto);
      appendConsoleLog(`[ALERT] [GEOFENCE] Boundary exit on Node ${moto.device_imei}`);
    });
  }

  if (btnIgnition) {
    btnIgnition.addEventListener('click', () => {
      const moto = getSelectedMotorcycle();
      if (!moto || !moto.latest_telemetry) return;

      moto.latest_telemetry.ignition_status = !moto.latest_telemetry.ignition_status;
      if (!moto.latest_telemetry.ignition_status) moto.latest_telemetry.speed = 0;
      showToast(`Key Ignition switched ${moto.latest_telemetry.ignition_status ? 'ON' : 'OFF'}.`, 'info');
      renderCustomerBikesList();
      renderSelectedVehicleHUD();
    });
  }

  if (btnBattery) {
    btnBattery.addEventListener('click', () => {
      const moto = getSelectedMotorcycle();
      if (!moto || !moto.latest_telemetry) return;

      moto.latest_telemetry.battery_voltage = 10.8;
      showToast(`⚠️ 12V Battery cut-off simulated (10.8V).`, 'warning');
      renderSelectedVehicleHUD();
    });
  }
}

function appendConsoleLog(msg) {
  const consoleEl = document.getElementById('stream-console');
  if (!consoleEl) return;
  const line = document.createElement('div');
  line.className = 'console-line text-accent';
  line.textContent = `[${new Date().toLocaleTimeString('en-GB')}] ${msg}`;
  consoleEl.prepend(line);
}

// Autonomous movement loop
function startAutonomousTelemetryLoop() {
  if (state.autonomousInterval) clearInterval(state.autonomousInterval);

  state.autonomousInterval = setInterval(() => {
    state.motorcycles.forEach(moto => {
      if (moto.status === 'active' || moto.status === 'tamper_alert') {
        const dLat = (Math.random() - 0.48) * 0.0006;
        const dLng = (Math.random() - 0.48) * 0.0006;

        moto.latest_telemetry.latitude += dLat;
        moto.latest_telemetry.longitude += dLng;
        moto.latest_telemetry.speed = Math.floor(Math.random() * 25) + 25;
        moto.latest_telemetry.heading = (moto.latest_telemetry.heading + 5) % 360;
        moto.latest_telemetry.timestamp = new Date();

        updateMarkerPosition(moto);
        if (state.selectedImei === moto.device_imei) {
          renderSelectedVehicleHUD();
        }
      }
    });
  }, 3000);
}

// Top Alert Banner
function updateTopAlertBanner() {
  const banner = document.getElementById('alert-banner');
  const bannerMsg = document.getElementById('alert-banner-msg');
  const unack = state.securityEvents.filter(e => !e.is_acknowledged);

  if (unack.length > 0 && banner && bannerMsg) {
    const top = unack[0];
    bannerMsg.textContent = `${top.plate_number || 'Motorcycle'}: ${top.notes}`;
    banner.classList.remove('hidden');

    const btnQuick = document.getElementById('btn-quick-immobilize');
    if (btnQuick) {
      btnQuick.onclick = () => {
        selectMotorcycle(top.device_imei);
        openImmobilizeConfirmationModal();
      };
    }

    const btnDismiss = document.getElementById('btn-dismiss-alert');
    if (btnDismiss) {
      btnDismiss.onclick = () => {
        top.is_acknowledged = true;
        updateTopAlertBanner();
        showToast('Alert acknowledged.', 'info');
      };
    }
  } else if (banner) {
    banner.classList.add('hidden');
  }
}

// ============================================================================
// MODALS
// ============================================================================
function initModals() {
  const immobModal = document.getElementById('modal-immobilize-confirm');
  const btnCloseImmob = document.getElementById('btn-close-immob-modal');
  const btnCancelImmob = document.getElementById('btn-cancel-immob');
  const btnConfirmImmob = document.getElementById('btn-confirm-immob');

  const closeImmob = () => immobModal && immobModal.classList.add('hidden');
  if (btnCloseImmob) btnCloseImmob.addEventListener('click', closeImmob);
  if (btnCancelImmob) btnCancelImmob.addEventListener('click', closeImmob);

  if (btnConfirmImmob) {
    btnConfirmImmob.addEventListener('click', () => {
      const pin = document.getElementById('modal-security-pin').value;
      closeImmob();
      executeImmobilizeCommand(pin);
    });
  }

  // Persona Switch Modal
  const authModal = document.getElementById('modal-auth');
  const userPill = document.getElementById('user-pill-btn');
  const btnCloseAuth = document.getElementById('btn-close-auth-modal');

  if (userPill) userPill.addEventListener('click', () => authModal && authModal.classList.remove('hidden'));
  if (btnCloseAuth) btnCloseAuth.addEventListener('click', () => authModal && authModal.classList.add('hidden'));

  document.querySelectorAll('.role-card').forEach(card => {
    card.addEventListener('click', () => {
      const persona = card.dataset.persona;
      switchPortal(persona);
      if (authModal) authModal.classList.add('hidden');
      showToast(`Switched active portal to ${persona.toUpperCase()}!`, 'success');
    });
  });
}

// Toast
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  let icon = 'fa-circle-info';
  if (type === 'success') icon = 'fa-circle-check';
  if (type === 'danger') icon = 'fa-triangle-exclamation';
  if (type === 'warning') icon = 'fa-bell';

  toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

async function checkBackendConnection() {
  const connPill = document.getElementById('connection-status');
  const connText = document.getElementById('conn-text');

  try {
    const res = await fetch('/api/system/status');
    if (res.ok) {
      state.isBackendConnected = true;
      if (connText) connText.textContent = 'BACKEND LIVE';
      if (connPill) connPill.className = 'connection-status connected';
    }
  } catch (e) {
    state.isBackendConnected = false;
    if (connText) connText.textContent = 'AUTONOMOUS SIM';
  }
}
