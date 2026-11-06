# PROMPTS.md — BudgetBuddy Prompt Engineering Documentation

Dokumen ini mendokumentasikan lapisan prompt (prompt layers) yang digunakan dalam membangun **BudgetBuddy**, beserta revisi iteratif yang dilakukan setelah pengujian.

---

## Layer 1: Meta-Prompt (System Role)

> **Tujuan:** Mendefinisikan identitas, konteks, dan batasan AI agent.

```
Act as a senior full-stack engineer building "BudgetBuddy", a daily personal finance 
planner AI Agent for the general public, as a capstone project for the IT Track 
(AI Agent for Programming).

Target users: students, fresh graduates, and first-time earners in Indonesia.
Constraint: HTML5, CSS3, and vanilla JavaScript only, with no frameworks and no 
external libraries. Everything must run offline by opening index.html in a browser. 
Data is stored in localStorage only. Split into 3 files: index.html, style.css, app.js.
```

**Elemen kunci dalam prompt ini:**
- **Persona:** Senior full-stack engineer (bukan beginner, bukan generalist)
- **Konteks produk:** Capstone project → kode harus production-quality
- **Target user:** Spesifik (Indonesia, mahasiswa, fresh grad) → memengaruhi bahasa UI, format mata uang, keyword auto-categorization
- **Hard constraints:** No framework, no CDN, offline-first → memaksa solusi murni HTML/CSS/JS

---

## Layer 2: Feature Specification Prompt

> **Tujuan:** Mendefinisikan 10 fitur utama secara terstruktur dan exhaustif.

```
Build BudgetBuddy with these features:
1. Monthly setup: input monthly income and an optional savings goal (name + target amount).
2. Transaction form: amount, type (income/expense), free-text description, date, and 
   an optional category. If no category is chosen, the agent auto-categorizes from 
   keywords in the description (e.g. "makan", "gofood" -> Food; "grab", "bensin" -> 
   Transport; "kos", "listrik" -> Housing; "kuota", "netflix" -> Subscriptions; 
   "ukt", "buku" -> Education; others -> Misc).
3. Dashboard with 4 KPI cards: Total Income, Total Expense, Remaining Balance, 
   Savings Rate (%).
4. Budget rule engine: compare spending against the 50/30/20 rule 
   (Needs/Wants/Savings), show progress bars per bucket, and warn when a bucket 
   exceeds its limit.
5. Agent Insights panel: generate 3-5 plain-language tips from the data, e.g. biggest 
   spending category, projected end-of-month balance based on daily average, and a 
   warning if spending pace exceeds income. Each tip must cite the numbers it is 
   based on.
6. Charts drawn with pure CSS/SVG: expense by category (donut or bars) and daily 
   spending trend (line or bars).
7. Transaction history table with search, filter by category/type, and delete.
8. Savings goal tracker with progress and estimated completion date.
9. Export history to CSV, reset-all-data button with confirmation, and a 
   "Load sample data" button for demo.
10. Input validation (no negative or empty amounts), empty states, and a short 
    disclaimer that insights are general guidance, not professional financial advice.
```

**Keputusan desain yang didorong prompt ini:**
- Feature #2: Keyword map Indonesia + Inggris di `KEYWORD_MAP` array di `app.js`
- Feature #4: `BUCKET_RULES` dan `CATEGORY_BUCKET` mapping di `app.js`
- Feature #5: Fungsi `generateInsights()` menghasilkan 5 insight berbeda dengan angka nyata
- Feature #6: SVG murni tanpa canvas — `renderCategoryChart()` (donut) + `renderTrendChart()` (line)
- Feature #9: Tiga tombol terpisah (ekspor/reset/sample) dengan guard `openConfirmModal()`

---

## Layer 3: Output Format & Technical Constraint Prompt

> **Tujuan:** Menentukan struktur file output, standar kode, dan persyaratan teknis.

```
Output exactly three files: index.html, style.css, app.js, plus README.md 
(how to run) and PROMPTS.md (documenting the prompt layers).
```

**Implikasi:**
- **index.html** → Semantic HTML5, semua view sebagai `<section>`, modal sebagai `<div role="dialog">`
- **style.css** → CSS Custom Properties di `:root`, tidak ada inline style kecuali nilai dinamis dari JS
- **app.js** → Diorganisir dalam 19 section dengan komentar jelas, fungsi-fungsi modular

---

## Layer 4: Design System Prompt

> **Tujuan:** Mendefinisikan visual identity dan system design yang konsisten.

```
Design: clean modern dashboard with a left sidebar and top bar, primary color 
#0F62FE (IBM blue), accent #F59E0B, positive/negative colors green and red, card 
layout, border-radius 12px, subtle shadow, CSS custom properties, Rupiah formatting 
(Rp 1.250.000), responsive down to 360px.
```

**Implementasi:**
| Elemen Design | Implementasi CSS |
|---------------|-----------------|
| Primary `#0F62FE` | `--color-primary: #0F62FE` |
| Accent `#F59E0B` | `--color-accent: #F59E0B` |
| Positif/Negatif | `--color-positive: #16A34A`, `--color-negative: #DC2626` |
| Border radius 12px | `--radius-md: 12px` (cards), `--radius-sm: 6px` (inputs) |
| Subtle shadow | `--shadow-sm: 0 1px 3px rgba(0,0,0,.08)` |
| Sidebar | Fixed 240px, `#0A0E1A` background, transform untuk mobile |
| Responsive 360px | Breakpoint CSS: 900px, 700px, 400px |
| Rupiah format | `formatRupiah(n)` menggunakan `toLocaleString('id-ID')` |

---

## Layer 5: Accessibility & Code Quality Prompt

> **Tujuan:** Menegakkan standar kode profesional dan aksesibilitas.

```
Accessibility: WCAG AA contrast, labeled form fields, keyboard-navigable, 
aria-labels on charts. Code quality: commented sections, clear function names, 
modular functions in app.js, zero console errors.
```

**Checklist implementasi:**

| Persyaratan | Solusi |
|-------------|--------|
| WCAG AA contrast | Warna primer/teks diverifikasi ≥ 4.5:1 |
| Labeled form fields | Setiap `<input>` / `<select>` punya `<label for="...">` |
| Keyboard navigable | Focus ring via `:focus-visible`, Escape menutup modal |
| ARIA charts | `role="img"`, `aria-label`, `<title>` dalam setiap SVG |
| Focus trap | `trapFocus()` di modal: Tab cycles dalam elemen modal saja |
| Screen reader | `role="dialog"`, `aria-modal="true"`, `aria-live` pada KPI & toast |
| Komentar kode | 19 section header di `app.js` |
| Modular functions | Setiap fitur punya fungsi tersendiri (`renderDashboard`, `generateInsights`, dll) |
| Zero console errors | `'use strict'`, validasi input sebelum parsing, `escapeHtml()` |

---

## Iterasi 1: Bug-Fix Revision Prompt

> **Tujuan:** Memperbaiki 5 bug yang ditemukan saat pengujian manual, tanpa menambah fitur atau mengubah design system.

```
Revise the existing BudgetBuddy project (index.html, style.css, app.js). 
Do not add features or change the design system. Fix only these 5 bugs, 
found during testing:

1. First-run overlay: #firstRunOverlay has no `hidden` attribute in index.html, 
   so it covers the whole app on every reload even when setup data already exists 
   in localStorage. It must be hidden by default and shown only by checkFirstRun() 
   when no setup exists.

2. Sample data double-counts income: monthly income from Setup is added to all 
   income transactions in calcKPIs(), but loadSampleData() also inserts a 
   "Gaji bulanan" income transaction with the same amount. Remove that transaction 
   from the sample data and keep Setup income as the base income. Expected result 
   with sample data: Total Income Rp 5.700.000.

3. Empty-state visibility: `.empty-state` uses display:flex, which overrides the 
   `hidden` attribute, so "Belum ada data pengeluaran" still shows beside charts 
   that have data. Add a global rule `[hidden]{display:none !important}`.

4. Timezone bug: todayStr() and currentMonthStr() use toISOString() (UTC), so 
   dates are wrong in WIB (UTC+7) between 00:00 and 07:00 and around month 
   boundaries. Rewrite them using local date parts 
   (getFullYear/getMonth/getDate).

5. Mobile overflow at 360px: .charts-row and .kpi-grid use minmax(300px,1fr) and 
   minmax(180px,1fr), which cause horizontal scroll. Change to 
   minmax(min(300px,100%),1fr) and minmax(min(180px,100%),1fr), and add 
   min-width:0 to .chart-card.

After fixing, verify: no console errors, the overlay stays hidden after reload, 
no horizontal scroll at 360px width. Update PROMPTS.md to document this revision 
as "Iterasi 1" and remove any layer that was not an actual prompt.
```

**Perubahan yang dilakukan:**

| File | Bug | Perubahan |
|------|-----|-----------|
| `index.html` | Bug 1 | Tambah atribut `hidden` pada `#firstRunOverlay` di baris deklarasi elemen |
| `app.js` | Bug 2 | Hapus baris `{ type:'income', description:'Gaji bulanan', amount:5500000 }` dari `loadSampleData()` |
| `style.css` | Bug 3 | Tambah `[hidden] { display: none !important; }` di blok Reset & Base |
| `app.js` | Bug 4 | `todayStr()`: ganti `toISOString().slice(0,10)` → `getFullYear/getMonth/getDate` lokal; idem `currentMonthStr()` |
| `style.css` | Bug 5 | `.kpi-grid`: `minmax(180px,1fr)` → `minmax(min(180px,100%),1fr)`; `.charts-row`: `minmax(300px,1fr)` → `minmax(min(300px,100%),1fr)`; `.chart-card`: tambah `min-width:0` |

**Dampak pada data:**
- Sebelum fix: Total Income dengan sample data = Rp 11.200.000 (double-count)
- Setelah fix: Total Income dengan sample data = Rp 5.700.000 ✅ (Rp 5.500.000 Setup + Rp 200.000 freelance)

---

## Iterasi 2: Feature Extension Prompt

> **Tujuan:** Menambahkan 3 fitur baru tanpa mengubah design system, struktur file, atau perilaku fitur yang ada.

```
Extend the existing BudgetBuddy project. Do not change the design system, file
structure, or any existing feature behavior. Add only these 3 features:

1. Daily spending allowance: on the Dashboard, add a KPI card "Batas Harian" =
   remaining balance / remaining days in the current month (including today).
   Show "Rp X / hari", and turn red with a warning if the balance is 0 or negative.

2. Month-over-month comparison: add a card on the Dashboard comparing this month's
   total expense and per-category expense against the previous month (based on
   transaction dates). Show the % change with an up/down arrow and color (red for
   increase in spending, green for decrease). If there is no previous-month data,
   show an empty-state message.

3. Learning auto-categorization: allow the user to change a transaction's category
   from the transaction table (dropdown per row). When corrected, store the main
   keyword(s) of its description -> chosen category in localStorage
   (key bb_learned_keywords), and make autoCategory() check learned keywords before
   the default KEYWORD_MAP. Add a small "Reset kategori yang dipelajari" button
   in Settings.

Update "Load sample data" so it also creates some previous-month transactions to
make the comparison card demo-able. Update README.md and PROMPTS.md to document
these features as a new iteration. Keep zero console errors, WCAG AA contrast,
and responsiveness down to 360px.
```

**Perubahan yang dilakukan:**

| File | Fitur | Perubahan |
|------|-------|-----------|
| `index.html` | F1 | Tambah KPI card `#kpiDailyAllowance` ke dalam `.kpi-grid` |
| `index.html` | F2 | Tambah card `#momCard` dengan `#momContent` di atas budget rule card |
| `index.html` | F3 | Tambah `#resetLearnedBtn` di danger zone Settings |
| `app.js` | Storage | Tambah `STORAGE_KEY_LEARNED`, `loadLearnedKeywords()`, `saveLearnedKeyword()`, `clearLearnedKeywords()` |
| `app.js` | F1 | Tambah `renderDailyAllowance()` dipanggil dari `renderDashboard()` |
| `app.js` | F2 | Tambah `getPrevMonthTransactions()` dan `renderMomCard()` |
| `app.js` | F3 | Update `autoCategory()` untuk cek learned map sebelum `KEYWORD_MAP` |
| `app.js` | F3 | Update `renderTransactionTable()`: ganti `<span class="cat-tag">` dengan `<select class="cat-select">` per baris |
| `app.js` | F3 | Tambah `learnCategory()` untuk simpan koreksi + update transaksi |
| `app.js` | F3 | Wire `#resetLearnedBtn` di `wireEvents()` |
| `app.js` | Reset | `resetAllData()` juga menghapus `STORAGE_KEY_LEARNED` |
| `app.js` | Sample | `loadSampleData()` menambahkan 17 transaksi bulan lalu untuk demo MoM |
| `style.css` | F2 | Tambah `.mom-*` component styles (summary, badge, total) |
| `style.css` | F3 | Tambah `.cat-select` styles |

**Keputusan implementasi F3 (Learning categorization):**
- Tokenisasi deskripsi: lowercase, hapus karakter non-alfanumerik, filter token < 3 huruf dan stop-words Indonesia
- Learned keywords disimpan dengan sort by panjang-terpanjang-dulu agar pencocokan spesifik lebih unggul dari yang umum
- Saat user mengubah kategori, transaksi di localStorage juga langsung diperbarui (bukan hanya keyword map)
- Reset dengan `openConfirmModal()` agar konsisten dengan pola konfirmasi yang sudah ada

---

## Ringkasan Prompt Layer Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  PROMPT LAYER ARCHITECTURE                   │
├─────────────────┬───────────────────────────────────────────┤
│ Layer 1         │ System Role & Persona                      │
│ Layer 2         │ Feature Specification (10 fitur)           │
│ Layer 3         │ Output Format & File Structure             │
│ Layer 4         │ Design System & Visual Identity            │
│ Layer 5         │ Accessibility & Code Quality               │
│ Iterasi 1       │ Bug-Fix Revision (5 bug dari testing)      │
│ Iterasi 2       │ Feature Extension (3 fitur baru)           │
└─────────────────┴───────────────────────────────────────────┘
```

---

_Dokumen ini dibuat sebagai bagian dari capstone project AI Agent for Programming (IT Track)._
