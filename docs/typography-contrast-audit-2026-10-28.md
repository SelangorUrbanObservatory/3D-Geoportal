# Audit Tipografi & Kontras SUO 3D GeoPortal
**Tarikh:** 28 Oktober 2026
**Skop:** Semua komponen teks utama pada 3D GeoPortal (sidebar kiri/kanan, Smart Search, layer, AI Assistant, Compare Engine, spatial/network tools, Landuse, Flood/Weather, popup dan mod mobile).

## Isu dikenal pasti melalui semakan kod
- Fail legacy `styles.css` mempunyai lebih 100 deklarasi saiz font di bawah 11.5px, termasuk label sekitar 7–10px.
- Modul Smart Search masih menggunakan panel gelap dan teks campuran daripada tema terdahulu, tidak selari dengan warna krim Selangor.
- Sebahagian label Compare Engine, Landuse serta butang/nota AI menggunakan warna putih atau hampir putih yang tidak sesuai pada permukaan cerah.
- Metadata cuaca, banjir, carian, kad KPI dan status sumber terlalu kecil.
- Nota pada peta dan popup berisiko sukar dibaca pada layar kecil.

## Pembetulan
- Tambah `css/typography-contrast-audit.css` dan muat selepas CSS visual sedia ada. Tiada perubahan layer GIS, simbol peta, data, fungsi controller atau susunan HTML.
- Token rujukan untuk tema cerah: teks utama **#352C27**, teks sekunder **#625247**, metadata **#64574C**, penekanan **#87343B**.
- Atas latar `#FFFDF9`, anggaran nisbah kontras masing-masing ialah **13.41:1**, **7.34:1**, **6.87:1**, dan **8.00:1** (WCAG relative luminance).
- Teks lazimnya dinaikkan kepada **11–12.5px** atau lebih untuk keterangan penting. UI dinamik seperti stesen, peta dan penanda hujan yang mempunyai saiz terhad tidak dipaksa menggunakan saiz berlebihan.
- Pemilihan aktif berlatar merah kekal teks putih; warna label Mapbox sebenar pada canvas tidak disentuh.
- Smart Search menggunakan permukaan cerah dengan kontras tajuk/metadata yang konsisten; Compare, AI, Spatial/Network, Landuse, Flood, Weather dan popup dikemas kini.

## Semakan statik
- Fail CSS baharu telah melalui pemeriksaan keseimbangan kurungan, kutipan, dan penanda komen.
- Fail CSS dipautkan selepas stylesheet audit Layer Management dan Width Adjuster.
- Semua 18 pemilih kritikal (search, compare, landuse, flood, weather, popup dan panel) ditemukan dalam fail audit.
- Struktur P1 DPN3, P2 Intelligence, fungsi resizer, checkbox dan semua layer asal tidak diubah.

## Batasan / QA visual susulan
Pemeriksaan ini berdasarkan sumber kod dan pengiraan warna. Ia **bukan audit visual automatik terhadap computed style semua elemen** dalam pelayar; modal, hover, zoom teks, paparan iPhone dan keadaan sebenar perlu diperiksa selepas GitHub Pages memuatkan versi baharu. Sasaran minimum kontras teks biasa 4.5:1, teks besar 3:1. Jika ada komponen pihak ketiga dengan gaya berbeza, itu perlu diasingkan supaya tidak menjejaskan antaramuka utama.
