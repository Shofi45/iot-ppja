// ==========================================
// 1. KONFIGURASI & INISIALISASI FIREBASE
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyBhPYRXyxePX_y12XTk3agb3PSbTBdnvac",
    databaseURL: "https://ppja-iot-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "ppja-iot"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Objek untuk menyimpan tugas yang sedang berjalan agar bisa dibatalkan
let tugasAktif = {
    Relay1: { timerId: null, jadwalOnId: null, jadwalOffId: null },
    Relay2: { timerId: null, jadwalOnId: null, jadwalOffId: null },
    Relay3: { timerId: null, jadwalOnId: null, jadwalOffId: null },
    Relay4: { timerId: null, jadwalOnId: null, jadwalOffId: null }
};

// --------------------------------------------------
// Fungsi Mengirim Data & Mengubah UI Slider
// --------------------------------------------------
function setRelayFirebase(relayPin, status) {
    database.ref('IoT-PPJA/' + relayPin).set(status);
    
    // Perbarui tampilan Slider di Web
    let slider = document.getElementById('slider' + relayPin);
    let label = document.getElementById('labelStatus' + relayPin);
    
    if(slider && label) {
        slider.checked = (status === 1);
        label.innerText = status === 1 ? "ON" : "OFF";
        label.className = status === 1 ? "form-check-label text-success" : "form-check-label text-danger";
    }
}

// 1. KONTROL MANUAL (Dari klik Slider)
function toggleManual(relayPin) {
    let status = document.getElementById('slider' + relayPin).checked ? 1 : 0;
    setRelayFirebase(relayPin, status);
}

// --------------------------------------------------
// Fungsi Kunci & Buka Panel UI
// --------------------------------------------------
function kunciPanel(relayPin, namaMode) {
    // Matikan semua input agar tidak bisa di-klik sembarangan
    document.getElementById('slider' + relayPin).disabled = true;
    document.getElementById('timer' + relayPin).disabled = true;
    document.getElementById('btnTimer' + relayPin).disabled = true;
    document.getElementById('jadwalOn' + relayPin).disabled = true;
    document.getElementById('jadwalOff' + relayPin).disabled = true;
    document.getElementById('btnJadwal' + relayPin).disabled = true;

    // Tampilkan tombol Atur Ulang
    document.getElementById('boxReset' + relayPin).classList.remove('d-none');
    document.getElementById('infoMode' + relayPin).innerText = "Mode Aktif: " + namaMode;
}

function bukaPanel(relayPin) {
    // Buka kembali semua input
    document.getElementById('slider' + relayPin).disabled = false;
    document.getElementById('timer' + relayPin).disabled = false;
    document.getElementById('btnTimer' + relayPin).disabled = false;
    document.getElementById('jadwalOn' + relayPin).disabled = false;
    document.getElementById('jadwalOff' + relayPin).disabled = false;
    document.getElementById('btnJadwal' + relayPin).disabled = false;

    // Sembunyikan tombol Atur Ulang
    document.getElementById('boxReset' + relayPin).classList.add('d-none');
}

// --------------------------------------------------
// 2. FITUR DURASI TIMER
// --------------------------------------------------
function setTimer(relayPin) {
    let inputMenit = document.getElementById('timer' + relayPin).value;
    
    if (inputMenit > 0) {
        kunciPanel(relayPin, `Timer ${inputMenit} Menit`);
        setRelayFirebase(relayPin, 1); // Langsung Nyala
        
        let waktuMilidetik = inputMenit * 60 * 1000;
        
        tugasAktif[relayPin].timerId = setTimeout(() => {
            setRelayFirebase(relayPin, 0); // Mati saat habis
            bukaPanel(relayPin);
            alert(`Waktu Timer habis! ${relayPin} telah dimatikan.`);
        }, waktuMilidetik);
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

    kunciPanel(relayPin, "Penjadwalan Otomatis");

    if (jamOn) {
        tugasAktif[relayPin].jadwalOnId = setInterval(() => {
            let now = new Date();
            let formatJam = String(now.getHours()).padStart(2, '0') + ":" + String(now.getMinutes()).padStart(2, '0');
            if (formatJam === jamOn) setRelayFirebase(relayPin, 1);
        }, 1000);
    }

    if (jamOff) {
        tugasAktif[relayPin].jadwalOffId = setInterval(() => {
            let now = new Date();
            let formatJam = String(now.getHours()).padStart(2, '0') + ":" + String(now.getMinutes()).padStart(2, '0');
            if (formatJam === jamOff) setRelayFirebase(relayPin, 0);
        }, 1000);
    }
}

// --------------------------------------------------
// 4. FITUR ATUR ULANG (RESET)
// --------------------------------------------------
function resetSistem(relayPin) {
    // Bersihkan semua proses yang tertunda di memori
    clearTimeout(tugasAktif[relayPin].timerId);
    clearInterval(tugasAktif[relayPin].jadwalOnId);
    clearInterval(tugasAktif[relayPin].jadwalOffId);
    
    // Matikan relay untuk keamanan saat di-reset
    setRelayFirebase(relayPin, 0);
    
    // Buka kunci UI kembali
    bukaPanel(relayPin);
    
    // Kosongkan nilai form
    document.getElementById('timer' + relayPin).value = '';
    document.getElementById('jadwalOn' + relayPin).value = '';
    document.getElementById('jadwalOff' + relayPin).value = '';
}