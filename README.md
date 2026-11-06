# BudgetBuddy 💰

**Perencana Keuangan Harian Pribadi bertenaga AI**  
_untuk pelajar, fresh graduate, dan first-time earner di Indonesia_

---

## 🚀 Cara Menjalankan

### Persyaratan
- Browser modern (Chrome, Firefox, Edge, Safari) — tidak memerlukan internet
- Tidak perlu instalasi apapun, tidak perlu Node.js / server

### Langkah
1. **Clone atau unduh** seluruh folder proyek
2. **Buka** file `index.html` langsung di browser kamu:
   - Windows: double-click `index.html`, atau klik kanan → _Open with_ → pilih browser
   - Mac: double-click atau `open index.html` di Terminal
   - Linux: `xdg-open index.html`
3. **Selesai!** Aplikasi langsung berjalan offline

### Struktur File
```
BudgetBuddy/
├── index.html   ← Struktur HTML semua view & modal
├── style.css    ← Design system, layout, komponen
├── app.js       ← Logika aplikasi (storage, charts, AI, CRUD)
├── README.md    ← Dokumen ini
└── PROMPTS.md   ← Dokumentasi prompt layer
```

---

## ✨ Fitur

| # | Fitur | Keterangan |
|---|-------|-----------|
| 1 | **Monthly Setup** | Input pemasukan bulanan & target tabungan (nama + jumlah) |
| 2 | **Tambah Transaksi** | Jumlah, tipe, deskripsi, tanggal, kategori opsional |
| 3 | **Auto-Kategorisasi** | AI agent mendeteksi kategori dari kata kunci deskripsi (contoh: "gofood" → Makanan, "kos" → Tempat Tinggal) |
| 4 | **Dashboard 5 KPI** | Total Pemasukan, Total Pengeluaran, Sisa Saldo, Tingkat Tabungan (%), **Batas Harian** |
| 5 | **Aturan 50/30/20** | Progress bar per bucket (Kebutuhan/Keinginan/Tabungan) dengan peringatan otomatis |
| 6 | **AI Insights** | 3–5 tips berbahasa Indonesia + kutipan angka nyata dari data |
| 7 | **Grafik SVG** | Donut chart pengeluaran per kategori + line chart tren harian |
| 8 | **Riwayat Transaksi** | Tabel dengan search, filter kategori/tipe, hapus per baris |
| 9 | **Savings Goal Tracker** | Progress bar + estimasi tanggal tercapai |
| 10 | **Ekspor CSV** | Unduh semua transaksi bulan ini sebagai file CSV (UTF-8 BOM) |
| 11 | **Muat Data Contoh** | Demo instan dengan 45+ transaksi (bulan ini + bulan lalu) |
| 12 | **Reset Semua Data** | Hapus semua data dengan konfirmasi |
| 13 | **Validasi Input** | Cegah angka negatif/kosong, empty states, disclaimer |
| 14 | **Batas Harian** | Sisa saldo ÷ sisa hari bulan ini — merah jika saldo 0 atau minus |
| 15 | **Perbandingan Bulan Lalu** | % naik/turun total + per kategori vs bulan sebelumnya |
| 16 | **Kategori Dipelajari AI** | Koreksi kategori per baris di tabel; AI mengingat & menerapkan di masa depan |

---

## 🗂 Penyimpanan Data

Semua data disimpan di **`localStorage`** browser kamu (tidak dikirim ke server manapun):

| Key | Isi |
|-----|-----|
| `bb_setup` | JSON: `{ month, income, goalName, goalAmt }` |
| `bb_transactions` | JSON Array: `[{ id, date, type, amount, description, category }]` |
| `bb_learned_keywords` | JSON Object: `{ "keyword": "CategoryName", ... }` — dipelajari dari koreksi user |

> **Catatan:** Data terikat pada browser dan perangkat yang digunakan. Ekspor ke CSV untuk backup.

---

## 🎨 Design System

- **Primary Color:** `#0F62FE` (IBM Blue)
- **Accent:** `#F59E0B` (Amber)
- **Positif/Negatif:** `#16A34A` / `#DC2626`
- **Font:** System UI stack (`-apple-system`, `Segoe UI`, dll)
- **Border Radius:** 12px kartu, 6px form
- **Format Angka:** Rupiah Indonesia `Rp 1.250.000`
- **Responsif:** ≥ 360px (mobile), 700px (tablet), 900px+ (desktop)

---

## ♿ Aksesibilitas

- Kontras warna memenuhi **WCAG AA** (4.5:1 minimum)
- Semua form field memiliki `<label>` terhubung
- Navigasi keyboard penuh (Tab, Shift+Tab, Enter, Escape)
- `aria-label` pada semua elemen chart SVG
- `role="dialog"` + `aria-modal="true"` + focus trap pada modal
- `aria-live` pada area dinamis (KPI, toast, insights)
- `aria-current="page"` pada navigasi aktif

---

## 🧠 Auto-Kategorisasi Keyword

| Kategori | Contoh Kata Kunci |
|----------|------------------|
| 🍜 Makanan | makan, gofood, grabfood, warung, kopi, nasi, bakso |
| 🚗 Transportasi | grab, gojek, bensin, parkir, tol, krl, mrt |
| 🏠 Tempat Tinggal | kos, kontrakan, listrik, pln, air, wifi |
| 📱 Langganan | netflix, spotify, kuota, pulsa, indihome |
| 📚 Pendidikan | ukt, kuliah, buku, kursus, les |
| 🏥 Kesehatan | obat, dokter, vitamin, gym, bpjs |
| 🎮 Hiburan | bioskop, game, konser, karaoke |
| 🛍 Belanja | shopee, tokopedia, baju, skincare, mall |
| 📦 Lainnya | (semua yang tidak cocok di atas) |

---

## 📋 Disclaimer

Insight yang dihasilkan BudgetBuddy adalah **panduan umum berbasis data pribadi** kamu dan **bukan** saran keuangan profesional. Untuk keputusan keuangan besar, konsultasikan dengan perencana keuangan berlisensi (CFP/QWP).

---

## 👨‍💻 Tech Stack

- **HTML5** — Semantic markup, ARIA roles
- **CSS3** — Custom Properties, Grid, Flexbox, tanpa framework
- **Vanilla JavaScript (ES2020)** — Modules, arrow functions, destructuring, tanpa library eksternal
- **SVG** — Chart donut dan line chart murni tanpa canvas atau library

---

_Dibuat sebagai capstone project — AI Agent for Programming (IT Track)_
