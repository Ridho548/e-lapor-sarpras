// ================= KONFIGURASI FIREBASE REALTIME DATABASE =================
const firebaseConfig = {
    apiKey: "AIzaSyB2O7rAPl2PHChs-K5KueQfWeAx0EMyAmg",
    authDomain: "elapor-smkn1dlanggu.firebaseapp.com",
    databaseURL: "https://elapor-smkn1dlanggu-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "elapor-smkn1dlanggu",
    storageBucket: "elapor-smkn1dlanggu.firebasestorage.app",
    messagingSenderId: "188223976329",
    appId: "1:188223976329:web:6c24eb4d3c32c5c15e6758",
    measurementId: "G-DCK9ZRBGES"
};

let rtdb = null;
let isCloudActive = false;

try {
    if (typeof firebase !== "undefined") {
        firebase.initializeApp(firebaseConfig);
        rtdb = firebase.database();
        isCloudActive = true;
    }
} catch (err) {
    console.warn("⚠️ Mode Penyimpanan Lokal aktif:", err.message);
}

let selectedRole = "kelas";
let currentSession = null;
let currentFilter = "ALL";
let searchQuery = "";
let compressedPhotoData = "";

// ================= DATABASE PIN PRIVAT UNIK PER KELAS =================
const defaultClassPins = {
    "X RPL 1": "4821",
    "X RPL 2": "7390",
    "XI RPL 1": "1954",
    "XI RPL 2": "6208",
    "LAB JARKOM": "9012"
};

const ADMIN_PIN = "admin123";
let classPins = JSON.parse(localStorage.getItem("elapor_class_pins")) || defaultClassPins;

const sampleReports = [
    {
        id: "REP-101",
        jenis: "Kerusakan",
        kelas: "LAB JARKOM",
        pj: "Ridho (Asisten Lab)",
        kategori: "💻 PC & Jaringan Lab",
        lokasi: "Meja Komputer No. 04",
        deskripsi: "Kabel UTP RJ45 terlepas dari konektor dan tidak mendapat koneksi IP DHCP.",
        foto: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=600&q=60",
        status: "Diproses",
        waktu: "12 Nov 2026, 09:30",
        createdAt: Date.now(),
        catatanAdmin: "Sedang disiapkan tang crimping dan konektor RJ45 baru."
    }
];

let reports = JSON.parse(localStorage.getItem("elapor_reports")) || sampleReports;

// Elemen DOM
const roleBtns = document.querySelectorAll(".role-btn");
const kelasFields = document.getElementById("kelas-fields");
const adminFields = document.getElementById("admin-fields");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");
const inputPinEl = document.getElementById("input-pin");

const loginScreen = document.getElementById("login-screen");
const mainScreen = document.getElementById("main-screen");
const btnLogout = document.getElementById("btn-logout");

const searchInput = document.getElementById("search-input");
const reportListEl = document.getElementById("report-list");
const filterChips = document.querySelectorAll(".chip");

const formModal = document.getElementById("form-modal");
const btnCloseForm = document.getElementById("btn-close-form");
const reportForm = document.getElementById("report-form");
const repJenisEl = document.getElementById("rep-jenis");
const repFotoInput = document.getElementById("rep-foto");
const photoPreviewBox = document.getElementById("photo-preview-box");
const photoPreviewImg = document.getElementById("photo-preview-img");

const adminModal = document.getElementById("admin-modal");
const btnCloseAdmin = document.getElementById("btn-close-admin");
const adminUpdateForm = document.getElementById("admin-update-form");

const pinModal = document.getElementById("pin-modal");
const btnClosePin = document.getElementById("btn-close-pin");
const pinListContainer = document.getElementById("pin-list-container");

const lightboxModal = document.getElementById("lightbox-modal");
const lightboxImg = document.getElementById("lightbox-img");
const btnCloseLightbox = document.getElementById("btn-close-lightbox");
const toastContainer = document.getElementById("toast-container");

// ================= LABEL OTOMATIS (KERUSAKAN VS PEMASANGAN) =================
function updateFormLabels() {
    if (!repJenisEl) return;
    const isPasang = repJenisEl.value === "Pemasangan";
    const labelDesc = document.getElementById("label-deskripsi");
    const inputDesc = document.getElementById("rep-deskripsi");
    const labelFoto = document.getElementById("label-foto");
    const selectKat = document.getElementById("rep-kategori");

    if (labelDesc) {
        labelDesc.textContent = isPasang
            ? "Detail Barang & Kebutuhan Pemasangan"
            : "Keterangan Kerusakan";
    }
    if (inputDesc) {
        inputDesc.placeholder = isPasang
            ? "Contoh: Pasang kipas dinding baru di sudut kanan kelas, butuh bor tembok & fischer..."
            : "Jelaskan kondisi kerusakan secara singkat...";
    }
    if (labelFoto) {
        labelFoto.textContent = isPasang
            ? "Foto Titik Tembok / Lokasi Pemasangan"
            : "Foto Bukti Kerusakan (Kamera / Galeri)";
    }
    if (isPasang && selectKat) {
        selectKat.value = "📌 Pemasangan Kipas / Aksesoris Kelas";
    }
}

if (repJenisEl) {
    repJenisEl.addEventListener("change", updateFormLabels);
}

// ================= NOTIFIKASI TOAST =================
function showToast(message, type = "info") {
    if (!toastContainer) return;
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ================= ZOOM FOTO LAYAR PENUH =================
window.openLightbox = (src) => {
    if (!lightboxModal || !lightboxImg) return;
    lightboxImg.src = src;
    lightboxModal.classList.add("active");
};

if (btnCloseLightbox) {
    btnCloseLightbox.addEventListener("click", () => lightboxModal.classList.remove("active"));
}
if (lightboxModal) {
    lightboxModal.addEventListener("click", (e) => {
        if (e.target === lightboxModal) lightboxModal.classList.remove("active");
    });
}

// Indikator status koneksi
const feedHeaderEl = document.querySelector(".feed-header");
if (feedHeaderEl) {
    feedHeaderEl.style.display = "flex";
    feedHeaderEl.style.justifyContent = "space-between";
    feedHeaderEl.style.alignItems = "center";
    feedHeaderEl.innerHTML = `
      <h3>📋 Daftar Laporan</h3>
      <span class="sync-badge">${isCloudActive ? "🟢 Cloud Real-Time" : "🟡 Penyimpanan Lokal"}</span>
    `;
}

// ================= LISTENER REAL-TIME DATABASE =================
if (isCloudActive && rtdb) {
    rtdb.ref("reports").on("value", (snapshot) => {
        const val = snapshot.val();
        if (val) {
            reports = Object.entries(val)
                .map(([key, item]) => ({ firebaseKey: key, ...item }))
                .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        } else {
            reports = [];
        }
        if (currentSession) renderReports();
    });

    rtdb.ref("settings/classPins").on("value", (snapshot) => {
        if (snapshot.exists()) {
            classPins = snapshot.val();
        } else {
            rtdb.ref("settings/classPins").set(defaultClassPins);
        }
    });
}

// ================= LOGIN & VERIFIKASI PIN UNIK =================
roleBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
        roleBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        selectedRole = btn.dataset.role;

        kelasFields.style.display = selectedRole === "kelas" ? "block" : "none";
        adminFields.style.display = selectedRole === "admin" ? "block" : "none";
        loginError.textContent = "";
    });
});

loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const pin = inputPinEl.value.trim();
    const actionBar = document.getElementById("kelas-action-bar");

    if (selectedRole === "kelas") {
        const kelas = document.getElementById("select-kelas").value;
        const pj = document.getElementById("input-pj").value.trim();

        if (!pj) {
            loginError.textContent = "⚠️ Nama Ketua/Sekretaris penginput wajib diisi.";
            return;
        }

        if (pin !== classPins[kelas]) {
            loginError.textContent = `❌ PIN Privat untuk kelas ${kelas} salah! Hubungi petugas Sarpras jika lupa.`;
            return;
        }

        currentSession = { role: "kelas", kelas, pj };
        document.getElementById("header-role-badge").textContent = "AKUN RESMI KELAS";
        document.getElementById("header-user-title").textContent = kelas;
        document.getElementById("header-user-sub").textContent = `Penanggung Jawab: ${pj}`;

        actionBar.innerHTML = `<button type="button" id="btn-open-form" class="btn btn-primary btn-full">📸 + Buat Laporan / Pengajuan Baru</button>`;
        document.getElementById("btn-open-form").addEventListener("click", openReportModal);
        showToast(`Selamat datang, ${kelas}!`, "success");
    } else {
        if (pin !== ADMIN_PIN) {
            loginError.textContent = "❌ PIN Admin Sarpras salah.";
            return;
        }

        currentSession = { role: "admin", kelas: "ADMIN", pj: "Petugas Sarpras" };
        document.getElementById("header-role-badge").textContent = "PETUGAS SARPRAS";
        document.getElementById("header-user-title").textContent = "Admin Sarana & Prasarana";
        document.getElementById("header-user-sub").textContent = "Mode Kontrol & Penanganan";

        actionBar.innerHTML = `
        <div class="admin-toolbar">
          <button type="button" id="btn-open-pin-mgr" class="btn btn-teal">🔑 PIN Privat Kelas</button>
          <button type="button" id="btn-print-rekap" class="btn btn-primary">🖨️ Cetak Rekap</button>
        </div>
      `;
        document.getElementById("btn-open-pin-mgr").addEventListener("click", openPinManager);
        document.getElementById("btn-print-rekap").addEventListener("click", () => window.print());
        showToast("Masuk sebagai Admin Sarpras", "success");
    }

    loginError.textContent = "";
    loginScreen.classList.remove("active");
    mainScreen.classList.add("active");
    renderReports();
});

btnLogout.addEventListener("click", () => {
    currentSession = null;
    searchQuery = "";
    if (searchInput) searchInput.value = "";
    inputPinEl.value = "";
    mainScreen.classList.remove("active");
    loginScreen.classList.add("active");
});

// ================= MANAJEMEN PIN KELAS (KHUSUS ADMIN) =================
function openPinManager() {
    renderPinList();
    pinModal.classList.add("active");
}

btnClosePin.addEventListener("click", () => pinModal.classList.remove("active"));

window.regeneratePin = async (kelas) => {
    if (!confirm(`Acak ulang PIN privat untuk kelas ${kelas}? PIN lama tidak akan bisa dipakai lagi.`)) return;

    const newPin = String(Math.floor(1000 + Math.random() * 9000));
    classPins[kelas] = newPin;

    if (isCloudActive && rtdb) {
        await rtdb.ref("settings/classPins").set(classPins);
    } else {
        localStorage.setItem("elapor_class_pins", JSON.stringify(classPins));
    }
    renderPinList();
    showToast(`PIN ${kelas} diperbarui menjadi ${newPin}`, "success");
};

function renderPinList() {
    pinListContainer.innerHTML = Object.entries(classPins)
        .map(
            ([kelas, pin]) => `
        <div class="pin-item">
          <div>
            <strong style="display:block; font-size:0.9rem;">${kelas}</strong>
            <small style="color:#94a3b8; font-size:0.75rem;">PIN Aktif Saat Ini</small>
          </div>
          <div style="display:flex; align-items:center; gap:10px;">
            <span class="pin-code-badge">${pin}</span>
            <button type="button" class="btn-reset-pin" onclick="regeneratePin('${kelas}')">🔄 Acak Ulang</button>
          </div>
        </div>
      `
        )
        .join("");
}

// ================= KOMPRESI FOTO KAMERA OTOMATIS =================
repFotoInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement("canvas");
            const maxW = 640;
            const scale = Math.min(1, maxW / img.width);
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;

            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            compressedPhotoData = canvas.toDataURL("image/jpeg", 0.65);

            photoPreviewImg.src = compressedPhotoData;
            photoPreviewBox.style.display = "block";
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
});

// ================= BUAT LAPORAN / PENGAJUAN BARU (KELAS) =================
function openReportModal() {
    reportForm.reset();
    updateFormLabels();
    compressedPhotoData = "";
    photoPreviewBox.style.display = "none";
    formModal.classList.add("active");
}

btnCloseForm.addEventListener("click", () => formModal.classList.remove("active"));

reportForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!compressedPhotoData) {
        showToast("⚠️ Lampirkan foto bukti / lokasi dulu!", "error");
        return;
    }

    const jenis = repJenisEl ? repJenisEl.value : "Kerusakan";
    const kategori = document.getElementById("rep-kategori").value;
    const lokasi = document.getElementById("rep-lokasi").value.trim();
    const deskripsi = document.getElementById("rep-deskripsi").value.trim();

    const duplicate = reports.find(
        (r) => r.kelas === currentSession.kelas && r.kategori === kategori && r.status !== "Selesai"
    );
    if (duplicate) {
        const lanjut = confirm(
            `⚠️ Kelas ${currentSession.kelas} sudah memiliki pengajuan aktif pada kategori "${kategori}" (${duplicate.status}). Tetap kirim?`
        );
        if (!lanjut) return;
    }

    const submitBtn = reportForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = "⏳ Mengirim ke Server...";

    const now = new Date();
    const waktuStr =
        now.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) +
        ", " +
        now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

    const newReport = {
        id: "REP-" + Math.floor(100 + Math.random() * 900),
        jenis,
        kelas: currentSession.kelas,
        pj: currentSession.pj,
        kategori,
        lokasi,
        deskripsi,
        foto: compressedPhotoData,
        status: "Menunggu",
        waktu: waktuStr,
        createdAt: Date.now(),
        catatanAdmin: ""
    };

    try {
        if (isCloudActive && rtdb) {
            await rtdb.ref("reports").push(newReport);
        } else {
            reports.unshift(newReport);
            localStorage.setItem("elapor_reports", JSON.stringify(reports));
            renderReports();
        }
        formModal.classList.remove("active");
        showToast("✅ Pengajuan berhasil dikirim!", "success");
    } catch (err) {
        showToast("❌ Gagal mengirim: " + err.message, "error");
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "🚀 Kirim Pengajuan Sekarang";
    }
});

// ================= UPDATE & HAPUS LAPORAN (ADMIN SARPRAS) =================
window.openAdminEdit = (id) => {
    const target = reports.find((r) => r.id === id);
    if (!target) return;

    document.getElementById("edit-report-id").value = target.id;
    document.getElementById("edit-status").value = target.status;
    document.getElementById("edit-catatan").value = target.catatanAdmin || "";
    adminModal.classList.add("active");
};

window.deleteReport = async (id) => {
    const target = reports.find((r) => r.id === id);
    if (!target) return;

    if (!confirm(`Hapus permanen laporan "${target.lokasi}" dari ${target.kelas}?`)) return;

    try {
        if (isCloudActive && rtdb && target.firebaseKey) {
            await rtdb.ref(`reports/${target.firebaseKey}`).remove();
        } else {
            reports = reports.filter((r) => r.id !== id);
            localStorage.setItem("elapor_reports", JSON.stringify(reports));
            renderReports();
        }
        showToast("🗑️ Laporan berhasil dihapus", "success");
    } catch (err) {
        showToast("❌ Gagal menghapus laporan", "error");
    }
};

btnCloseAdmin.addEventListener("click", () => adminModal.classList.remove("active"));

adminUpdateForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("edit-report-id").value;
    const newStatus = document.getElementById("edit-status").value;
    const newCatatan = document.getElementById("edit-catatan").value.trim();

    const target = reports.find((r) => r.id === id);
    if (target) {
        if (isCloudActive && rtdb && target.firebaseKey) {
            await rtdb.ref(`reports/${target.firebaseKey}`).update({
                status: newStatus,
                catatanAdmin: newCatatan
            });
        } else {
            target.status = newStatus;
            target.catatanAdmin = newCatatan;
            localStorage.setItem("elapor_reports", JSON.stringify(reports));
            renderReports();
        }
        showToast(`✅ Status diubah menjadi ${newStatus}`, "success");
    }
    adminModal.classList.remove("active");
});

// ================= PENCARIAN, FILTER & RENDER =================
if (searchInput) {
    searchInput.addEventListener("input", (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        renderReports();
    });
}

filterChips.forEach((chip) => {
    chip.addEventListener("click", () => {
        filterChips.forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");
        currentFilter = chip.dataset.status;
        renderReports();
    });
});

function renderReports() {
    if (!currentSession) return;

    const visibleReports =
        currentSession.role === "admin"
            ? reports
            : reports.filter((r) => r.kelas === currentSession.kelas);

    document.getElementById("stat-menunggu").textContent = visibleReports.filter((r) => r.status === "Menunggu").length;
    document.getElementById("stat-proses").textContent = visibleReports.filter((r) => r.status === "Diproses").length;
    document.getElementById("stat-selesai").textContent = visibleReports.filter((r) => r.status === "Selesai").length;

    let filtered =
        currentFilter === "ALL"
            ? visibleReports
            : visibleReports.filter((r) => r.status === currentFilter);

    if (searchQuery) {
        filtered = filtered.filter(
            (r) =>
                r.kelas.toLowerCase().includes(searchQuery) ||
                r.lokasi.toLowerCase().includes(searchQuery) ||
                r.kategori.toLowerCase().includes(searchQuery) ||
                r.deskripsi.toLowerCase().includes(searchQuery) ||
                (r.jenis || "Kerusakan").toLowerCase().includes(searchQuery)
        );
    }

    if (filtered.length === 0) {
        reportListEl.innerHTML = `<div class="empty-state">Tidak ada laporan yang cocok dengan filter/pencarian.</div>`;
        return;
    }

    reportListEl.innerHTML = filtered
        .map(
            (r) => `
        <article class="report-card">
          <img src="${r.foto}" alt="Foto ${r.kategori}" class="report-img" onclick="openLightbox('${r.foto}')" title="Klik untuk perbesar foto" />
          <div class="report-body">
            <span class="type-badge type-${r.jenis || "Kerusakan"}">
              ${r.jenis === "Pemasangan" ? "📌 PENGAJUAN PEMASANGAN" : "🛠️ LAPOR KERUSAKAN"}
            </span>
            <div class="report-top">
              <span class="report-class">🏫 ${r.kelas} • ${r.kategori}</span>
              <span class="status-pill status-${r.status}">${r.status}</span>
            </div>
            <h4 class="report-title">${r.lokasi}</h4>
            <p class="report-desc">${r.deskripsi}</p>
            ${r.catatanAdmin ? `<div class="admin-note"><strong>💬 Petugas Sarpras:</strong> ${r.catatanAdmin}</div>` : ""}
            <div class="report-meta">
              <span>👤 ${r.pj}</span>
              <span>🕒 ${r.waktu}</span>
            </div>
            ${currentSession.role === "admin"
                    ? `<div class="admin-card-actions">
                     <button type="button" class="btn-admin-action" onclick="openAdminEdit('${r.id}')">🛠️ Update Status</button>
                     <button type="button" class="btn-delete-action" onclick="deleteReport('${r.id}')">🗑️ Hapus</button>
                   </div>`
                    : ""
                }
          </div>
        </article>
      `
        )
        .join("");
}