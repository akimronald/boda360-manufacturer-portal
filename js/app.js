/**
 * BODA 360 IOT TELEMATICS - MANUFACTURER & SUPERADMIN PORTAL
 * Enterprise Hardware Provisioning, Dual-MCU Internet OTA & Central Administration
 *
 * Supports Dual ESP32 Microcontroller Architecture:
 *   1. ESP32-WROOM-32 + SIM800L (Direct Voice Call + SMS + GPRS) + u-blox NEO-6M GPS ("esp32_wroom")
 *   2. ESP32 LILYGO TTGO T-SIM7000G (SIM7000G Modem + Integrated GNSS) ("lilygo_tsim7000g")
 */

(function () {
  'use strict';

  // --- REAL-TIME STATE MANAGEMENT (Synced with Backend API & WebSocket) ---
  const state = {
    batches: [],
    devices: [],
    otaManifest: null,
    ws: null
  };

  function inferBoardKey(hwOrType) {
    const s = String(hwOrType || '').toLowerCase();
    if (s.includes('lilygo') || s.includes('7000')) return 'lilygo_tsim7000g';
    return 'esp32_wroom';
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // --- INITIALIZATION ---
  document.addEventListener('DOMContentLoaded', () => {
    initClock();
    initSubnav();
    initBatchProvisioning();
    renderBatchesTable();
    renderGlobalFleet();
    initOtaManager();
    initOtaWebSocket();
    initLiveStream();
    loadRealFleetAndHealth();
    setInterval(loadRealFleetAndHealth, 4000);
    initLogout();
  });

  // --- REAL-TIME CLOCK ---
  function initClock() {
    const clockEl = document.getElementById('system-time');
    const update = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-GB', { hour12: false });
      if (clockEl) clockEl.innerHTML = `<i class="fa-regular fa-clock"></i> ${timeStr} EAT`;
    };
    update();
    setInterval(update, 1000);
  }

  // --- SUB-NAVIGATION (TABS) ---
  function initSubnav() {
    const tabs = [
      { tabId: 'subtab-mfg-provision', screenId: 'screen-mfg-provision' },
      { tabId: 'subtab-mfg-inventory', screenId: 'screen-mfg-inventory' },
      { tabId: 'subtab-mfg-ota', screenId: 'screen-mfg-ota' },
      { tabId: 'subtab-mfg-health', screenId: 'screen-mfg-health' }
    ];

    tabs.forEach(({ tabId, screenId }) => {
      const tabEl = document.getElementById(tabId);
      if (tabEl) {
        tabEl.addEventListener('click', () => {
          tabs.forEach(t => {
            const btn = document.getElementById(t.tabId);
            const scr = document.getElementById(t.screenId);
            if (btn) btn.classList.remove('active');
            if (scr) scr.classList.remove('active');
          });

          tabEl.classList.add('active');
          const targetScreen = document.getElementById(screenId);
          if (targetScreen) targetScreen.classList.add('active');
          loadRealFleetAndHealth();
        });
      }
    });

    const clearBtn = document.getElementById('btn-clear-stream');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        const stream = document.getElementById('live-telemetry-stream');
        if (stream) stream.innerHTML = '';
        showToast('Telemetry stream console cleared', 'info');
      });
    }

    const exportBtn = document.getElementById('btn-export-csv');
    if (exportBtn) {
      exportBtn.addEventListener('click', exportFlashingCsv);
    }
  }

  // --- FETCH REAL DEPLOYED DEVICES, BATCHES & SYSTEM HEALTH ---
  async function loadRealFleetAndHealth() {
    try {
      const [batchesRes, devicesRes, healthRes] = await Promise.all([
        fetch('/api/manufacturer/batches', { cache: 'no-store' }),
        fetch('/api/manufacturer/devices', { cache: 'no-store' }),
        fetch('/api/manufacturer/system-health', { cache: 'no-store' })
      ]);

      if (batchesRes.ok) {
        const bData = await batchesRes.json();
        if (bData && bData.success && Array.isArray(bData.batches)) {
          state.batches = bData.batches.map(b => ({
            id: b.batch_id,
            qty: b.units_manufactured || b.total_units || 0,
            deployed: b.units_activated || 0,
            hw: b.hardware_version || 'ESP32-WROOM-32 v2.4',
            date: b.production_date ? String(b.production_date).slice(0, 10) : '--',
            status: b.status || 'Provisioned'
          }));
          renderBatchesTable();

          const batchCodeInput = document.getElementById('batch-code');
          if (batchCodeInput && (!batchCodeInput.dataset.userEdited)) {
            const nextNum = state.batches.length + 1;
            batchCodeInput.value = `BATCH-2026-UG${String(nextNum).padStart(2, '0')}`;
          }
        }
      }

      if (devicesRes.ok) {
        const dData = await devicesRes.json();
        if (dData && dData.success && Array.isArray(dData.devices)) {
          state.devices = dData.devices.map(d => ({
            imei: d.device_imei,
            batch: d.batch_id || 'CUSTOMER-LINKED',
            hw: d.hardware_version || 'ESP32-WROOM-32 v2.4 (SIM800L + NEO-6M)',
            board_type: d.board_type || inferBoardKey(d.hardware_version),
            owner: d.owner_name || (d.is_deployed ? 'Registered Customer' : 'Unassigned Reserve'),
            owner_phone: d.owner_phone || '',
            plate: d.linked_plate || 'Unbound',
            is_deployed: Boolean(d.is_deployed),
            is_online: Boolean(d.is_online),
            transport: d.transport || 'OFFLINE',
            status: d.motorcycle_status || (d.is_deployed ? 'active' : 'unassigned'),
            fw: d.firmware_version || 'v2.1.0'
          }));
          renderGlobalFleet();
        }
      }

      if (healthRes.ok) {
        const hData = await healthRes.json();
        if (hData && hData.success && hData.device_metrics) {
          const dm = hData.device_metrics;
          const kpiDeployed = document.getElementById('kpi-deployed-nodes');
          const kpiOnline = document.getElementById('kpi-online-nodes');
          const kpiTotal = document.getElementById('kpi-total-provisioned');
          const kpiCustomers = document.getElementById('kpi-customers-count');

          if (kpiDeployed) kpiDeployed.textContent = String(dm.deployed_count ?? dm.activated_on_road ?? 0);
          if (kpiOnline) kpiOnline.textContent = String(dm.online_nodes ?? 0);
          if (kpiTotal) kpiTotal.textContent = String(dm.total_manufactured ?? 0);
          if (kpiCustomers) kpiCustomers.textContent = String(hData.customers_count ?? 0);
        }
      }
    } catch (err) {
      // Keep current state if offline
    }
  }

  // --- HARDWARE BATCH PROVISIONING ---
  function initBatchProvisioning() {
    const form = document.getElementById('form-provision-batch');
    const batchCodeInput = document.getElementById('batch-code');
    if (batchCodeInput) {
      batchCodeInput.addEventListener('input', () => {
        batchCodeInput.dataset.userEdited = '1';
      });
    }
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const batchCode = document.getElementById('batch-code').value.trim().toUpperCase();
      const qty = parseInt(document.getElementById('batch-quantity').value, 10) || 5;
      const hwSelect = document.getElementById('batch-hw-rev');
      const hwRev = hwSelect ? hwSelect.value : 'ESP32-WROOM-32 v2.4 (SIM800L + NEO-6M)';
      const boardKey = inferBoardKey(hwRev);
      const targetNotes = (document.getElementById('batch-vendor-select')?.value || 'Direct Customer Deployment Pool').trim();

      logToConsole(`[PROVISION START] Generating batch ${batchCode} (${qty} units | ${hwRev})...`, 'text-cyan');

      try {
        const res = await fetch('/api/manufacturer/batches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            batch_id: batchCode,
            quantity: qty,
            hardware_version: hwRev,
            board_type: boardKey,
            notes: targetNotes
          })
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error((data && data.message) || 'Failed to provision batch.');
        }

        const generated = data.generated_devices || [];
        const firstImei = generated[0] ? generated[0].device_imei : '--';
        const lastImei = generated.length > 0 ? generated[generated.length - 1].device_imei : '--';

        logToConsole(`[AES-256] Generated cryptographic keys for IMEI range ${firstImei} -> ${lastImei}.`, 'text-success');
        logToConsole(`[OTA PROFILE] Assigned board_type="${boardKey}" for internet firmware rollouts.`, 'text-success');
        logToConsole(`[SUCCESS] Batch ${batchCode} (${qty} nodes) saved to global inventory!`, 'text-emerald');

        if (batchCodeInput) {
          delete batchCodeInput.dataset.userEdited;
        }
        await loadRealFleetAndHealth();
        showToast(`Batch ${batchCode} provisioned (${qty} ${boardKey} nodes).`, 'success');
      } catch (err) {
        logToConsole(`[ERROR] ${err.message}`, 'text-danger');
        showToast(err.message, 'danger');
      }
    });
  }

  function logToConsole(text, cssClass = '') {
    const consoleEl = document.getElementById('batch-console');
    if (!consoleEl) return;

    const line = document.createElement('div');
    line.className = `log-line ${cssClass}`;
    line.textContent = text;
    consoleEl.appendChild(line);
    consoleEl.scrollTop = consoleEl.scrollHeight;
  }

  function logOtaConsole(text, cssClass = '') {
    const consoleEl = document.getElementById('ota-rollout-console');
    if (!consoleEl) return;

    const now = new Date().toLocaleTimeString('en-GB', { hour12: false });
    const line = document.createElement('div');
    line.className = `log-line ${cssClass}`;
    line.textContent = `[${now}] ${text}`;
    consoleEl.appendChild(line);
    if (consoleEl.children.length > 60) {
      consoleEl.removeChild(consoleEl.firstChild);
    }
    consoleEl.scrollTop = consoleEl.scrollHeight;
  }

  function renderBatchesTable() {
    const tbody = document.getElementById('batches-tbody');
    const badgeCount = document.getElementById('mfg-batches-count');
    if (!tbody) return;

    if (badgeCount) badgeCount.textContent = String(state.batches.length);

    tbody.innerHTML = '';
    if (state.batches.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 18px;">
            No hardware batches provisioned yet. Use the form on the left to generate a batch, or customers can directly link their tracker IMEI on Sign Up.
          </td>
        </tr>
      `;
      return;
    }

    state.batches.forEach(b => {
      const tr = document.createElement('tr');
      const isDeployed = (b.deployed || 0) > 0;
      tr.innerHTML = `
        <td class="font-mono" style="color: #10b981; font-weight: 700;">${escapeHtml(b.id)}</td>
        <td>${b.qty} Nodes</td>
        <td><strong style="color: ${isDeployed ? '#10b981' : '#94a3b8'};">${b.deployed || 0} Deployed</strong></td>
        <td>${escapeHtml(b.hw)}</td>
        <td>${escapeHtml(b.date)}</td>
        <td><span class="badge-role" style="background: ${isDeployed ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.18)'}; color: ${isDeployed ? '#10b981' : '#fbbf24'};">${escapeHtml(b.status)}</span></td>
      `;
      tbody.appendChild(tr);
    });
  }

  // --- GLOBAL DEVICE FLEET INVENTORY (100% REAL DEPLOYED & PROVISIONED COUNTS) ---
  function renderGlobalFleet() {
    const tbody = document.getElementById('global-fleet-tbody');
    const totalEl = document.getElementById('lbl-total-mfg');
    const assignedEl = document.getElementById('lbl-assigned-mfg');
    const unassignedEl = document.getElementById('lbl-unassigned-mfg');
    const onlineEl = document.getElementById('lbl-online-mfg');
    const globalCountBadge = document.getElementById('badge-global-count');
    const deployedBannerEl = document.getElementById('mfg-deployed-banner-count');

    const total = state.devices.length;
    const deployed = state.devices.filter(d => d.is_deployed).length;
    const unassigned = total - deployed;
    const online = state.devices.filter(d => d.is_online).length;

    if (totalEl) totalEl.textContent = String(total);
    if (assignedEl) assignedEl.textContent = String(deployed);
    if (unassignedEl) unassignedEl.textContent = String(unassigned);
    if (onlineEl) onlineEl.textContent = String(online);
    if (globalCountBadge) globalCountBadge.textContent = String(deployed > 0 ? `${deployed} Deployed / ${total}` : total);
    if (deployedBannerEl) deployedBannerEl.textContent = String(deployed);

    if (!tbody) return;
    tbody.innerHTML = '';

    if (state.devices.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; color: var(--text-muted); padding: 24px;">
            <strong>0 Devices Deployed or Provisioned Yet.</strong><br>
            When a customer links a tracker &amp; motorcycle in the Customer Portal (or you provision a hardware batch), it will appear here automatically in real time.
          </td>
        </tr>
      `;
      return;
    }

    state.devices.forEach(dev => {
      const tr = document.createElement('tr');
      const boardKey = dev.board_type || inferBoardKey(dev.hw);

      let statusBadge = '';
      if (dev.is_deployed) {
        if (dev.status === 'immobilized') {
          statusBadge = '<span style="color: #ef4444; font-weight: 700;"><i class="fa-solid fa-ban"></i> Deployed (Immobilized)</span>';
        } else if (dev.is_online) {
          statusBadge = `<span style="color: #10b981; font-weight: 700;"><i class="fa-solid fa-signal"></i> Deployed &bull; ONLINE (${escapeHtml(dev.transport)})</span>`;
        } else {
          statusBadge = '<span style="color: #38bdf8; font-weight: 700;"><i class="fa-solid fa-circle-check"></i> Deployed &bull; Customer Linked</span>';
        }
      } else {
        statusBadge = '<span style="color: #fbbf24; font-weight: 700;"><i class="fa-solid fa-box"></i> Provisioned (Spare)</span>';
      }

      const ownerDisplay = dev.owner_phone
        ? `${escapeHtml(dev.owner)} <span style="color: var(--text-muted); font-size: 0.72rem;">(${escapeHtml(dev.owner_phone)})</span>`
        : escapeHtml(dev.owner);

      tr.innerHTML = `
        <td class="font-mono" style="color: #00f2fe; font-weight: 700;">${escapeHtml(dev.imei)}</td>
        <td class="font-mono" style="font-size: 0.72rem;">${escapeHtml(dev.batch)}</td>
        <td>${escapeHtml(dev.hw)}</td>
        <td>${ownerDisplay}</td>
        <td class="font-mono" style="font-weight: 700; color: ${dev.is_deployed ? '#10b981' : '#94a3b8'};">${escapeHtml(dev.plate)}</td>
        <td>${statusBadge}</td>
        <td class="font-mono" style="font-size: 0.72rem; color: var(--text-muted);">${escapeHtml(dev.fw)}</td>
        <td>
          <button class="btn btn-outline btn-xs" data-ota-imei="${escapeHtml(dev.imei)}" data-ota-board="${escapeHtml(boardKey)}">
            <i class="fa-solid fa-cloud-arrow-up"></i> OTA Flash
          </button>
        </td>
      `;

      const otaBtn = tr.querySelector(`[data-ota-imei="${dev.imei}"]`);
      if (otaBtn) {
        otaBtn.addEventListener('click', () => {
          triggerOtaRollout(boardKey, dev.imei, true);
        });
      }

      tbody.appendChild(tr);
    });
  }

  // --- INTERNET OTA FIRMWARE MANAGER ---
  function initOtaManager() {
    loadOtaManifest();

    const uploadForm = document.getElementById('form-upload-ota');
    if (uploadForm) {
      uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const boardType = document.getElementById('ota-board-type').value;
        const version = document.getElementById('ota-version').value.trim();
        const fileInput = document.getElementById('ota-bin-file');
        const publicUrl = document.getElementById('ota-public-url').value.trim();
        const notes = document.getElementById('ota-notes').value.trim();
        const submitBtn = document.getElementById('btn-upload-ota');

        const selectedFile = fileInput && fileInput.files && fileInput.files[0];
        if (!selectedFile && !publicUrl) {
          showToast('Attach a compiled .bin file (Sketch -> Export Compiled Binary) or provide a public .bin URL.', 'warning');
          return;
        }

        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Uploading .bin & Computing MD5...';
        }

        try {
          let res;
          if (selectedFile) {
            const arrayBuf = await selectedFile.arrayBuffer();
            res = await fetch('/api/ota/upload', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/octet-stream',
                'x-board-type': boardType,
                'x-fw-version': version,
                'x-release-notes': encodeURIComponent(notes),
                'x-public-url': publicUrl
              },
              body: arrayBuf
            });
          } else {
            res = await fetch('/api/ota/upload', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                board_type: boardType,
                version: version,
                external_url: publicUrl,
                notes: notes
              })
            });
          }

          const data = await res.json();
          if (!res.ok || !data.success) {
            throw new Error(data.message || 'Failed to upload firmware');
          }

          const rel = data.release;
          logOtaConsole(
            `[STAGED] ${rel.board_label} -> v${rel.version} (${rel.size_bytes ? Math.round(rel.size_bytes / 1024) + ' KB' : 'External URL'}, MD5: ${rel.md5 || 'external'})`,
            'text-success'
          );
          showToast(data.message, 'success');
          await loadOtaManifest();
        } catch (err) {
          logOtaConsole(`[UPLOAD ERROR] ${err.message}`, 'text-danger');
          showToast(err.message, 'danger');
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fa-solid fa-upload"></i> Stage Firmware Binary on OTA Server';
          }
        }
      });
    }

    document.querySelectorAll('[data-trigger-board]').forEach(btn => {
      btn.addEventListener('click', () => {
        const boardKey = btn.getAttribute('data-trigger-board');
        triggerOtaRollout(boardKey, 'ALL', false);
      });
    });

    const singleBtn = document.getElementById('btn-trigger-single-ota');
    if (singleBtn) {
      singleBtn.addEventListener('click', () => {
        const boardKey = document.getElementById('ota-single-board').value;
        const targetImei = document.getElementById('ota-target-imei').value.trim();
        const forceFlag = document.getElementById('ota-force-flag').checked;
        if (!targetImei) {
          showToast('Enter a target IMEI or use the fleet broadcast buttons above.', 'warning');
          return;
        }
        triggerOtaRollout(boardKey, targetImei, forceFlag);
      });
    }

    const clearOtaBtn = document.getElementById('btn-clear-ota-log');
    if (clearOtaBtn) {
      clearOtaBtn.addEventListener('click', () => {
        const el = document.getElementById('ota-rollout-console');
        if (el) el.innerHTML = '';
      });
    }
  }

  async function loadOtaManifest() {
    try {
      const res = await fetch('/api/ota/manifest');
      if (!res.ok) return;
      const data = await res.json();
      if (!data.success) return;

      state.otaManifest = data.manifest;
      const originEl = document.getElementById('ota-server-origin');
      if (originEl && data.server_origin) {
        originEl.textContent = data.server_origin;
      }

      const boards = (data.manifest && data.manifest.boards) || {};
      updateBoardCardUI('wroom', boards.esp32_wroom);
      updateBoardCardUI('lilygo', boards.lilygo_tsim7000g);
    } catch (err) {
      // Server offline fallback
    }
  }

  function updateBoardCardUI(suffix, rel) {
    const verEl = document.getElementById(`ota-ver-${suffix}`);
    const sizeEl = document.getElementById(`ota-size-${suffix}`);
    const md5El = document.getElementById(`ota-md5-${suffix}`);
    const urlEl = document.getElementById(`ota-url-${suffix}`);
    if (!verEl) return;

    if (!rel) {
      verEl.textContent = 'No .bin yet';
      if (sizeEl) sizeEl.textContent = '--';
      if (md5El) md5El.textContent = '--';
      return;
    }

    verEl.textContent = `v${rel.version}`;
    if (sizeEl) {
      sizeEl.textContent = rel.size_bytes > 0
        ? `${(rel.size_bytes / 1024).toFixed(1)} KB (${rel.size_bytes} B)`
        : 'External URL';
    }
    if (md5El) {
      md5El.textContent = rel.md5 ? `${rel.md5.slice(0, 16)}...` : 'External';
      md5El.title = rel.md5 || '';
    }
    if (urlEl && rel.download_url) {
      urlEl.textContent = rel.download_url;
      urlEl.title = rel.download_url;
    }
  }

  async function triggerOtaRollout(boardKey, targetImei = 'ALL', force = false) {
    try {
      logOtaConsole(`[DISPATCHING] Publishing OTA_UPDATE for board="${boardKey}" -> target="${targetImei}"...`, 'text-cyan');
      const res = await fetch('/api/ota/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          board_type: boardKey,
          target_imei: targetImei,
          force: Boolean(force)
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        if (res.status === 404) {
          const otaTab = document.getElementById('subtab-mfg-ota');
          if (otaTab) otaTab.click();
        }
        throw new Error(data.message || 'OTA trigger failed');
      }

      logOtaConsole(
        `[MQTT SENT -> ${data.mqtt_topic}] cmd=OTA_UPDATE | board=${boardKey} | v${data.command.version} | url=${data.command.url}`,
        'text-success'
      );
      showToast(data.message, 'success');

      if (targetImei && targetImei !== 'ALL') {
        const dev = state.devices.find(d => d.imei === targetImei);
        if (dev) {
          dev.fw = `v${data.command.version} (OTA Queued)`;
          renderGlobalFleet();
        }
      }
    } catch (err) {
      logOtaConsole(`[OTA TRIGGER BLOCKED] ${err.message}`, 'text-amber');
      showToast(err.message, 'warning');
    }
  }

  function appendLiveTelemetryPacket(msg) {
    const streamContainer = document.getElementById('live-telemetry-stream');
    if (!streamContainer) return;

    const emptyNotice = streamContainer.querySelector('[data-empty-stream]');
    if (emptyNotice) emptyNotice.remove();

    const now = new Date().toISOString();
    const imei = msg.device_imei || msg.imei || 'ESP32';
    const line = document.createElement('div');
    line.className = 'log-line';
    line.innerHTML = `
      <span style="color: #64748b;">[${now.slice(11, 19)}]</span>
      <span style="color: #00f2fe; font-weight: 700;">MQTT boda/${escapeHtml(imei)}/telemetry</span>:
      <span style="color: #e2e8f0;">${escapeHtml(JSON.stringify(msg))}</span>
    `;
    streamContainer.appendChild(line);
    if (streamContainer.children.length > 35) {
      streamContainer.removeChild(streamContainer.firstChild);
    }
    streamContainer.scrollTop = streamContainer.scrollHeight;
  }

  function initOtaWebSocket() {
    try {
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${proto}//${window.location.host}/ws/telemetry`;
      const ws = new WebSocket(wsUrl);
      state.ws = ws;

      ws.addEventListener('message', (ev) => {
        try {
          const msg = JSON.parse(ev.data);

          if (
            msg.type === 'MOTORCYCLE_ADDED' ||
            msg.type === 'MOTORCYCLE_REMOVED' ||
            msg.type === 'BATCH_PROVISIONED' ||
            msg.type === 'DEVICE_STATUS'
          ) {
            loadRealFleetAndHealth();
            if (msg.type === 'MOTORCYCLE_ADDED' && msg.motorcycle) {
              logToConsole(
                `[CUSTOMER DEPLOYED] ${msg.motorcycle.plate_number} linked to Tracker IMEI ${msg.motorcycle.device_imei}`,
                'text-emerald'
              );
              showToast(`New tracker deployed: ${msg.motorcycle.plate_number} (${msg.motorcycle.device_imei})`, 'success');
            }
          }

          if (msg.type === 'TELEMETRY_UPDATE' || (msg.device_imei && msg.latitude !== undefined)) {
            appendLiveTelemetryPacket(msg);
          }

          if (msg.type === 'OTA_STATUS_UPDATE') {
            const evt = msg.event || msg.action || 'OTA_EVENT';
            const who = msg.device_imei || msg.target_imei || 'FLEET';
            const ver = msg.fw_version || msg.version || '';
            const cls = evt.includes('FAIL') ? 'text-danger' : (evt.includes('SUCCESS') ? 'text-success' : 'text-cyan');
            logOtaConsole(`[${evt}] Node: ${who} | Board: ${msg.board || 'auto'} | Status: ${msg.status || 'OK'} ${ver ? '(v' + ver + ')' : ''}`, cls);

            if (msg.device_imei && (evt.includes('SUCCESS') || msg.fw_version)) {
              loadRealFleetAndHealth();
            }
          }
        } catch (_) {}
      });
    } catch (_) {}
  }

  // --- LIVE TELEMETRY STREAM INSPECTOR (REAL HARDWARE PACKETS ONLY) ---
  function initLiveStream() {
    const streamContainer = document.getElementById('live-telemetry-stream');
    if (!streamContainer) return;

    streamContainer.innerHTML = `
      <div class="log-line text-muted" data-empty-stream="1">
        [STREAM READY] Listening for real MQTT / USB Serial telemetry packets from deployed ESP32 trackers...
      </div>
    `;
  }

  // --- EXPORT FLASHING CSV ---
  function exportFlashingCsv() {
    let csv = 'IMEI,BatchCode,BoardType,HardwareRev,CustomerOwner,BoundPlate,Deployed,Firmware\n';
    state.devices.forEach(d => {
      const bKey = d.board_type || inferBoardKey(d.hw);
      csv += `${d.imei},${d.batch},${bKey},"${d.hw}","${d.owner}",${d.plate},${d.is_deployed ? 'YES' : 'NO'},${d.fw}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `boda_360_provision_inventory_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    showToast('Factory flashing CSV exported successfully', 'success');
  }

  // --- TOAST NOTIFICATIONS ---
  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = 'fa-circle-info';
    if (type === 'success') icon = 'fa-circle-check';
    if (type === 'danger') icon = 'fa-triangle-exclamation';
    if (type === 'warning') icon = 'fa-bell';

    toast.innerHTML = `
      <i class="fa-solid ${icon}"></i>
      <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.4s ease';
      setTimeout(() => toast.remove(), 400);
    }, 3500);
  }

  // --- LOG OUT HANDLER ---
  function initLogout() {
    const mfgLogoutBtn = document.getElementById('btn-mfg-logout');
    if (mfgLogoutBtn) {
      mfgLogoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        showToast('Ending Manufacturer session and returning to Gateway...', 'info');
        try {
          localStorage.removeItem('boda_auth_token');
          localStorage.removeItem('boda_user_profile');
          localStorage.removeItem('boda_user_role');
          sessionStorage.clear();
        } catch (err) {}
        setTimeout(() => {
          window.location.href = '/';
        }, 350);
      });
    }
  }

})();
