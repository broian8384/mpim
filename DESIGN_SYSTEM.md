# IMPIM Design System & Color Palette

Dokumen ini menjadi acuan standar penggunaan warna dan gaya di seluruh aplikasi MPIM untuk menjaga konsistensi visual.

## 1. Identitas Brand (Primary Color)
Warna utama aplikasi mengikuti identitas RSPIK (Hijau).

| Token | Tailwind Class | Kode Hex (Est) | Penggunaan |
|-------|---------------|----------------|------------|
| **Primary Main** | `bg-green-600` | #16a34a | Tombol Utama, Header Aktif, Ikon Penting |
| **Primary Hover** | `bg-green-700` | #15803d | State Hover pada Tombol |
| **Primary Light** | `bg-green-50` | #f0fdf4 | Background Sidebar Aktif, Badge Staff, Container Logo |
| **Focus Ring** | `ring-green-500` | #22c55e | Ring fokus pada input form |
| **Text Link** | `text-green-600` | #16a34a | Link, Teks Klik-able |

## 2. Warna Netral (Neutrals)
Digunakan untuk layout, teks, dan border agar tampilan bersih dan modern.

| Token | Tailwind Class | Penggunaan |
|-------|---------------|------------|
| **Background App** | `bg-slate-50` | Latar belakang utama halaman (canvas) |
| **Surface/Card** | `bg-white` | Kartu konten, Modal, Sidebar |
| **Text Heading** | `text-slate-900` | Judul Halaman, Nama User (Bold) |
| **Text Body** | `text-slate-700` | Label Form, Isi Tabel data |
| **Text Muted** | `text-slate-500` | Sub-judul, metadata, hint text |
| **Text Disabled** | `text-slate-400` | Placeholder input, ikon non-aktif |
| **Border Light** | `border-slate-200` | Garis pemisah tabel, border kartu |
| **Border Input** | `border-slate-300` | Border input field default |

## 3. Sistem Role & Status (Semantic Colors)
Warna pembeda untuk peran pengguna dan status data.

### Role Badges
| Role | Tailwind Combo | Visual |
|------|---------------|--------|
| **Super Admin** | `bg-rose-50 text-rose-700 border-rose-200` | Merah Muda/Rose (Indikator Power Tinggi) |
| **Admin** | `bg-purple-50 text-purple-700 border-purple-200` | Ungu (Administrator Standar) |
| **Staff** | `bg-green-50 text-green-700 border-green-200` | Hijau (User Standar / Brand Color) |

### Status Indicators
| Status | Class | Visual |
|--------|-------|--------|
| **Active** | `bg-emerald-500` | Hijau Terang (Dot Indicator) |
| **Inactive** | `bg-slate-300` | Abu-abu |
| **Error** | `text-red-600 bg-red-50` | Pesan Error Form |

## 4. Tipografi
Font Family: Default Sans (Inter/System Default melalui Tailwind).

- **H1 / Page Title:** `text-2xl font-bold text-slate-900`
- **Section Label:** `text-sm font-medium text-slate-700`
- **Table Text:** `text-sm text-slate-800`

---
*Dokokumen ini dibuat otomatis sebagai referensi pengembangan.*
