# P2 — PBT & District Intelligence | Fasa 1

## Tujuan
Profil spatial interaktif untuk 12 PBT dan 9 daerah di panel Urban Intelligence SUO 3D GeoPortal. Klik dropdown atau poligon peta utama. Hasil pemilihan: highlight sempadan, zoom/fokus, keluasan rujukan, bilangan kemudahan serta pecahan kategori.

## Rujukan data
- **Sempadan PBT**: `data/pentadbiran/sempadan_pbt_selangor_2024.geojson` (12 poligon).
- **Sempadan daerah**: `data/pentadbiran/sempadan_daerah_selangor.geojson` (9 daerah).
- **Keluasan PBT**: rujukan JUPEM 2024 yang telah dibekalkan dan dipersetujui untuk SUO; nilai hektar disimpan berasingan dalam `js/admin-intelligence.js`. **Jangan** gantikan dengan `web_area` poligon PBT yang mempunyai keluasan berlainan.
- **Keluasan daerah**: atribut `web_area` daripada dataset sempadan daerah GeoPortal, dengan label sumber yang berbeza daripada rujukan PBT.
- **Pendidikan**: `data/pendidikan/sekolah_suo_gabungan.geojson` (1,212 titik).
- **Kesihatan**: `data/kesihatan/kemudahan_kesihatan_selangor.geojson` (87 titik; sebahagian lokasi anggaran dan memerlukan semakan).
- **Keselamatan**: `data/keselamatan/kemudahan_keselamatan_dashboard_184.geojson` (184 titik; PDRM, JBPM, APM).

## Kaedah spatial
1. Pilih poligon sebenar melalui `web_name`, bukan mengira melalui nama PBT/daerah di atribut titik.
2. Semak bounding box untuk mengecilkan jumlah calon titik.
3. Jalankan *point-in-polygon* menggunakan `pointInFeature` daripada `js/spatial-query.js` (menyokong Polygon dan MultiPolygon, termasuk lubang).
4. Kira jumlah kategori dan pecahan setiap sumber **hanya jika dataset berjaya dimuatkan**; jika gagal, tunjuk sengkang/ralat, bukan 0.
5. Highlight menggunakan source tersendiri (`suo-admin-selection-source`) supaya tidak memadam hasil carian Mr. TPr. SUO.

## QA awal (pengiraan menggunakan fail data repository)
- Semua 12 PBT ditemukan dan rujukan keluasan JUPEM tersedia untuk setiap satu.
- Jumlah titik yang tergolong dalam 12 poligon PBT: pendidikan **1,212 / 1,212**, kesihatan **86 / 87**, keselamatan **183 / 184**.
- **Dua titik di luar poligon PBT** dalam set sedia ada: KPJ Damansara Specialist Hospital 2 (kesihatan) dan PPAD Gombak (APM). Semakan lokasi/tutupan sempadan diperlukan; jangan auto-paksa titik tersebut ke kawasan berdekatan.
- Contoh semakan MBSA: **103 sekolah, 12 kemudahan kesihatan, 21 kemudahan keselamatan** menurut join spatial semasa; keluasan rujukan **30,144.60 ha**.
- Ujian logik sintaks dan mock DOM membuktikan profil MBSA dirender, pilihan PBT berfungsi, highlight dipanggil dan butang clear menetapkan semula keadaan.

## Had dan langkah susulan
- Statistik lokasi berdasarkan data titik yang **tersedia dalam portal**, bukan inventori rasmi lengkap atau penilaian aksesibiliti.
- Keluasan rujukan JUPEM 2024 dan poligon GIS semasa bukan semestinya sempadan daripada keluaran yang sama.
- Fasa 1 memberi highlight pada **peta utama** sahaja; peta compare dan integrasi statistik tambahan boleh dipertimbang dalam Fasa 2.
- Ujian visual desktop serta iPhone pada GitHub Pages tetap diperlukan sebelum mengesahkan keseluruhan P2 selesai.
