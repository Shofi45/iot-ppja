// ==========================================
// 1. KONFIGURASI & INISIALISASI FIREBASE
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyBhPYRXyxePX_y12XTk3agb3PSbTBdnvac",
    databaseURL: "https://ppja-iot-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "ppja-iot"
};

// Pastikan firebase diinisialisasi hanya sekali
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const database = firebase.database();

// --------------------------------------------------
// Fungsi Mengirim Data & Mengubah UI Slider
// --------------------------------------------------
function setRelayFirebase(relayPin, status) {
    // Mengirim status ke Firebase (contoh: IoT-PPJA/Relay1 = 1)
    database.ref('IoT-PPJA/' + relayPin).set(status);
}

// 1. KONTROL MANUAL (Dari klik Slider)
function toggleManual(relayPin) {
    let status = document.getElementById('slider' + relayPin).checked ? 1 : 0;
    setRelayFirebase(relayPin, status);
    
    // Pastikan jika dinyalakan manual, timer dan jadwal di-reset di Firebase
    if (status === 1 || status === 0) {
        let nomor = relayPin.replace("Relay", ""); // Ambil angka saja, misal "1"
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
        // Konversi ke detik karena ESP32 menghitung dalam detik
        let detik = inputMenit * 60;
        
        // Ambil nomor relay (Misal: dari "Relay1" jadi "1")
        let nomor = relayPin.replace("Relay", "");
        
        // Kirim data ke Firebase (Misal: IoT-PPJA/Timer1 = 60)
        database.ref('IoT-PPJA/Timer' + nomor).set(detik);
        
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

    let nomor = relayPin.replace("Relay", ""); // Ambil nomor relay

    // Kirim jadwal ke Firebase
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
    
    // Matikan relay dan reset semua parameter di Firebase
    database.ref('IoT-PPJA/' + relayPin).set(0);
    database.ref('IoT-PPJA/Timer' + nomor).set(0);
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
// Fungsi ini menggantikan fetch() sekali jalan. 
// on('value') akan terus memantau Firebase. Jika ESP32 mematikan relay, web akan otomatis ikut mati.
window.onload = function() {
    database.ref('IoT-PPJA').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            // Update UI untuk Relay 1
            if (document.getElementById('sliderRelay1')) {
                let slider1 = document.getElementById('sliderRelay1');
                let label1 = document.getElementById('labelStatusRelay1');
                slider1.checked = (data.Relay1 === 1);
                label1.innerText = (data.Relay1 === 1) ? "ON" : "OFF";
                label1.className = (data.Relay1 === 1) ? "form-check-label text-success" : "form-check-label text-danger";
                
                // Jika timer/jadwal sudah direset oleh ESP32 (menjadi 0), buka kunci panel
                if(data.Timer1 === 0 && data.Relay1 === 0) {
                    bukaPanel("Relay1");
                }
            }
            
            // Lakukan hal yang sama untuk Relay2, Relay3, Relay4 jika perlu
            // ...
        }
    });
};