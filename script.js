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
let activeTab = "lapor";
let currentFilter = "ALL";
let currentLoanFilter = "ALL";
let searchQuery = "";
let compressedPhotoData = "";

// ================= DATABASE PIN PRIVAT UNIK PER KELAS & LAB (63 AKUN) =================
const defaultClassPins = {
    // JURUSAN RPL
    "X RPL 1": "4821", "X RPL 2": "7390", "X RPL 3": "5162",
    "XI RPL 1": "1954", "XI RPL 2": "6208", "XI RPL 3": "8431",
    "XII RPL 1": "3097", "XII RPL 2": "7542", "XII RPL 3": "2689",

    // JURUSAN TKJ
    "X TKJ 1": "1124", "X TKJ 2": "2235", "X TKJ 3": "3346",
    "XI TKJ 1": "4457", "XI TKJ 2": "5568", "XI TKJ 3": "6679",
    "XII TKJ 1": "7781", "XII TKJ 2": "8892", "XII TKJ 3": "9913",

    // JURUSAN DKV
    "X DKV 1": "1357", "X DKV 2": "2468", "X DKV 3": "3579",
    "XI DKV 1": "4681", "XI DKV 2": "5792", "XI DKV 3": "6813",
    "XII DKV 1": "7924", "XII DKV 2": "8135", "XII DKV 3": "9246",

    // JURUSAN ANIM
    "X ANIM 1": "1472", "X ANIM 2": "2583", "X ANIM 3": "3694",
    "XI ANIM 1": "4715", "XI ANIM 2": "5826", "XI ANIM 3": "6937",
    "XII ANIM 1": "7148", "XII ANIM 2": "8259", "XII ANIM 3": "9361",

    // JURUSAN TB
    "X TB 1": "1593", "X TB 2": "2614", "X TB 3": "3725",
    "XI TB 1": "4836", "XI TB 2": "5947", "XI TB 3": "6158",
    "XII TB 1": "7269", "XII TB 2": "8371", "XII TB 3": "9482",

    // JURUSAN PHT
    "X PHT 1": "1738", "X PHT 2": "2849", "X PHT 3": "3951",
    "XI PHT 1": "4162", "XI PHT 2": "5273", "XI PHT 3": "6384",
    "XII PHT 1": "7495", "XII PHT 2": "8516", "XII PHT 3": "9627",

    // LABORATORIUM
    "LAB RPL 1": "9011",
    "LAB RPL 2": "9012",
    "LAB TKJ 1": "9021",
    "LAB TKJ 2": "9022",
    "LAB DKV 1": "9031",
    "LAB DKV 2": "9032",
    "LAB ANIM 1": "9041",
    "LAB ANIM 2": "9042",
    "LAB INFORMATIKA KONG NDO": "9099"
};

const ADMIN_PIN = "admin123";
let classPins = { ...defaultClassPins, ...(JSON.parse(localStorage.getItem("elapor_class_pins")) || {}) };

const sampleReports = [
    {
        id: "REP-101",
        jenis: "Kerusakan",
        kelas: "LAB RPL 1",
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
let loans = JSON.parse(localStorage.getItem("elapor_loans")) || [];

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

const featureTabs = document.querySelectorAll(".feature-tab");
const tabLaporContent = document.getElementById("tab-lapor-content");
const tabPinjamContent = document.getElementById("tab-pinjam-content");

const searchInput = document.getElementById("search-input");
const reportListEl = document.getElementById("report-list");
const loanListEl = document.getElementById("loan-list");
const filterChips = document.querySelectorAll("#report-filter-bar .chip");
const loanFilterChips = document.querySelectorAll("#loan-filter-bar .loan-chip");

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

const loanModal = document.getElementById("loan-modal");
const btnCloseLoan = document.getElementById("btn-close-loan");
const loanForm = document.getElementById("loan-form");
const loanItemChecks = document.querySelectorAll(".loan-item-check");
const loanBarangCustom = document.getElementById("loan-barang-custom");
const loanCombinedPreview = document.getElementById("loan-combined-preview");

const returnModal = document.getElementById("return-modal");
const btnCloseReturn = document.getElementById("btn-close-return");
const returnForm = document.getElementById("return-form");

const lightboxModal = document.getElementById("lightbox-modal");
const lightboxImg = document.getElementById("lightbox-img");
const btnCloseLightbox = document.getElementById("btn-close-lightbox");
const toastContainer = document.getElementById("toast-container");

// ================= FORMAT WAKTU LENGKAP (HARI, TANGGAL, BULAN, TAHUN, JAM) =================
function formatFullDateTime(date = new Date()) {
    const hari = date.toLocaleDateString("id-ID", { weekday: "long" });
    const tanggal = date.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric"
    });
    const jam = date
        .toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
        .replace(".", ":");
    return `${hari}, ${tanggal} • Pukul ${jam} WIB`;
}

// ================= GABUNGKAN BARANG YANG DIPILIH (PROYEKTOR + STOP KONTAK + DLL) =================
function getCombinedLoanItems() {
    const selected = Array.from(loanItemChecks)
        .filter((chk) => chk.checked)
        .map((chk) => chk.value);

    const customVal = loanBarangCustom ? loanBarangCustom.value.trim() : "";
    if (customVal) {
        selected.push(customVal);
    }
    return selected.join(" + ");
}

function updateCombinedPreview() {
    if (!loanCombinedPreview) return;
    const combined = getCombinedLoanItems();
    loanCombinedPreview.textContent = combined || "- Pilih atau ketik barang di atas -";
}

loanItemChecks.forEach((chk) => chk.addEventListener("change", updateCombinedPreview));
if (loanBarangCustom) {
    loanBarangCustom.addEventListener("input", updateCombinedPreview);
}

// ================= KANVAS TANDA TANGAN DIGITAL (BEBAS LAG / GPU ACCELERATED) =================
function createSignaturePad(canvasId, clearBtnId) {
    const canvas = document.getElementById(canvasId);
    const clearBtn = document.getElementById(clearBtnId);
    if (!canvas) return null;

    const ctx = canvas.getContext("2d", { desynchronized: true });
    let drawing = false;
    let hasSignature = false;
    let cachedRect = null;
    let lastX = 0;
    let lastY = 0;

    function syncSizeAndReset() {
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const w = rect.width > 0 ? rect.width : 380;
        const h = rect.height > 0 ? rect.height : 140;

        canvas.width = w * dpr;
        canvas.height = h * dpr;

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, w, h);

        ctx.strokeStyle = "#0f172a";
        ctx.lineWidth = 2.2;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        hasSignature = false;
    }

    syncSizeAndReset();

    function getPos(e) {
        return {
            x: e.clientX - cachedRect.left,
            y: e.clientY - cachedRect.top
        };
    }

    canvas.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        canvas.setPointerCapture(e.pointerId);
        cachedRect = canvas.getBoundingClientRect();
        drawing = true;
        hasSignature = true;

        const pos = getPos(e);
        lastX = pos.x;
        lastY = pos.y;

        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(lastX + 0.1, lastY + 0.1);
        ctx.stroke();
    });

    canvas.addEventListener("pointermove", (e) => {
        if (!drawing) return;
        e.preventDefault();

        const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);

        for (const ev of events) {
            const pos = getPos(ev);
            ctx.lineTo(pos.x, pos.y);
            lastX = pos.x;
            lastY = pos.y;
        }
        ctx.stroke();
    });

    function stopDraw(e) {
        if (!drawing) return;
        drawing = false;
        if (e && e.pointerId !== undefined && canvas.hasPointerCapture(e.pointerId)) {
            canvas.releasePointerCapture(e.pointerId);
        }
    }

    canvas.addEventListener("pointerup", stopDraw);
    canvas.addEventListener("pointercancel", stopDraw);

    if (clearBtn) {
        clearBtn.addEventListener("click", syncSizeAndReset);
    }

    return {
        clear: syncSizeAndReset,
        isEmpty: () => !hasSignature,
        toDataURL: () => canvas.toDataURL("image/png")
    };
}

const borrowSigPad = createSignaturePad("sig-canvas-borrow", "btn-clear-sig-borrow");
const returnSigPad = createSignaturePad("sig-canvas-return", "btn-clear-sig-return");

// ================= NAVIGASI TAB (LAPOR VS PEMINJAMAN) =================
featureTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
        featureTabs.forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        activeTab = tab.dataset.tab;

        if (activeTab === "lapor") {
            tabLaporContent.style.display = "block";
            tabPinjamContent.style.display = "none";
            renderReports();
        } else {
            tabLaporContent.style.display = "none";
            tabPinjamContent.style.display = "block";
            renderLoans();
        }
    });
});

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
const syncBadgeHTML = `<span class="sync-badge">${isCloudActive ? "🟢 Cloud Real-Time" : "🟡 Penyimpanan Lokal"}</span>`;
const reportFeedHeader = document.getElementById("report-feed-header");
const loanFeedHeader = document.getElementById("loan-feed-header");

if (reportFeedHeader) {
    reportFeedHeader.style.display = "flex";
    reportFeedHeader.style.justifyContent = "space-between";
    reportFeedHeader.style.alignItems = "center";
    reportFeedHeader.innerHTML = `<h3>📋 Daftar Laporan</h3>${syncBadgeHTML}`;
}
if (loanFeedHeader) {
    loanFeedHeader.style.display = "flex";
    loanFeedHeader.style.justifyContent = "space-between";
    loanFeedHeader.style.alignItems = "center";
    loanFeedHeader.innerHTML = `<h3>📦 Buku Peminjaman Sarpras</h3>${syncBadgeHTML}`;
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

    rtdb.ref("loans").on("value", (snapshot) => {
        const val = snapshot.val();
        if (val) {
            loans = Object.entries(val)
                .map(([key, item]) => ({ firebaseKey: key, ...item }))
                .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        } else {
            loans = [];
        }
        if (currentSession) renderLoans();
    });

    rtdb.ref("settings/classPins").on("value", (snapshot) => {
        if (snapshot.exists()) {
            const cloudPins = snapshot.val();
            const mergedPins = { ...defaultClassPins, ...cloudPins };
            classPins = mergedPins;

            if (Object.keys(mergedPins).length > Object.keys(cloudPins).length) {
                rtdb.ref("settings/classPins").set(mergedPins);
            }
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
    const loanActionBar = document.getElementById("loan-action-bar");

    if (selectedRole === "kelas") {
        const kelas = document.getElementById("select-kelas").value;
        const pj = document.getElementById("input-pj").value.trim();

        if (!pj) {
            loginError.textContent = "⚠️ Nama siswa / perwakilan kelas wajib diisi.";
            return;
        }

        if (pin !== classPins[kelas]) {
            loginError.textContent = `❌ PIN Privat untuk ${kelas} salah! Hubungi petugas Sarpras jika lupa.`;
            return;
        }

        currentSession = { role: "kelas", kelas, pj };
        document.getElementById("header-role-badge").textContent = "AKUN RESMI KELAS";
        document.getElementById("header-user-title").textContent = kelas;
        document.getElementById("header-user-sub").textContent = `Siswa Aktif: ${pj}`;

        actionBar.innerHTML = `<button type="button" id="btn-open-form" class="btn btn-primary btn-full">📸 + Buat Laporan / Pengajuan Baru</button>`;
        document.getElementById("btn-open-form").addEventListener("click", openReportModal);

        loanActionBar.innerHTML = `<button type="button" id="btn-open-loan" class="btn btn-primary btn-full">📦 + Pinjam Barang Sarpras (TTD)</button>`;
        document.getElementById("btn-open-loan").addEventListener("click", openLoanModal);

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

        loanActionBar.innerHTML = `
        <div class="admin-toolbar">
          <button type="button" id="btn-open-loan-admin" class="btn btn-teal">📦 + Input Peminjaman</button>
          <button type="button" id="btn-print-loan" class="btn btn-primary">🖨️ Cetak Buku Pinjam</button>
        </div>
      `;
        document.getElementById("btn-open-loan-admin").addEventListener("click", openLoanModal);
        document.getElementById("btn-print-loan").addEventListener("click", () => window.print());

        showToast("Masuk sebagai Admin Sarpras", "success");
    }

    loginError.textContent = "";
    loginScreen.classList.remove("active");
    mainScreen.classList.add("active");
    renderReports();
    renderLoans();
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
    if (!confirm(`Acak ulang PIN privat untuk ${kelas}? PIN lama tidak akan bisa dipakai lagi.`)) return;

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
            `⚠️ ${currentSession.kelas} sudah memiliki pengajuan aktif pada kategori "${kategori}" (${duplicate.status}). Tetap kirim?`
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

// ================= PEMINJAMAN & PENGEMBALIAN BARANG SARPRAS =================
function openLoanModal() {
    loanForm.reset();
    loanItemChecks.forEach((chk) => (chk.checked = false));
    updateCombinedPreview();

    const namaInput = document.getElementById("loan-nama");
    const kelasInput = document.getElementById("loan-kelas");

    namaInput.value = currentSession && currentSession.role === "kelas" ? currentSession.pj : "";
    if (currentSession && currentSession.role === "admin") {
        kelasInput.readOnly = false;
        kelasInput.value = "";
        kelasInput.placeholder = "Contoh: X RPL 1";
    } else {
        kelasInput.readOnly = true;
        kelasInput.value = currentSession ? currentSession.kelas : "";
    }

    document.getElementById("loan-borrow-time-display").textContent = formatFullDateTime(new Date());
    loanModal.classList.add("active");
    setTimeout(() => {
        if (borrowSigPad) borrowSigPad.clear();
    }, 50);
}

if (btnCloseLoan) {
    btnCloseLoan.addEventListener("click", () => loanModal.classList.remove("active"));
}

loanForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const barangGabungan = getCombinedLoanItems();
    if (!barangGabungan) {
        showToast("⚠️ Centang atau ketik minimal 1 barang yang dipinjam!", "error");
        return;
    }

    if (borrowSigPad && borrowSigPad.isEmpty()) {
        showToast("⚠️ Siswa wajib membubuhkan tanda tangan peminjaman!", "error");
        return;
    }

    const namaPeminjam = document.getElementById("loan-nama").value.trim();
    const kelasPeminjam = document.getElementById("loan-kelas").value.trim() || currentSession.kelas;
    const keperluan = document.getElementById("loan-keperluan").value.trim();
    const waktuPinjam = formatFullDateTime(new Date());
    const ttdPinjam = borrowSigPad ? borrowSigPad.toDataURL() : "";

    const submitBtn = loanForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = "⏳ Menyimpan Peminjaman...";

    const newLoan = {
        id: "PINJAM-" + Math.floor(100 + Math.random() * 900),
        barang: "📦 " + barangGabungan,
        keperluan,
        kelas: kelasPeminjam,
        namaPeminjam,
        waktuPinjam,
        ttdPinjam,
        status: "Dipinjam",
        namaPengembali: "",
        waktuKembali: "",
        kondisiKembali: "",
        ttdKembali: "",
        createdAt: Date.now()
    };

    try {
        if (isCloudActive && rtdb) {
            await rtdb.ref("loans").push(newLoan);
        } else {
            loans.unshift(newLoan);
            localStorage.setItem("elapor_loans", JSON.stringify(loans));
            renderLoans();
        }
        loanModal.classList.remove("active");
        showToast("📦 Catatan peminjaman berhasil disimpan!", "success");
    } catch (err) {
        showToast("❌ Gagal menyimpan: " + err.message, "error");
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "📝 Simpan Catatan Peminjaman";
    }
});

window.openReturnModal = (id) => {
    const target = loans.find((l) => l.id === id);
    if (!target) return;

    returnForm.reset();
    document.getElementById("return-loan-id").value = target.id;
    document.getElementById("return-nama").value = target.namaPeminjam;
    document.getElementById("return-kelas").value = target.kelas;
    document.getElementById("loan-return-time-display").textContent = formatFullDateTime(new Date());

    document.getElementById("return-item-summary").innerHTML = `
        <strong>${target.barang}</strong>
        <span>Dipinjam oleh: ${target.namaPeminjam} (${target.kelas})</span>
        <small>Waktu Pinjam: ${target.waktuPinjam}</small>
    `;

    returnModal.classList.add("active");
    setTimeout(() => {
        if (returnSigPad) returnSigPad.clear();
    }, 50);
};

if (btnCloseReturn) {
    btnCloseReturn.addEventListener("click", () => returnModal.classList.remove("active"));
}

returnForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (returnSigPad && returnSigPad.isEmpty()) {
        showToast("⚠️ Siswa wajib membubuhkan tanda tangan pengembalian!", "error");
        return;
    }

    const id = document.getElementById("return-loan-id").value;
    const namaPengembali = document.getElementById("return-nama").value.trim();
    const kondisiKembali = document.getElementById("return-kondisi").value;
    const waktuKembali = formatFullDateTime(new Date());
    const ttdKembali = returnSigPad ? returnSigPad.toDataURL() : "";

    const target = loans.find((l) => l.id === id);
    if (!target) return;

    const submitBtn = returnForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = "⏳ Menyimpan Pengembalian...";

    const updateData = {
        status: "Dikembalikan",
        namaPengembali,
        kondisiKembali,
        waktuKembali,
        ttdKembali
    };

    try {
        if (isCloudActive && rtdb && target.firebaseKey) {
            await rtdb.ref(`loans/${target.firebaseKey}`).update(updateData);
        } else {
            Object.assign(target, updateData);
            localStorage.setItem("elapor_loans", JSON.stringify(loans));
            renderLoans();
        }
        returnModal.classList.remove("active");
        showToast("✅ Barang berhasil dikembalikan!", "success");
    } catch (err) {
        showToast("❌ Gagal menyimpan pengembalian", "error");
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "✅ Konfirmasi Pengembalian Barang";
    }
});

window.deleteLoan = async (id) => {
    const target = loans.find((l) => l.id === id);
    if (!target) return;

    if (!confirm(`Hapus catatan peminjaman "${target.barang}" oleh ${target.namaPeminjam}?`)) return;

    try {
        if (isCloudActive && rtdb && target.firebaseKey) {
            await rtdb.ref(`loans/${target.firebaseKey}`).remove();
        } else {
            loans = loans.filter((l) => l.id !== id);
            localStorage.setItem("elapor_loans", JSON.stringify(loans));
            renderLoans();
        }
        showToast("🗑️ Data peminjaman dihapus", "success");
    } catch (err) {
        showToast("❌ Gagal menghapus data", "error");
    }
};

// ================= PENCARIAN, FILTER & RENDER =================
if (searchInput) {
    searchInput.addEventListener("input", (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        renderReports();
        renderLoans();
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

loanFilterChips.forEach((chip) => {
    chip.addEventListener("click", () => {
        loanFilterChips.forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");
        currentLoanFilter = chip.dataset.loanStatus;
        renderLoans();
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

function renderLoans() {
    if (!currentSession || !loanListEl) return;

    const visibleLoans =
        currentSession.role === "admin"
            ? loans
            : loans.filter((l) => l.kelas === currentSession.kelas);

    document.getElementById("stat-loan-dipinjam").textContent = visibleLoans.filter((l) => l.status === "Dipinjam").length;
    document.getElementById("stat-loan-kembali").textContent = visibleLoans.filter((l) => l.status === "Dikembalikan").length;
    document.getElementById("stat-loan-total").textContent = visibleLoans.length;

    let filtered =
        currentLoanFilter === "ALL"
            ? visibleLoans
            : visibleLoans.filter((l) => l.status === currentLoanFilter);

    if (searchQuery) {
        filtered = filtered.filter(
            (l) =>
                l.barang.toLowerCase().includes(searchQuery) ||
                l.namaPeminjam.toLowerCase().includes(searchQuery) ||
                l.kelas.toLowerCase().includes(searchQuery) ||
                (l.keperluan || "").toLowerCase().includes(searchQuery) ||
                (l.namaPengembali || "").toLowerCase().includes(searchQuery)
        );
    }

    if (filtered.length === 0) {
        loanListEl.innerHTML = `<div class="empty-state">Belum ada catatan peminjaman barang sarpras.</div>`;
        return;
    }

    loanListEl.innerHTML = filtered
        .map(
            (l) => `
        <article class="report-card loan-card">
          <div class="report-body">
            <div class="report-top">
              <span class="report-class">🏫 ${l.kelas} • ID: ${l.id}</span>
              <span class="status-pill ${l.status === "Dikembalikan" ? "status-Selesai" : "status-Menunggu"}">
                ${l.status === "Dikembalikan" ? "🟢 Sudah Dikembalikan" : "🟡 Sedang Dipinjam"}
              </span>
            </div>
            <h4 class="report-title">${l.barang}</h4>
            <p class="report-desc"><strong>Keperluan:</strong> ${l.keperluan}</p>

            <div class="loan-log-grid">
              <div class="loan-log-box">
                <span class="log-badge">📥 CATATAN PEMINJAMAN</span>
                <p><strong>Nama:</strong> ${l.namaPeminjam} (${l.kelas})</p>
                <p><strong>Waktu:</strong> ${l.waktuPinjam}</p>
                <div class="sig-preview-wrap">
                  <small>Tanda Tangan Peminjam:</small>
                  <img src="${l.ttdPinjam}" alt="TTD Pinjam" class="sig-img" onclick="openLightbox('${l.ttdPinjam}')" />
                </div>
              </div>

              ${l.status === "Dikembalikan"
                    ? `<div class="loan-log-box returned">
                     <span class="log-badge returned">📤 CATATAN PENGEMBALIAN</span>
                     <p><strong>Nama:</strong> ${l.namaPengembali} (${l.kelas})</p>
                     <p><strong>Waktu:</strong> ${l.waktuKembali}</p>
                     <p><strong>Kondisi:</strong> ${l.kondisiKembali}</p>
                     <div class="sig-preview-wrap">
                       <small>Tanda Tangan Pengembali:</small>
                       <img src="${l.ttdKembali}" alt="TTD Kembali" class="sig-img" onclick="openLightbox('${l.ttdKembali}')" />
                     </div>
                   </div>`
                    : `<div class="loan-log-box pending">
                     <span class="log-badge pending">⏳ BELUM DIKEMBALIKAN</span>
                     <p>Barang masih dibawa oleh siswa. Klik tombol di bawah saat mengembalikan ke ruang Sarpras.</p>
                   </div>`
                }
            </div>

            <div class="admin-card-actions">
              ${l.status === "Dipinjam"
                    ? `<button type="button" class="btn-admin-action" onclick="openReturnModal('${l.id}')">✅ Kembalikan Barang (TTD)</button>`
                    : `<span></span>`
                }
              ${currentSession.role === "admin"
                    ? `<button type="button" class="btn-delete-action" onclick="deleteLoan('${l.id}')">🗑️ Hapus</button>`
                    : ""
                }
            </div>
          </div>
        </article>
      `
        )
        .join("");
}

// ================= FILTER CEPAT JURUSAN / LAB DI HALAMAN LOGIN =================
const selectKelasEl = document.getElementById("select-kelas");
const jurChips = document.querySelectorAll(".jur-chip");

if (selectKelasEl && jurChips.length > 0) {
    const originalGroups = Array.from(selectKelasEl.querySelectorAll("optgroup")).map((grp) => ({
        label: grp.label,
        options: Array.from(grp.querySelectorAll("option")).map((opt) => ({
            value: opt.value,
            text: opt.textContent
        }))
    }));

    jurChips.forEach((chip) => {
        chip.addEventListener("click", () => {
            jurChips.forEach((c) => c.classList.remove("active"));
            chip.classList.add("active");

            const filterKey = chip.dataset.jur;
            selectKelasEl.innerHTML = "";

            originalGroups.forEach((grp) => {
                const matchedOptions = grp.options.filter((opt) => {
                    if (filterKey === "ALL") return true;
                    if (filterKey === "LAB") return opt.value.startsWith("LAB ");
                    return opt.value.includes(` ${filterKey} `);
                });

                if (matchedOptions.length > 0) {
                    const optGroupEl = document.createElement("optgroup");
                    optGroupEl.label = grp.label;
                    matchedOptions.forEach((opt) => {
                        const optionEl = document.createElement("option");
                        optionEl.value = opt.value;
                        optionEl.textContent = opt.text;
                        optGroupEl.appendChild(optionEl);
                    });
                    selectKelasEl.appendChild(optGroupEl);
                }
            });
        });
    });
}