# SUO 3D GeoPortal — Width Adjuster Panel Kiri/Kanan

## Fungsi
- Pada desktop atau tablet lebar **981px ke atas**, seret pemegang di antara panel kiri / peta dan peta / panel kanan.
- Laras panel secara **bebas**, dengan lebar minimum **250px** dan maksimum **580px**, mengikut ruang yang ada.
- Peta sentiasa diperuntukkan sekurang-kurangnya **360px** dalam susun atur desktop.
- Lebar pengguna disimpan menggunakan localStorage key `suoWorkspacePanelWidthsV1`.
- Double-click pemegang untuk menetapkan semula lebar default (318/330px untuk >1180px, 290/300px untuk <=1180px).
- Pemegang boleh digunakan melalui papan kekunci: ArrowLeft/ArrowRight (langkah 24px), Home (minimum), End (maksimum).
- Collapse, reopen dan Focus Map masih berfungsi; apabila panel disembunyikan, pemegangnya juga disembunyikan.
- Mapbox main map dan Compare Engine dipanggil `resize()` secara terhad pada animation-frame semasa drag dan selepas drag.
- Pada viewport **980px ke bawah**, terus gunakan drawer responsif sedia ada, tanpa pemegang drag agar peta tidak kehilangan ruang. Lebar desktop yang disimpan tidak diubah kerana peralihan kepada paparan telefon.

## Perubahan fail
- `index.html`: dua pemegang `role=separator` dengan atribut ARIA, stylesheet tambahan dan cache-busting.
- `js/ui/workspace-controller.js`: logik seret pointer, papan kekunci, simpanan saiz, pembatas ruang peta dan resize.
- `css/sidebar-width-adjuster.css`: custom grid tracks dan CSS container queries untuk isi panel.
- `js/app.js`: versi import workspace controller bagi mengelakkan cached module lama.

## Responsif kandungan
- Panel sempit: grid carian dan senarai bandar menjadi 1 kolum, tab network membungkus, KPI mengecil kepada 1 kolum hanya jika benar-benar sempit.
- Panel sederhana: KPI dan tab kekal terbaca dalam 2 atau 3 kolum bergantung modul.
- Panel besar: KPI negeri boleh menjadi 4 kolum; tab PBT & District Intelligence boleh menjadi 4 kolum; senarai bandar lebih lebar.
- Grid diubah mengikut **lebar sebenar container**, bukan semata-mata lebar skrin.

## Ujian
- Periksa drag kiri/kanan pada desktop (lebar 1024, 1280, 1440).
- Periksa kekangan peta minimum, persist selepas refresh, dan reset double-click.
- Periksa collapse/reopen kedua-dua panel, Focus Map, serta split screen.
- Uji reflow kandungan Urban Explorer, PBT & District Intelligence dan Network Intelligence.
- Uji iPhone: drawer asal kekal boleh diakses, tanpa pemegang resizer menutupi peta.
- Pemeriksaan kod/simulasi berjaya; ujian visual live perlu dibuat selepas GitHub Pages dikemas kini.
