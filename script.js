// ==========================================
// 1. KONFIGURASI & INISIALISASI FIREBASE
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyBhPYRXyxePX_y12XTk3agb3PSbTBdnvac",
    databaseURL: "https://ppja-iot-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "ppja-iot"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const database = firebase.database();

// --------------------------------------------------
// Fungsi Mengirim Data ke Firebase
// --------------------------------------------------
function setRelayFirebase(relayPin, status) {
    database.ref('IoT-PPJA/' + relayPin).set(status);
}

// 1. KONTROL MANUAL
function toggleManual(relayPin) {
    let status = document.getElementById('slider' + relayPin).checked ? 1 : 0;
    setRelayFirebase(relayPin, status);

    if (status === 1 || status === 0) {
        let nomor = relayPin.replace("Relay", "");
        database.ref('IoT-PPJA/Timer' + nomor).set(0);
        bukaPanel(relayPin);
    }
}

// --------------------------------------------------
// Fungsi Kunci & Buka Panel UI
// --------------------------------------------------
function kunciPanel(relayPin, namaMode) {
    const ids = ['slider', 'timer', 'btnTimer', 'jadwalOn', 'jadwalOff', 'btnJadwal'];
    ids.forEach(id => {
        const el = document.getElementById(id + relayPin);
        if (el) el.disabled = true;
    });

    const boxReset = document.getElementById('boxReset' + relayPin);
    const infoMode = document.getElementById('infoMode' + relayPin);
    if (boxReset) boxReset.classList.remove('d-none');
    if (infoMode) infoMode.innerText = "Mode Aktif: " + namaMode + " (Jalan di ESP32)";
}

function bukaPanel(relayPin) {
    const ids = ['slider', 'timer', 'btnTimer', 'jadwalOn', 'jadwalOff', 'btnJadwal'];
    ids.forEach(id => {
        const el = document.getElementById(id + relayPin);
        if (el) el.disabled = false;
    });

    const boxReset = document.getElementById('boxReset' + relayPin);
    const infoMode = document.getElementById('infoMode' + relayPin);
    if (boxReset) boxReset.classList.add('d-none');
    if (infoMode) infoMode.innerText = "";
}

// --------------------------------------------------
// 2. FITUR DURASI TIMER
// --------------------------------------------------
function setTimer(relayPin) {
    let inputMenit = document.getElementById('timer' + relayPin).value;

    if (inputMenit > 0) {
        let detik = inputMenit * 60;
        let nomor = relayPin.replace("Relay", "");
        database.ref('IoT-PPJA/Timer' + nomor).set(detik);
        kunciPanel(relayPin, `Timer ${inputMenit} Menit`);
        alert("Timer berhasil dikirim ke ESP32! Anda bisa menutup web ini.");
    } else {
        alert("Masukkan angka menit yang valid!");
    }
}

// --------------------------------------------------
// 3. FITUR PENJADWALAN JAM
// --------------------------------------------------
function setJadwal(relayPin) {
    let jamOn = document.getElementById('jadwalOn' + relayPin).value;
    let jamOff = document.getElementById('jadwalOff' + relayPin).value;

    if (!jamOn && !jamOff) {
        alert("Harap isi minimal satu jadwal (ON atau OFF)!");
        return;
    }

    let nomor = relayPin.replace("Relay", "");

    if (jamOn) database.ref('IoT-PPJA/SchON' + nomor).set(jamOn);
    else database.ref('IoT-PPJA/SchON' + nomor).set("none");

    if (jamOff) database.ref('IoT-PPJA/SchOFF' + nomor).set(jamOff);
    else database.ref('IoT-PPJA/SchOFF' + nomor).set("none");

    kunciPanel(relayPin, "Penjadwalan Otomatis");
    alert("Jadwal berhasil dikirim ke ESP32! Anda bisa menutup web ini.");
}

// --------------------------------------------------
// 4. FITUR ATUR ULANG (RESET)
// --------------------------------------------------
function resetSistem(relayPin) {
    let nomor = relayPin.replace("Relay", "");

    database.ref('IoT-PPJA/' + relayPin).set(0);
    database.ref('IoT-PPJA/Timer' + nomor).set(0);
    database.ref('IoT-PPJA/SchON' + nomor).set("none");
    database.ref('IoT-PPJA/SchOFF' + nomor).set("none");

    bukaPanel(relayPin);

    const timerEl = document.getElementById('timer' + relayPin);
    const jadwalOnEl = document.getElementById('jadwalOn' + relayPin);
    const jadwalOffEl = document.getElementById('jadwalOff' + relayPin);
    if (timerEl) timerEl.value = '';
    if (jadwalOnEl) jadwalOnEl.value = '';
    if (jadwalOffEl) jadwalOffEl.value = '';
}

// ==========================================
// 5. LISTENER REALTIME FIREBASE
// ==========================================
window.onload = function () {
    database.ref('IoT-PPJA').on('value', (snapshot) => {
        const data = snapshot.val();

        if (data) {
            for (let i = 1; i <= 4; i++) {
                let relayName = "Relay" + i;
                let timerName = "Timer" + i;
                let schOnName = "SchON" + i;
                let schOffName = "SchOFF" + i;

                let slider = document.getElementById('slider' + relayName);
                let label = document.getElementById('labelStatus' + relayName);

                if (slider && label) {
                    let statusRelay = data[relayName];
                    let timerValue = data[timerName];
                    let schOn = data[schOnName];
                    let schOff = data[schOffName];

                    // Update posisi slider dan label
                    slider.checked = (statusRelay === 1);
                    label.innerText = (statusRelay === 1) ? "ON" : "OFF";
                    label.className = (statusRelay === 1)
                        ? "form-check-label text-success"
                        : "form-check-label text-danger";

                    // ============================================
                    // RESTORE STATE PANEL SETELAH REFRESH
                    // Cek Firebase apakah ada timer/jadwal aktif
                    // ============================================
                    const jadwalOnEl = document.getElementById('jadwalOn' + relayName);
                    const jadwalOffEl = document.getElementById('jadwalOff' + relayName);
                    const timerEl = document.getElementById('timer' + relayName);

                    // Cek apakah jadwal masih aktif (bukan "none" dan bukan kosong)
                    const jadwalAktif = (schOn && schOn !== "none") || (schOff && schOff !== "none");

                    if (jadwalAktif) {
                        // Restore nilai input jadwal ke form
                        if (jadwalOnEl && schOn && schOn !== "none") jadwalOnEl.value = schOn;
                        if (jadwalOffEl && schOff && schOff !== "none") jadwalOffEl.value = schOff;
                        // Kunci panel dengan mode jadwal
                        kunciPanel(relayName, "Penjadwalan Otomatis");
                    } else if (timerValue === 0 && statusRelay === 0) {
                        // Timer sudah selesai & relay mati → buka panel
                        try { bukaPanel(relayName); } catch (e) { /* abaikan */ }
                    }
                    // Catatan: timer > 0 tidak perlu restore karena ESP32 langsung 
                    // mereset timer ke 0 dan mengambil alih kontrol
                }
            }
        }
    });
};
