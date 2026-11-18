# Boda 360 Telematics | Manufacturer & Administration Portal

**Target Organization / User:** Hardware engineering laboratories, factory quality control technicians, and central telematics backend administrators (ISBAT University Engineering Lab / Boda 360 HQ).  
**Lead Engineer:** Akim Ronald David (ISBAT University, Kampala, Uganda)

---

## 1. Overview & Purpose
The **Manufacturer Portal** is the top-tier operational command center for the Boda 360 telematics infrastructure. It manages factory assembly line batch provisioning, automated IMEI and cryptographic key generation, over-the-air (OTA) firmware deployments, and high-availability cloud server monitoring.

## 2. Directory Structure
```text
manufacturer-portal/
├── index.html            # Main manufacturer portal UI
├── css/
│   └── styles.css        # Emerald factory styling & infrastructure grid layout
├── js/
│   └── app.js            # Batch provisioning generator, global fleet table & MQTT packet stream
└── README.md             # Manufacturer portal documentation
```

## 3. Key Capabilities & Screens

### A. Hardware Batch Provisioning (`#screen-mfg-provision`)
* **Batch Code Generation:** Generates factory batch manifests (e.g., `BATCH-2026-UG04`).
* **Cryptographic Signing:** Automates creation of sequential 15-digit TAC-compliant IMEIs, pre-shared AES-256 encryption keys, and SHA-256 firmware checksums.
* **Dealership Allocation:** Assigns hardware quotas directly to authorized dealership workshops (Katwe Auto Hub, Wandegeya Motorcycle Center, etc.).
* **Flashing Export:** One-click export to CSV for automated bench flashing rigs.

### B. Global Device Fleet Inventory (`#screen-mfg-inventory`)
* Master inventory of every manufactured ESP32 telematics node across Uganda.
* Status tracking (`unassigned reserve`, `dealer workshop`, `active on road`, `immobilized`).
* **OTA Remote Firmware Upgrades:** Triggers remote binary patches over cellular GPRS (`v1.4.2` -> `v1.4.3-OTA`).

### C. System Telemetry & Cloud Server Health (`#screen-mfg-health`)
* **Live Telemetry Stream Console:** Real-time stream of incoming MQTT JSON packets (`boda/<imei>/telemetry`) ingested from Uganda cellular towers.
* **High-Availability Cluster Monitoring:**
  * Eclipse Mosquitto MQTT Broker (Ports 1883 / 8883 MQTTS, 99.98% uptime).
  * PostgreSQL database connection pool and microsecond query latency.
  * Cellular SMS & USSD gateways (MTN Uganda & Airtel Uganda).
  * Uganda Police Cyber & Telematics Liaison emergency bridge.

## 4. How to Run
- **Direct in Browser:** Open `manufacturer-portal/index.html` directly in any web browser.
- **Via Express Server:** Start server with `npm start` and visit `http://localhost:3000/manufacturer`.
