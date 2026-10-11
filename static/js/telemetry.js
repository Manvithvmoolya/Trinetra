/**
 * TRINETRA Telemetry UI Bindings
 * Connects live sensor data, detection alarms, battery gauges,
 * and simulation control buttons to DOM elements.
 */

class TrinetraTelemetryUI {
  constructor() {
    this.audioAlarm = null;
    this.audioEnabled = false;

    this.initElements();
    this.subscribe();
  }

  initElements() {
    // Simulation toggle button
    const btnSimToggle = document.getElementById('btnToggleSimulation');
    if (btnSimToggle) {
      btnSimToggle.addEventListener('click', async () => {
        const isCurrentlyActive = btnSimToggle.classList.contains('active');
        try {
          const res = await fetch('/api/simulation/toggle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enabled: !isCurrentlyActive })
          });
          if (res.ok) {
            const data = await res.json();
            btnSimToggle.classList.toggle('active', data.simulation_active);
            btnSimToggle.textContent = data.simulation_active ? 'Stop Simulation' : 'Start Demo Simulation';
          }
        } catch (e) {
          console.error("Simulation toggle error", e);
        }
      });
    }

    // Trigger immediate simulated detection button
    const btnSimTrigger = document.getElementById('btnSimulateMineDetection');
    if (btnSimTrigger) {
      btnSimTrigger.addEventListener('click', async () => {
        try {
          await fetch('/api/simulation/toggle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enabled: true, trigger_detection: true })
          });
        } catch (e) {
          console.error("Simulation trigger error", e);
        }
      });
    }

    // Sound toggle button
    const btnAudio = document.getElementById('btnToggleAlarmAudio');
    if (btnAudio) {
      btnAudio.addEventListener('click', () => {
        this.audioEnabled = !this.audioEnabled;
        btnAudio.classList.toggle('active', this.audioEnabled);
        btnAudio.textContent = this.audioEnabled ? '🔊 Audio Muted' : '🔇 Audio Muted';
      });
    }
  }

  subscribe() {
    if (window.TrinetraApp) {
      window.TrinetraApp.onTelemetry((telemetry) => {
        this.renderTelemetry(telemetry);
      });
    }
  }

  renderTelemetry(telemetry) {
    const sensors = telemetry.sensors || {};
    const status = telemetry.status || {};
    const loc = telemetry.location || {};

    // 1. Battery metrics
    const battVoltsEl = document.getElementById('statBatteryVolts');
    const battPctEl = document.getElementById('statBatteryPercent');
    const battFillEl = document.getElementById('statBatteryFill');
    if (battVoltsEl && sensors.battery_voltage !== null && sensors.battery_voltage !== undefined) {
      battVoltsEl.textContent = `${sensors.battery_voltage.toFixed(2)} V`;
    }
    if (battPctEl && sensors.battery_percentage !== null && sensors.battery_percentage !== undefined) {
      battPctEl.textContent = `${sensors.battery_percentage.toFixed(0)}%`;
      if (battFillEl) battFillEl.style.width = `${sensors.battery_percentage}%`;
    }

    // 2. Metal detector signal meter
    const sigValEl = document.getElementById('statSignalStrength');
    const sigFillEl = document.getElementById('signalMeterFill');
    if (sigValEl && sensors.signal_strength !== null && sensors.signal_strength !== undefined) {
      sigValEl.textContent = `${sensors.signal_strength.toFixed(1)}%`;
      if (sigFillEl) sigFillEl.style.width = `${sensors.signal_strength}%`;
    }

    // 3. Landmine Detection Alarm Banner
    const alarmBanner = document.getElementById('detectionAlarmBanner');
    const alarmAudioText = document.getElementById('alarmCoordinatesText');
    if (alarmBanner) {
      if (sensors.metal_detected) {
        alarmBanner.style.display = 'flex';
        if (alarmAudioText && loc.latitude) {
          alarmAudioText.textContent = `Anomaly at Lat: ${loc.latitude.toFixed(6)}, Lon: ${loc.longitude.toFixed(6)} • Signal: ${sensors.signal_strength || 85}%`;
        }
        if (this.audioEnabled) {
          this.playBeep();
        }
      } else {
        alarmBanner.style.display = 'none';
      }
    }

    // 4. Motors & Temperatures
    const motorEl = document.getElementById('statMotorState');
    if (motorEl && sensors.motor_status) {
      motorEl.textContent = sensors.motor_status.toUpperCase();
    }
    const tempEl = document.getElementById('statMcuTemp');
    if (tempEl && sensors.temperature) {
      tempEl.textContent = `${sensors.temperature.toFixed(1)} °C`;
    }

    // 5. Detection history table
    const tableBody = document.getElementById('detectionsTableBody');
    if (tableBody && telemetry.recent_detections) {
      tableBody.innerHTML = '';
      if (telemetry.recent_detections.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-dim);">No detection events logged yet.</td></tr>';
      } else {
        telemetry.recent_detections.forEach(det => {
          const row = document.createElement('tr');
          const timeStr = new Date(det.timestamp).toLocaleTimeString();
          row.innerHTML = `
            <td style="font-family: var(--font-mono); color: var(--accent-cyan);">${det.id}</td>
            <td>${timeStr}</td>
            <td style="font-family: var(--font-mono);">${det.latitude ? det.latitude.toFixed(5) : 'N/A'}, ${det.longitude ? det.longitude.toFixed(5) : 'N/A'}</td>
            <td style="font-family: var(--font-mono); font-weight: bold; color: ${det.signal_strength > 70 ? 'var(--accent-red)' : 'var(--accent-yellow)'};">${det.signal_strength.toFixed(1)}%</td>
            <td><span class="status-pill" style="font-size: 11px; padding: 2px 8px; color: #fff; background: rgba(239, 68, 68, 0.2); border-color: var(--accent-red);">${det.status}</span></td>
          `;
          tableBody.appendChild(row);
        });
      }
    }

    // 6. Simulation toggle state synchronization
    const btnSimToggle = document.getElementById('btnToggleSimulation');
    if (btnSimToggle) {
      btnSimToggle.classList.toggle('active', status.simulation_active);
      btnSimToggle.textContent = status.simulation_active ? 'Stop Simulation' : 'Start Demo Simulation';
    }
  }

  playBeep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // High pitch alarm
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch (e) {}
  }
}

window.TrinetraTelemetryUI = TrinetraTelemetryUI;
