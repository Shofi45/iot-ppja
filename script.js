// ==========================================
// 1. FIREBASE
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyBhPYRXyxePX_y12XTk3agb3PSbTBdnvac",
    databaseURL: "https://ppja-iot-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "ppja-iot"
};
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// ==========================================
// 1b. STATE COUNTDOWN TIMER (live mm:ss)
// ==========================================
// Simpan waktu berakhir (epoch ms) tiap relay yang timernya sedang aktif.
// null artinya relay itu tidak sedang dalam mode timer.
let countdownEndAt = { Relay1: null, Relay2: null, Relay3: null, Relay4: null };

function formatMMSS(ms) {
    if (ms < 0) ms = 0;
    let totalSec = Math.floor(ms / 1000);
    let m = Math.floor(totalSec / 60);
    let s = totalSec % 60;
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

// Dipanggil tiap detik. Murni hitung mundur di sisi browser (tidak nunggu
// event Firebase), jadi tampilannya mulus turun per detik: 02:00, 01:59, ...
// Ini HANYA tampilan; yang benar-benar mematikan relay tetap ESP32.
function updateAllCountdowns() {
    for (let i = 1; i <= 4; i++) {
        let rn = 'Relay' + i;
        let endAt = countdownEndAt[rn];
        if (!endAt) continue;

        let remaining = endAt - Date.now();
        let label = 'Timer ' + formatMMSS(remaining) + ' tersisa';

        let infoEl = document.getElementById('infoMode' + rn);
        if (infoEl) infoEl.innerText = label + ' (Jalan di ESP32)';

        let cardModeEl = document.getElementById('statusMode' + rn);
        if (cardModeEl) cardModeEl.textContent = 'Timer ' + formatMMSS(remaining);

        if (remaining <= 0) {
            // Sudah 00:00 di layar; tunggu ESP32 benar-benar mematikan relay
            // & mereset TimerMenit lewat Firebase (biasanya <1-2 detik lagi).
            countdownEndAt[rn] = null;
        }
    }
}
setInterval(updateAllCountdowns, 1000);

// ==========================================
// 2. STATE CLOCK PICKER
// ==========================================
let clockState = {
    relayName : '',   // "Relay1" dst
    tipe      : '',   // "On" / "Off"
    mode      : 'jam',// "jam" / "menit"
    jam       : 0,
    menit     : 0,
    dragging  : false
};

// ==========================================
// 3. RENDER JAM ANALOG
// ==========================================
function renderClockNumbers() {
    const face = document.getElementById('clockFace');
    // Hapus angka lama
    face.querySelectorAll('.clock-number').forEach(el => el.remove());

    const cx = 120, cy = 120, r = 90, rInner = 62;
    const isJam = (clockState.mode === 'jam');

    if (isJam) {
        // Luar: 1–12, Dalam: 13–23 + 0
        for (let n = 1; n <= 12; n++) {
            let angle = (n / 12) * 2 * Math.PI - Math.PI / 2;
            let x = cx + r * Math.cos(angle);
            let y = cy + r * Math.sin(angle);
            buatAngka(face, n, x, y, false, clockState.jam === n);
        }
        for (let n = 13; n <= 23; n++) {
            let angle = (n / 12) * 2 * Math.PI - Math.PI / 2;
            let x = cx + rInner * Math.cos(angle);
            let y = cy + rInner * Math.sin(angle);
            buatAngka(face, n, x, y, true, clockState.jam === n);
        }
        // angka 0
        buatAngka(face, 0, cx, cy - rInner, true, clockState.jam === 0);
    } else {
        // Menit: 0, 5, 10 ... 55 di luar
        for (let n = 0; n < 12; n++) {
            let val = n * 5;
            let angle = (n / 12) * 2 * Math.PI - Math.PI / 2;
            let x = cx + r * Math.cos(angle);
            let y = cy + r * Math.sin(angle);
            buatAngka(face, val, x, y, false, clockState.menit === val);
        }
    }
}

function buatAngka(face, val, x, y, inner, selected) {
    let el = document.createElement('div');
    el.className = 'clock-number' + (inner ? ' inner' : '') + (selected ? ' selected' : '');
    el.style.left = x + 'px';
    el.style.top  = y + 'px';
    el.textContent = String(val).padStart(2, '0');
    el.onclick = (e) => {
        e.stopPropagation();
        if (clockState.mode === 'jam') {
            clockState.jam = val;
            updateJarum();
            renderClockNumbers();
            updateDigital();
        } else {
            clockState.menit = val;
            updateJarum();
            renderClockNumbers();
            updateDigital();
        }
    };
    face.appendChild(el);
}

function updateJarum() {
    const hand = document.getElementById('clockHand');
    const isJam = (clockState.mode === 'jam');
    let total, val, maxVal, panjang;

    if (isJam) {
        val = clockState.jam % 12;
        maxVal = 12;
        // Jarum lebih pendek untuk jam dalam (13–23)
        panjang = clockState.jam >= 13 || clockState.jam === 0 ? 55 : 82;
    } else {
        val = clockState.menit;
        maxVal = 60;
        panjang = 85;
    }

    let derajat = (val / maxVal) * 360 - 90;
    hand.style.height = panjang + 'px';
    hand.style.transform = `rotate(${derajat + 90}deg)`;
}

function updateDigital() {
    let j = String(clockState.jam).padStart(2, '0');
    let m = String(clockState.menit).padStart(2, '0');
    document.getElementById('digitJam').textContent   = j;
    document.getElementById('digitMenit').textContent = m;
    document.getElementById('digitJam').classList.toggle('active',   clockState.mode === 'jam');
    document.getElementById('digitMenit').classList.toggle('active', clockState.mode === 'menit');
}

function pindahMode(mode) {
    clockState.mode = mode;
    let isJam = (mode === 'jam');
    document.getElementById('btnClockNext').textContent = isJam ? 'Menit →' : '✓ Selesai';
    updateDigital();
    updateJarum();
    renderClockNumbers();
}

// ==========================================
// 4. DRAG JARUM (touch & mouse)
// ==========================================
function getAngleDariEvent(e) {
    const face = document.getElementById('clockFace');
    const rect = face.getBoundingClientRect();
    const cx = rect.left + rect.width  / 2;
    const cy = rect.top  + rect.height / 2;
    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }
    let angle = Math.atan2(clientY - cy, clientX - cx);
    return angle; // radian, -PI to PI
}

function hitungDariSudutLama(angle) {
    // Konversi angle ke nilai jam/menit
    // 12 jam: sudut -PI/2 = 0/12, searah jarum jam
    let norm = (angle + Math.PI / 2 + 2 * Math.PI) % (2 * Math.PI); // 0 sampai 2PI, mulai dari atas
    if (clockState.mode === 'jam') {
        let raw = Math.round((norm / (2 * Math.PI)) * 12);
        return raw === 12 ? 12 : raw;
    } else {
        let raw = Math.round((norm / (2 * Math.PI)) * 60);
        return raw === 60 ? 0 : raw;
    }
}

function mulaiDrag(e) {
    clockState.dragging = true;
    prosesGestur(e);
}
function drag(e) {
    if (!clockState.dragging) return;
    e.preventDefault();
    prosesGestur(e);
}
function selesaiDrag(e) {
    clockState.dragging = false;
}
function prosesGestur(e) {
    let angle = getAngleDariEvent(e);
    let val   = hitungDariSudut(angle);
    if (clockState.mode === 'jam') {
        clockState.jam = val;
    } else {
        clockState.menit = val;
    }
    updateJarum();
    updateDigital();
    renderClockNumbers();
}

// Alias agar tidak syntax error (nama fungsi di atas ada typo, diperbaiki di sini)
function hitungDariSudut(angle) {
    let norm = (angle + Math.PI / 2 + 2 * Math.PI) % (2 * Math.PI);
    if (clockState.mode === 'jam') {
        let raw = Math.round((norm / (2 * Math.PI)) * 12);
        return raw === 12 ? 12 : raw;
    } else {
        let raw = Math.round((norm / (2 * Math.PI)) * 60);
        return raw === 60 ? 0 : raw;
    }
}

// ==========================================
// 5. BUKA / TUTUP MODAL
// ==========================================
function bukaClockModal(relayName, tipe) {
    // Cek apakah panel sedang dikunci
    let btnJadwal = document.getElementById('btnJadwal' + relayName);
    if (btnJadwal && btnJadwal.disabled) return;

    clockState.relayName = relayName;
    clockState.tipe      = tipe;
    clockState.mode      = 'jam';

    // Isi nilai awal dari hidden input (jika sudah pernah diset)
    let hiddenVal = document.getElementById('jadwal' + tipe + relayName).value;
    if (hiddenVal) {
        let parts = hiddenVal.split(':');
        clockState.jam   = parseInt(parts[0], 10) || 0;
        clockState.menit = parseInt(parts[1], 10) || 0;
    } else {
        clockState.jam   = 0;
        clockState.menit = 0;
    }

    document.getElementById('clockModalTitle').textContent =
        'Pilih Jam ' + tipe + ' — ' + relayName;
    document.getElementById('btnClockNext').textContent = 'Menit →';

    updateDigital();
    updateJarum();
    renderClockNumbers();

    document.getElementById('clockModalOverlay').classList.add('show');
    document.body.style.overflow = 'hidden';
}

function tutupClockModal(e) {
    if (e && e.target !== document.getElementById('clockModalOverlay')) return;
    _tutupModal();
}

function _tutupModal() {
    document.getElementById('clockModalOverlay').classList.remove('show');
    document.body.style.overflow = '';
}

function nextStep() {
    if (clockState.mode === 'jam') {
        // Pindah ke pilih menit
        pindahMode('menit');
    } else {
        // Selesai — simpan nilai
        let j = String(clockState.jam).padStart(2, '0');
        let m = String(clockState.menit).padStart(2, '0');
        let nilai = j + ':' + m;

        // Update hidden input
        let hidden = document.getElementById('jadwal' + clockState.tipe + clockState.relayName);
        if (hidden) hidden.value = nilai;

        // Update tombol tampilan
        let nilaiEl = document.getElementById('nilai' + clockState.tipe + clockState.relayName);
        if (nilaiEl) nilaiEl.textContent = nilai;

        _tutupModal();
    }
}

// ==========================================
// 6. FIREBASE & KONTROL RELAY
// ==========================================
function setRelayFirebase(relayPin, status) {
    database.ref('IoT-PPJA/' + relayPin).set(status);
}

function toggleManual(relayPin) {
    let status = document.getElementById('slider' + relayPin).checked ? 1 : 0;
    setRelayFirebase(relayPin, status);
    if (status === 1 || status === 0) {
        database.ref('IoT-PPJA/Timer' + relayPin.replace("Relay","")).set(0);
        bukaPanel(relayPin);
    }
}

function kunciPanel(relayPin, namaMode) {
    ['slider','timer','btnTimer','btnJadwal',
     'btnWaktuOn','btnWaktuOff'].forEach(id => {
        let el = document.getElementById(id + relayPin);
        if (el) el.disabled = true;
    });
    let b = document.getElementById('boxReset' + relayPin);
    let i = document.getElementById('infoMode' + relayPin);
    if (b) b.classList.remove('d-none');
    if (i) i.innerText = "Mode Aktif: " + namaMode + " (Jalan di ESP32)";
}

function bukaPanel(relayPin) {
    ['slider','timer','btnTimer','btnJadwal',
     'btnWaktuOn','btnWaktuOff'].forEach(id => {
        let el = document.getElementById(id + relayPin);
        if (el) el.disabled = false;
    });
    let b = document.getElementById('boxReset' + relayPin);
    let i = document.getElementById('infoMode' + relayPin);
    if (b) b.classList.add('d-none');
    if (i) i.innerText = "";
}

function setTimer(relayPin) {
    let menit = document.getElementById('timer' + relayPin).value;
    if (menit > 0) {
        let nomor = relayPin.replace("Relay","");
        let endAt = Date.now() + Number(menit) * 60 * 1000;

        database.ref('IoT-PPJA/Timer'      + nomor).set(Number(menit) * 60);
        database.ref('IoT-PPJA/TimerMenit' + nomor).set(Number(menit));
        // Waktu akhir (epoch ms) disimpan supaya countdown mm:ss konsisten
        // di semua device yang buka web ini, dan tetap benar walau di-refresh.
        database.ref('IoT-PPJA/TimerEnd'   + nomor).set(endAt);
        // Langsung set Relay = ON di sini juga (tidak tunggu ESP32 polling).
        // Kalau sebelumnya OFF -> langsung nyala. Kalau sebelumnya sudah ON -> tetap ON.
        // Semua device yang buka web ini juga langsung ikut ter-update via listener realtime.
        database.ref('IoT-PPJA/Relay' + nomor).set(1);

        countdownEndAt[relayPin] = endAt;
        kunciPanel(relayPin, `Timer ${menit} Menit`);
        alert("Timer berhasil dikirim ke ESP32!");
    } else {
        alert("Masukkan angka menit yang valid!");
    }
}

function setJadwal(relayPin) {
    let jamOn  = document.getElementById('jadwalOn'  + relayPin).value;
    let jamOff = document.getElementById('jadwalOff' + relayPin).value;
    if (!jamOn && !jamOff) {
        alert("Harap pilih minimal satu jadwal (ON atau OFF)!");
        return;
    }
    let nomor = relayPin.replace("Relay","");
    database.ref('IoT-PPJA/SchON'  + nomor).set(jamOn  || "none");
    database.ref('IoT-PPJA/SchOFF' + nomor).set(jamOff || "none");
    kunciPanel(relayPin, "Penjadwalan Otomatis");
    alert("Jadwal berhasil dikirim ke ESP32!");
}

function resetSistem(relayPin) {
    let nomor = relayPin.replace("Relay","");
    database.ref('IoT-PPJA/' + relayPin).set(0);
    database.ref('IoT-PPJA/Timer'      + nomor).set(0);
    database.ref('IoT-PPJA/TimerMenit' + nomor).set(0);
    database.ref('IoT-PPJA/TimerEnd'   + nomor).set(0);
    database.ref('IoT-PPJA/SchON'      + nomor).set("none");
    database.ref('IoT-PPJA/SchOFF'     + nomor).set("none");
    countdownEndAt[relayPin] = null;
    bukaPanel(relayPin);

    let timerEl = document.getElementById('timer' + relayPin);
    if (timerEl) timerEl.value = '';

    ['On','Off'].forEach(tipe => {
        let h = document.getElementById('jadwal' + tipe + relayPin);
        let n = document.getElementById('nilai'  + tipe + relayPin);
        if (h) h.value = '';
        if (n) n.textContent = '--:--';
    });
}

// ==========================================
// 7. LISTENER REALTIME FIREBASE
// ==========================================
window.onload = function () {
    database.ref('IoT-PPJA').on('value', (snapshot) => {
        const data = snapshot.val();
        if (!data) return;

        for (let i = 1; i <= 4; i++) {
            let rn  = "Relay" + i;
            let slider = document.getElementById('slider' + rn);
            let label  = document.getElementById('labelStatus' + rn);
            if (!slider || !label) continue;

            let statusRelay = data["Relay" + i];
            let timerDetik  = data["Timer" + i];
            let timerMenit  = data["TimerMenit" + i];
            let timerEnd    = data["TimerEnd" + i];
            let schOn       = data["SchON"  + i];
            let schOff      = data["SchOFF" + i];

            slider.checked  = (statusRelay === 1);
            label.innerText = statusRelay === 1 ? "ON" : "OFF";
            label.className = statusRelay === 1
                ? "form-check-label text-success"
                : "form-check-label text-danger";

            let jadwalAktif = (schOn && schOn !== "none") || (schOff && schOff !== "none");
            let timerAktif  = !!(timerMenit && timerMenit > 0);

            // ===== KARTU STATUS DI DASHBOARD =====
            let badge = document.getElementById('statusBadge' + rn);
            let modeEl = document.getElementById('statusMode' + rn);
            let card = document.getElementById('statusCard' + rn);
            if (badge && modeEl && card) {
                let isOn = statusRelay === 1;
                badge.textContent = isOn ? 'ON' : 'OFF';
                badge.className = 'status-card-badge ' + (isOn ? 'is-on' : 'is-off');
                card.classList.toggle('is-active', isOn);

                let modeText = 'Manual';
                if (jadwalAktif) modeText = 'Jadwal';
                else if (timerAktif) modeText = 'Timer ' + timerMenit + ' mnt';
                modeEl.textContent = modeText;
            }

            if (jadwalAktif) {
                // Restore tampilan tombol
                if (schOn  && schOn  !== "none") {
                    let h = document.getElementById('jadwalOn'  + rn);
                    let n = document.getElementById('nilaiOn'   + rn);
                    if (h) h.value = schOn;
                    if (n) n.textContent = schOn;
                }
                if (schOff && schOff !== "none") {
                    let h = document.getElementById('jadwalOff' + rn);
                    let n = document.getElementById('nilaiOff'  + rn);
                    if (h) h.value = schOff;
                    if (n) n.textContent = schOff;
                }
                try { kunciPanel(rn, "Penjadwalan Otomatis"); } catch(e) {}
                countdownEndAt[rn] = null; // bukan mode timer -> tidak perlu hitung mundur

            } else if (timerAktif) {
                let el = document.getElementById('timer' + rn);
                if (el) el.value = timerMenit;
                try { kunciPanel(rn, `Timer ${timerMenit} Menit`); } catch(e) {}

                // Aktifkan hitung mundur mm:ss dari waktu akhir yang tersimpan.
                // Kalau field TimerEnd belum ada (device lama), fallback pakai
                // "sekarang + sisa menit" supaya tetap ada tampilan hitung mundur.
                if (timerEnd && timerEnd > 0) {
                    countdownEndAt[rn] = timerEnd;
                } else if (!countdownEndAt[rn]) {
                    countdownEndAt[rn] = Date.now() + (timerMenit * 60 * 1000);
                }
                updateAllCountdowns();

            } else {
                // Tidak ada jadwal & tidak ada timer aktif -> panel normal.
                // Ini juga yang membuat panel OTOMATIS ter-unlock begitu
                // ESP32 mereset TimerMenit ke 0 setelah timer selesai.
                try { bukaPanel(rn); } catch(e) {}
                let timerEl = document.getElementById('timer' + rn);
                if (timerEl) timerEl.value = '';
                countdownEndAt[rn] = null;
            }
        }
    });
};

// ==========================================
// 8. DASHBOARD STATUS -> TAMPILKAN PANEL CONTROLLER
// ==========================================
// Panel controller (tab + form on/off/timer/jadwal) disembunyikan secara
// default. Baru muncul begitu salah satu dari 4 kartu status diklik.
function gotoRelay(relayName) {
    let nomor = relayName.replace("Relay", "");

    let section = document.getElementById('controllerSection');
    if (section) section.classList.remove('d-none');

    let btn = document.querySelector('[data-bs-target="#tab-relay' + nomor + '"]');
    if (btn && window.bootstrap) {
        bootstrap.Tab.getOrCreateInstance(btn).show();
    }

    if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function kembaliDashboard() {
    let section = document.getElementById('controllerSection');
    if (section) section.classList.add('d-none');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}