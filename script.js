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
// Fungsi Mengirim Data & Mengubah UI Slider
// --------------------------------------------------
function setRelayFirebase(relayPin, status) {
    database.ref('IoT-PPJA/' + relayPin).set(status);
}

// 1. KONTROL MANUAL (Dari klik Slider)
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
    document.getElementById('slider' + relayPin).disabled = true;
    document.getElementById('timer' + relayPin).disabled = true;
    document.getElementById('btnTimer' + relayPin).disabled = true;
    document.getElementById('jadwalOn' + relayPin).disabled = true;
    document.getElementById('jadwalOff' + relayPin).disabled = true;
    document.getElementById('btnJadwal' + relayPin).disabled = true;

    document.getElementById('boxReset' + relayPin).classList.remove('d-none');
    document.getElementById('infoMode' + relayPin).innerText = "Mode Aktif: " + namaMode + " (Jalan di ESP32)";
}

function bukaPanel(relayPin) {
    document.getElementById('slider' + relayPin).disabled = false;
    document.getElementById('timer' + relayPin).disabled = false;
    document.getElementById('btnTimer' + relayPin).disabled = false;
    document.getElementById('jadwalOn' + relayPin).disabled = false;
    document.getElementById('jadwalOff' + relayPin).disabled = false;
    document.getElementById('btnJadwal' + relayPin).disabled = false;

    document.getElementById('boxReset' + relayPin).classList.add('d-none');
    document.getElementById('infoMode' + relayPin).innerText = "";
}

// --------------------------------------------------
// 2. FITUR DURASI TIMER (Kirim ke ESP32)
// --------------------------------------------------
function setTimer(relayPin) {
    let inputMenit = document.getElementById('timer' + relayPin).value;
    
    if (inputMenit > 0) {
        let detik = inputMenit * 60;
        let nomor = relayPin.replace("Relay", "");
        
        // Simpan menit ke Firebase agar bisa di-restore saat refresh
        database.ref('IoT-PPJA/Timer' + nomor).set(detik);
        database.ref('IoT-PPJA/TimerMenit' + nomor).set(Number(inputMenit));
        
        kunciPanel(relayPin, `Timer ${inputMenit} Menit`);
        alert("Timer berhasil dikirim ke ESP32! Anda bisa menutup web ini.");
    } else {
        alert("Masukkan angka menit yang valid!");
    }
}

// --------------------------------------------------
// 3. FITUR PENJADWALAN JAM (Kirim ke ESP32)
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
    database.ref('IoT-PPJA/TimerMenit' + nomor).set(0);
    database.ref('IoT-PPJA/SchON' + nomor).set("none");
    database.ref('IoT-PPJA/SchOFF' + nomor).set("none");
    
    bukaPanel(relayPin);
    
    document.getElementById('timer' + relayPin).value = '';
    document.getElementById('jadwalOn' + relayPin).value = '';
    document.getElementById('jadwalOff' + relayPin).value = '';
}

// ==========================================
// 5. LISTENER REALTIME FIREBASE (Sinkronisasi Dua Arah)
// ==========================================
window.onload = function() {
    database.ref('IoT-PPJA').on('value', (snapshot) => {
        const data = snapshot.val();
        
        if (data) {
            for (let i = 1; i <= 4; i++) {
                let relayName = "Relay" + i;
                let timerName = "Timer" + i;
                let timerMenitName = "TimerMenit" + i;
                let schOnName  = "SchON" + i;
                let schOffName = "SchOFF" + i;
                
                let slider = document.getElementById('slider' + relayName);
                let label  = document.getElementById('labelStatus' + relayName);
                
                if (slider && label) {
                    let statusRelay  = data[relayName];
                    let timerDetik   = data[timerName];
                    let timerMenit   = data[timerMenitName];
                    let schOn        = data[schOnName];
                    let schOff       = data[schOffName];

                    // Update slider & label
                    slider.checked = (statusRelay === 1);
                    label.innerText = (statusRelay === 1) ? "ON" : "OFF";
                    label.className = (statusRelay === 1)
                        ? "form-check-label text-success"
                        : "form-check-label text-danger";

                    // --- RESTORE STATE SETELAH REFRESH ---

                    // Cek apakah jadwal masih aktif
                    let jadwalAktif = (schOn && schOn !== "none") || (schOff && schOff !== "none");

                    if (jadwalAktif) {
                        // Kembalikan nilai jam ke input
                        let elOn  = document.getElementById('jadwalOn'  + relayName);
                        let elOff = document.getElementById('jadwalOff' + relayName);
                        if (elOn  && schOn  && schOn  !== "none") elOn.value  = schOn;
                        if (elOff && schOff && schOff !== "none") elOff.value = schOff;
                        try { kunciPanel(relayName, "Penjadwalan Otomatis"); } catch(e) {}

                    } else if (timerMenit && timerMenit > 0) {
                        // Timer masih dalam antrian / sedang berjalan di ESP32
                        // Kembalikan angka menit ke input dan kunci panel
                        let elTimer = document.getElementById('timer' + relayName);
                        if (elTimer) elTimer.value = timerMenit;
                        try { kunciPanel(relayName, `Timer ${timerMenit} Menit`); } catch(e) {}

                    } else if (timerDetik === 0 && statusRelay === 0) {
                        // Tidak ada mode aktif → buka panel
                        try { bukaPanel(relayName); } catch(e) {}
                    }
                }
            }
        }
    });
};
