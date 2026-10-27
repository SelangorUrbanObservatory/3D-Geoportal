# SUO 3D GeoPortal — DPN3 Tier Migration (28 Oktober 2026)

Urban Explorer dan Urban Tour kini menggunakan **33 bandar Selangor** mengikut **Tier 1 (7), Tier 2 (3), Tier 3 (23)** daripada senarai kerja Lampiran DPN3. Fail rujukan: `data/hierarki_bandar_selangor_dpn3.geojson`; konfigurasi: `config/urban-hierarchy.json`. Koordinat ialah titik fokus paparan (bukan sempadan statutori). **Senarai masih perlu disemak terhadap penerbitan rasmi DPN3 MyPLAN yang dinyatakan bertarikh 30 Oktober 2026.**

Rujukan hierarki: https://myplan.planmalaysia.gov.my/portal-main/publication-details?id=72 ; salinan lampiran untuk semakan awal: https://www.scribd.com/document/1073303886/Senarai-Bandar-DPN3 . Lokasi daripada fail GeoPortal terdahulu, JUPEM MyGeoName Selangor 2022 dan OpenStreetMap/Mapcarta. Warta RS Negeri Selangor 2035 (Pengubahan) masih merujuk DPN2; kedua-duanya tidak boleh ditafsirkan sebagai sumber kategori yang sama.

---

# SUO GeoPortal v8.0.4 Public Transport Rail Layer

## Struktur JavaScript

```text
js/
├── app.js
├── config.js
├── utils.js
├── layers.js
├── urban-explorer.js
├── urban-tour.js
└── compare.js
```

## Urban Tour Engine

Urban Tour membaca terus `config/urban-hierarchy.json` dan bergerak mengikut susunan:

1. Bandar Negeri
2. Bandar Utama
3. Bandar Tempatan

Fungsi:

- Play automatik
- Pause dan sambung
- Next dan previous
- Stop
- Kad nama bandar, hierarki dan daerah
- Progress bar
- Kamera sentiasa menghadap utara
- Tamat dengan zoom keluar Selangor

## Fungsi teras

- Urban Explorer DPN2
- 2D dan 3D
- Split screen
- Middle mouse pan
- Layer Hierarki Bandar DPN2
- Kemudahan Kesihatan Negeri Selangor
- Dropdown legend
- Search
- Geolocation
- ChatGIS asas

Upload semua fail dan folder ke GitHub Pages. Oleh sebab v3.0 menggunakan ES modules, portal perlu dibuka melalui GitHub Pages atau web server, bukan terus melalui `file://`.


## Live Traffic

Sumber:

```text
mapbox://mapbox.mapbox-traffic-v1
```

Source layer:

```text
traffic
```

Kategori kesesakan:

- low — Lancar
- moderate — Sederhana
- heavy — Sesak
- severe — Sangat Sesak
- lain-lain — Tiada Maklumat

Layer ini dimuatkan pada peta utama dan split screen melalui modul `layers.js`.


## Keselamatan Awam

Layer ini hanya mengandungi:

- IPK: 2 lokasi
- IPD: 15 lokasi

Dikecualikan:

- Balai Polis
- Balai Trafik
- Pondok Polis Komuniti
- Rekod BALAI/UNIT lain

Fail data:

```text
data/keselamatan/ipk_ipd_selangor.geojson
```

Simbol:

- IPK — bangunan polis biru gelap dan lebih besar
- IPD — bangunan polis biru


## Weather Intelligence

Modul baharu:

```text
js/weather.js
```

Sumber ramalan:

```text
https://api.open-meteo.com/v1/forecast
```

Sumber amaran rasmi:

```text
https://api.data.gov.my/weather/warning
```

Maklumat yang dipaparkan:

- Keadaan cuaca semasa
- Suhu
- Suhu terasa
- Kelembapan
- Hujan
- Kelajuan angin
- UV
- Jarak penglihatan
- Tekanan udara
- Matahari terbit dan terbenam
- Ramalan 24 jam
- Ramalan 7 hari
- Pautan radar hujan METMalaysia
- Amaran cuaca rasmi METMalaysia
- Parameter suhu, hujan, angin dan kelembapan

Weather Intelligence akan berubah mengikut bandar yang dipilih dalam Urban Explorer
atau Urban Tour. Pengguna juga boleh memilih `Pusat Peta`.


## Flood Intelligence — Fasa 1

Modul baharu:

```text
js/flood.js
```

Komponen:

- Ramalan hujan 24 jam bagi semua bandar DPN2
- Layer titik ramalan hujan pada peta
- Ranking bandar mengikut jumlah hujan
- Amaran banjir masa nyata daripada data.gov.my
- Pautan operasi paras sungai dan hujan Public InfoBanjir JPS
- Pautan semakan PPS aktif JKM
- Pautan Portal Bencana NADMA
- Ruang risiko banjir statik yang menunggu layer hazard rasmi

### Penting

Ramalan hujan 24 jam ialah indikator meteorologi awal dan **bukan**
ramalan bahawa sesuatu kawasan pasti akan banjir.

### Sumber API

```text
https://api.open-meteo.com/v1/forecast
https://api.data.gov.my/flood-warning
```

### Sumber operasi

```text
https://publicinfobanjir.water.gov.my/
https://infobencanajkmv2.jkm.gov.my/
https://portalbencana.nadma.gov.my/
```

### Layer risiko statik akan datang

Apabila data rasmi dibekalkan, gunakan lokasi:

```text
data/banjir/risiko_banjir_selangor.geojson
```


## Sempadan PBT Negeri Selangor 2024

Sumber asal:

```text
Sempadan_PBT_Negeri_Selangor_2024.shp
```

Proses:

- CRS asal: EPSG:3380 — GDM2000 / Cassini Selangor
- CRS portal: EPSG:4326 — WGS84
- Jumlah feature: 12 PBT
- Field nama: `NAMA_PBT`
- Field kategori: `KATEGORI`

Fail output:

```text
data/pentadbiran/sempadan_pbt_selangor_2024.geojson
```

Fungsi:

- Fill poligon lutsinar
- Garisan sempadan biru
- Label nama PBT
- Toggle dalam Layer Management
- Dropdown legend
- Popup nama, kategori, keluasan dan tahun data
- Berfungsi pada peta utama serta split screen


## Layer Management Baharu

Susunan utama:

1. Hierarki Bandar DPN2
2. Kemudahan
   - Kesihatan
   - Keselamatan
3. Flood Intelligence Fasa 1
4. Live Traffic

Kategori tambahan dikekalkan selepas susunan utama:

- Pentadbiran
  - Sempadan PBT Selangor 2024
- Peta Asas
  - Terrain 3D
  - Bangunan 3D

Setiap kategori boleh dibuka atau ditutup secara berasingan.

## Ask Mr. TPr. SUO

Nama `AI CHATGIS` telah ditukar kepada:

```text
Ask Mr. TPr. SUO
```

Subtajuk:

```text
Pembantu AI Perancangan Bandar
```

Input turut ditukar kepada `Tanya Mr. TPr. SUO...`.


## Pembetulan Label PBT

Versi ini dibina semula daripada v3.6.

- Label asal Mapbox dikekalkan dan dihidupkan.
- Poligon PBT masih digunakan untuk fill, sempadan dan popup.
- Label PBT tidak lagi dijana terus daripada poligon.
- Satu `representative_point` dijana untuk setiap PBT.
- Jumlah label PBT SUO: tepat 12 label, satu bagi setiap PBT.
- Pembetulan turut digunakan pada split screen melalui modul `layers.js`.

Fail baharu:

```text
data/pentadbiran/label_pbt_selangor_2024.geojson
```

Struktur sumber:

```text
sempadan_pbt_selangor_2024.geojson   → fill, line dan popup
label_pbt_selangor_2024.geojson      → satu label bagi setiap PBT
```

Label Mapbox tidak dimatikan dalam versi ini.


## Collapsible Workspace

Kolum kiri dan kanan kini boleh dibuka atau disimpan secara berasingan.

### Kawalan

- `◀` pada kolum kiri — simpan kolum kiri
- `▶` pada kolum kanan — simpan kolum kanan
- Tab `Layer & Navigasi` — buka semula kolum kiri
- Tab `Intelligence` — buka semula kolum kanan
- `Focus Map` — simpan kedua-dua kolum
- `Restore Panels` — pulihkan keadaan sebelum Focus Map

### Penyimpanan keadaan

Keadaan panel disimpan dalam browser menggunakan:

```text
localStorage key:
suoWorkspacePanelStateV39
```

Apabila portal dibuka semula, keadaan terakhir kolum akan dipulihkan.

### Mapbox resize

Peta utama dan peta split screen memanggil `resize()` selepas perubahan
layout untuk memastikan canvas memenuhi ruang baharu.


## Ask Mr. TPr. SUO — Local Spatial Query Engine

Modul baharu:

```text
js/
├── intent-parser.js
├── spatial-query.js
├── map-actions.js
└── ai-assistant.js
```

### Fungsi v4.0A

- Kiraan kemudahan kesihatan mengikut kategori dan daerah
- Kiraan kemudahan kesihatan dalam sempadan PBT menggunakan point-in-polygon
- Filter hospital kerajaan dan swasta
- Kiraan IPK dan IPD
- Kiraan PBT dan bandar DPN2
- Keluasan PBT
- Highlight hasil query
- Zoom kepada hasil
- Popup keputusan PBT
- Buka dan tutup layer
- Arahan 2D dan 3D
- Buka split screen
- Kawal kolum kiri dan kanan
- Focus Map
- Navigasi bandar hanya digunakan sebagai fallback selepas query data diperiksa

### Contoh arahan

```text
Berapa hospital di daerah Klang?
Berapa hospital kerajaan di Petaling?
Berapa klinik kesihatan dalam MBSA?
Berapa IPD di Selangor?
Keluasan MBSA
Berapa PBT di Selangor?
Tunjukkan semua hospital
Buka Live Traffic
Matikan Flood Intelligence
Tukar ke 2D
Buka split screen
Tutup kolum kiri
```

### Data tempatan

Engine ini membaca terus GeoJSON portal dan tidak memerlukan API AI berbayar.

```text
data/kesihatan/kemudahan_kesihatan_selangor.geojson
data/keselamatan/ipk_ipd_selangor.geojson
data/pentadbiran/sempadan_pbt_selangor_2024.geojson
data/hierarki_bandar_selangor_dpn2.geojson
```

### Had v4.0A

- Pemahaman bahasa masih berasaskan parser arahan terkawal.
- Analisis daerah kesihatan menggunakan atribut `web_district`.
- Analisis dalam PBT menggunakan point-in-polygon.
- Buffer, radius, nearest facility dan query GTN1 akan dibangunkan dalam v4.0B.


## Pentadbiran

Kategori Pentadbiran kini mengandungi:

- Sempadan PBT
- Sempadan Daerah

### Sempadan Daerah

Sumber asal:

```text
DAERAH_SELANGOR_2024.shp
```

Pemprosesan:

- CRS asal: EPSG:3375
- CRS portal: EPSG:4326
- Jumlah daerah: 9
- Field nama asal: `NAM`
- Field kod daerah: `daerah_id`
- Field keluasan: `Hektar`
- `ULU SELANGOR` dinormalkan kepada `Hulu Selangor`
- `ULU LANGAT` dinormalkan kepada `Hulu Langat`

Fail output:

```text
data/pentadbiran/sempadan_daerah_selangor.geojson
data/pentadbiran/label_daerah_selangor.geojson
```

Fungsi:

- Fill poligon ungu lutsinar
- Garisan sempadan ungu putus-putus
- Satu label bagi setiap daerah
- Toggle dan dropdown legend
- Popup nama, kod dan keluasan
- Peta utama dan split screen
- Arahan Ask Mr. TPr. SUO untuk buka/tutup Sempadan Daerah


## District Spatial Query

Ask Mr. TPr. SUO kini disambungkan terus kepada poligon sempadan daerah.

Pertanyaan yang disokong:

```text
Berapa daerah di Selangor?
Keluasan Daerah Klang
Tunjukkan Daerah Petaling
Zoom ke Daerah Gombak
Berapa hospital di Daerah Klang?
Berapa klinik kesihatan dalam Daerah Petaling?
Berapa IPD di Daerah Hulu Langat?
Tunjukkan semua sempadan daerah
Buka Sempadan Daerah
Matikan Sempadan Daerah
```

### Kaedah query

- Kiraan dan keluasan daerah membaca terus layer sempadan daerah.
- Query kesihatan mengikut daerah menggunakan point-in-polygon.
- Query IPK/IPD mengikut daerah menggunakan point-in-polygon.
- Jika poligon daerah gagal ditemui, sistem menggunakan atribut daerah sebagai fallback.
- Hasil query di-highlight dan peta dizum kepada hasil.

### Data

```text
data/pentadbiran/sempadan_daerah_selangor.geojson
data/pentadbiran/label_daerah_selangor.geojson
```


## Perbandingan Keluasan Antara Layer

Ask Mr. TPr. SUO kini boleh membandingkan keluasan antara:

- Sempadan Daerah
- Sempadan PBT

Contoh:

```text
Beza luas Daerah Sabak Bernam dan Majlis Daerah Sabak Bernam
```

Sistem akan:

1. Mengesan intent `compareArea`.
2. Membaca poligon Daerah Sabak Bernam.
3. Membaca poligon Majlis Daerah Sabak Bernam.
4. Mengambil atribut `web_area` daripada kedua-dua layer.
5. Mengira beza mutlak.
6. Mengira peratus perbezaan berbanding kawasan yang lebih kecil.
7. Highlight kedua-dua poligon.
8. Zoom kepada kawasan perbandingan.

Semakan data semasa:

```text
Daerah Sabak Bernam: 107,810.51 hektar
Majlis Daerah Sabak Bernam: 99,812.09 hektar
Perbezaan: 7,998.42 hektar
Peratus perbezaan: 8.01%
```


## Kemudahan Pendidikan

Layer baharu:

```text
Kemudahan
├── Kesihatan
├── Keselamatan
└── Pendidikan
```

Data sekolah:

```text
data/pendidikan/sekolah_negeri_selangor.geojson
```

Ringkasan:

- Jumlah sekolah: 945
- Sekolah Rendah: 664
- Sekolah Menengah: 281
- CRS asal: EPSG:4326
- Field nama asal: `Nama_Sekol`
- Field PPD: `PPD`
- Field PBT: `PBT`
- Field jenis warta: `JenisWarta`
- Field tahap: `Tahap_Seko`

Medan portal:

```text
web_name
web_type
web_level
web_ppd
web_district
web_pbt
```

Ask Mr. TPr. SUO kini menyokong:

```text
Berapa sekolah di Daerah Klang?
Berapa sekolah rendah di Daerah Petaling?
Berapa sekolah menengah dalam MBSA?
Tunjukkan semua sekolah rendah
Cari SEKOLAH MENENGAH KEBANGSAAN SEKSYEN 7
Buka Pendidikan
Matikan sekolah
```

Query daerah menggunakan point-in-polygon dengan layer sempadan daerah.
Query PBT menggunakan kod PBT pada atribut sekolah seperti `MBSA`, `MBPJ`
dan lain-lain. Hasil query akan di-highlight dan peta dizum kepada hasil.


## Smart Search

Carian lokasi biasa telah dinaik taraf kepada carian seluruh GeoPortal.

Modul:

```text
js/smart-search.js
```

Smart Search mengindeks:

- Bandar DPN2
- Sempadan PBT
- Sempadan Daerah
- Hospital dan klinik
- Sekolah
- IPK dan IPD

Jika hasil tempatan tidak mencukupi, carian akan turut menggunakan Mapbox
Geocoding untuk lokasi umum di Malaysia.

### Fungsi

- Carian semasa pengguna menaip
- Pengelompokan keputusan mengikut layer
- Skor padanan nama dan atribut
- Navigasi menggunakan anak panah atas/bawah
- Enter untuk memilih hasil
- Escape untuk menutup keputusan
- Highlight feature SUO
- Auto-zoom
- Popup atribut
- Butang kosongkan carian
- Sokongan geometri Point, Polygon dan MultiPolygon

### Contoh

```text
Shah Alam
MBSA
Daerah Klang
Hospital Shah Alam
Klinik Kesihatan Meru
SMK Seksyen 7
IPD Klang
Majlis Perbandaran Kajang
```


## Standardised Popup Theme

Semua popup Mapbox kini menggunakan satu tema SUO yang seragam:

- Latar putih
- Tajuk hampir hitam (`#111827`)
- Kandungan dark grey (`#374151`)
- Butang tutup dark grey
- Pointer popup putih
- Border dan shadow yang konsisten
- Saiz responsif untuk skrin kecil

Tema ini digunakan secara global kepada popup daripada:

- Bandar DPN2
- Sempadan PBT
- Sempadan Daerah
- Kesihatan
- Keselamatan
- Pendidikan
- Smart Search
- Flood Intelligence
- Hasil Ask Mr. TPr. SUO

CSS semantik untuk pembangunan seterusnya turut disediakan:

```text
.suo-popup
.suo-popup-title
.suo-popup-row
```


## Ask Mr. TPr. SUO v5.0 — Attribute Query Engine

Modul baharu:

```text
js/attribute-query.js
```

Enjin ini menggunakan registry metadata bagi setiap layer untuk menukar ayat
pengguna kepada penapis atribut yang dibenarkan.

### Layer yang didaftarkan

- Pendidikan
- Kesihatan
- Keselamatan
- Hierarki Bandar DPN2

### Contoh pertanyaan

```text
Sekolah yang tiada warta?
Berapa sekolah yang tiada warta?
Sekolah menengah dalam PPD Klang yang tiada warta
Berapa sekolah rendah dalam MBSA?
Hospital swasta di Daerah Klang
Klinik Kesihatan kerajaan di Daerah Petaling
IPD di Daerah Petaling
Bandar kategori Bandar Utama
```

### Kaedah

```text
Soalan pengguna
→ Intent Parser
→ Attribute Query Registry
→ Penapis field/value
→ Spatial boundary jika perlu
→ Kiraan
→ Highlight
→ Auto-zoom
→ Jawapan dengan penapis dan kaedah
```

### Metadata Pendidikan

```text
web_type       → Status/Jenis Warta
web_level      → Tahap Sekolah
web_ppd        → PPD
web_district   → Daerah
web_pbt        → PBT
web_name       → Nama sekolah
```

Nilai warta yang terdapat dalam data:

```text
Tiada
TM_KPM
W.S62
166(4)
SUKSel
```

### Semakan data

```text
Sekolah yang tiada warta: 504
Sekolah menengah dalam PPD Klang yang tiada warta: 27
Sekolah rendah dalam MBSA: 55
```

Query daerah menggunakan point-in-polygon apabila poligon daerah tersedia.
Query PBT bagi kesihatan menggunakan point-in-polygon, manakala data sekolah
menggunakan atribut kod PBT yang tersedia dalam data sekolah.

Enjin tidak menjalankan JavaScript bebas dan hanya menggunakan field serta
nilai yang didaftarkan dalam metadata.


## Enterprise Compare Engine v6.0

Compare Mode kini menggunakan state yang berasingan untuk:

```text
Main Map
Left Compare Map
Right Compare Map
```

Konfigurasi Main Map disimpan sebelum Compare Mode dibuka dan dipulihkan
apabila Compare Mode ditutup.

### Tab Layers

Setiap paparan boleh mengaktifkan layer secara bebas:

- Hierarki Bandar DPN2
- Kesihatan
- Pendidikan
- Keselamatan
- Flood Intelligence
- Live Traffic
- Sempadan Daerah
- Sempadan PBT

### Tab Basemap

Semua pilihan berikut tersedia pada Left Map dan Right Map:

- Standard
- Satellite
- Hybrid
- Terrain
- Light
- Dark
- Outdoors
- Streets
- Navigation Day
- Navigation Night
- OpenStreetMap

Kedua-dua paparan boleh menggunakan basemap yang sama atau berlainan.

### Tab Display

- Left Map 2D / 3D
- Right Map 2D / 3D
- Basemap Labels ON / OFF bagi setiap paparan
- Sync Pan
- Sync Zoom
- Sync Bearing
- Sync Pitch

Setiap tetapan sync boleh dihidupkan atau dimatikan secara berasingan.

### Penyimpanan

Konfigurasi Compare Mode disimpan melalui:

```text
localStorage key:
suoCompareStateV60
```

Pilihan layer, basemap, paparan dan sync terakhir akan digunakan semula
pada sesi seterusnya.

### Fail utama

```text
js/compare.js
js/config.js
js/flood.js
index.html
styles.css
```

### Nota teknikal

OpenStreetMap menggunakan raster tiles rasmi OSM. Attribution kekal
dipaparkan melalui konfigurasi sumber raster.


## Cache Fix v6.0.1

`index.html` kini menggunakan cache-busting:

```text
styles.css?v=6.0.1
js/app.js?v=6.0.1
```

Tanda visual versi aktif:

```text
GeoPortal v6.0.1
Compare Mode v6.0.1
v6.0.1 • 11 BASEMAPS
```


## Compare Stability Fix v6.0.2

Pembetulan utama:

1. OpenStreetMap raster dikunci kepada mod 2D.
2. Terrain dimatikan secara automatik untuk basemap yang tidak menyokong 3D.
3. Layer SUO dipasang semula melalui satu pipeline selepas `style.load`.
4. Left Map dan Right Map menunggu basemap stabil sebelum layer ditambah.
5. Layer state digunakan semula selepas Flood Intelligence selesai dimuatkan.
6. Kamera sync menghormati kemampuan 2D/3D setiap paparan.
7. State lama v6.0.1 tidak digunakan; key baharu ialah:

```text
suoCompareStateV602
```

Tanda versi aktif:

```text
GeoPortal v6.0.2
Compare Mode v6.0.2
v6.0.2 • STABILITY FIX
```

Cache busting:

```text
styles.css?v=6.0.2
js/app.js?v=6.0.2
```


## Layer Compatibility Fix v6.0.3

Punca Right Map kosong:

```text
Layer SUO menggunakan slot "top" dan "middle".
Mapbox Standard mempunyai named slots.
Satellite, Streets, Dark, Light dan raster OSM tidak semestinya
mempunyai named slots yang sama.
```

Pembetulan:

- Fungsi `addLayerCompat()` ditambah dalam `js/utils.js`.
- Setiap layer menyemak kewujudan slot sebelum dipasang.
- Jika slot tidak tersedia, property `slot` dibuang secara automatik.
- Layer kemudian dipasang pada bahagian atas style klasik.
- Kaedah ini digunakan pada:
  - semua layer portal;
  - layer Flood Intelligence;
  - layer highlight Ask Mr. TPr. SUO.
- Custom OpenStreetMap style kini mempunyai `glyphs` untuk label teks.

Tanda versi aktif:

```text
GeoPortal v6.0.3
Compare Mode v6.0.3
v6.0.3 • LAYER COMPATIBILITY
```

Cache busting:

```text
styles.css?v=6.0.3
js/app.js?v=6.0.3
```


## Floating Compare Panel v6.1

Compare Panel kini boleh:

- Minimize dan expand
- Diseret ke mana-mana lokasi dalam ruang peta
- Dipin supaya kekal terbuka
- Di-unpin untuk mengaktifkan auto-hide
- Dikembalikan ke kedudukan asal
- Ditutup seperti biasa

### Kawalan

```text
📌  Pin / Auto-hide
—   Minimize
□   Reset kedudukan
✕   Tutup Compare Mode
```

### Auto-hide

Apabila panel di-unpin:

1. Panel kekal terbuka semasa tetikus berada di atasnya.
2. Selepas tetikus keluar, panel diminimize secara automatik.
3. Apabila tetikus kembali ke header, panel dibuka semula.

### Penyimpanan

Keadaan UI disimpan menggunakan:

```text
suoComparePanelUIV61
```

Maklumat yang disimpan:

- status minimized;
- status pinned;
- kedudukan X;
- kedudukan Y.

### Modul baharu

```text
js/compare-panel-ui.js
```

Cache busting:

```text
styles.css?v=6.1
js/app.js?v=6.1
```


## Lot Kadaster Selangor 2023

Kategori baharu diletakkan di atas kategori Pentadbiran:

```text
Lot Kadaster
└── Lot Kadaster Selangor 2023

Pentadbiran
├── Sempadan PBT
└── Sempadan Daerah
```

Metadata data asal:

- 1,350,128 poligon
- CRS: GDM2000 Cassini Selangor
- SHP: 186.49 MB
- DBF: 767.40 MB

Disebabkan saiz data, portal menggunakan seni bina Vector Tile dan tidak
menukar keseluruhan data kepada GeoJSON.

Fail baharu:

```text
js/cadastral.js
config/cadastral-layer.json
data/kadaster/ndcdb_selangor_2023_metadata.json
PUBLISH_LOT_KADASTER_2023.md
```

Fungsi:

- toggle dan legend;
- fill dan sempadan lot;
- label nombor lot pada zoom dekat;
- popup atribut;
- sokongan peta utama;
- sokongan Left/Right Compare Map;
- arahan Ask Mr. TPr. SUO untuk buka/tutup layer.

Contoh arahan:

```text
Buka Lot Kadaster
Matikan Lot Kadaster
```

Medan `NAMAPEMILI` dan `ALAMATPEMI` tidak disyorkan untuk diterbitkan dalam
portal awam.


## Ukur & Analisis Spatial v6.3

Panel lama `Analisis pantas` telah dinaik taraf kepada:

```text
Ukur & Analisis
├── Ukur Jarak
├── Ukur Keluasan
├── Analisis Buffer
├── Padam Hasil
├── Lokasi Saya
└── Mod Malam
```

### Ukur Jarak

1. Tekan `Ukur Jarak`.
2. Klik dua atau lebih titik pada peta.
3. Klik dua kali pada titik terakhir.
4. Portal memaparkan jumlah jarak dan bilangan segmen.

### Ukur Keluasan

1. Tekan `Ukur Keluasan`.
2. Klik sekurang-kurangnya tiga titik.
3. Klik dua kali untuk menamatkan poligon.
4. Portal memaparkan keluasan dan perimeter.

### Analisis Buffer

1. Masukkan nilai jarak.
2. Pilih unit meter atau kilometer.
3. Tekan `Klik Titik Pusat Buffer`.
4. Klik lokasi pusat pada peta.
5. Portal menjana poligon buffer geodesik dan memaparkan radius serta keluasan.

### Kaedah

- Jarak menggunakan formula Haversine.
- Buffer menggunakan destinasi geodesik daripada titik pusat.
- Keluasan menggunakan pengiraan planar tempatan berasaskan latitud purata.
- Semua hasil boleh dipadam menggunakan `Padam Hasil`.

Modul baharu:

```text
js/spatial-tools.js
```

Cache busting:

```text
styles.css?v=6.3
js/app.js?v=6.3
```


## Jarak Perjalanan Jalan v6.4

Alat baharu di bawah `Ukur & Analisis`:

```text
Jarak Perjalanan Jalan
├── Jarak Terpendek
├── Masa Terpantas
├── Elak Tol
└── Elak Highway
```

### Cara guna

1. Pilih `Jarak Terpendek` atau `Masa Terpantas`.
2. Aktifkan `Elak Tol` atau `Elak Highway` jika diperlukan.
3. Tekan `Pilih Titik Mula & Destinasi`.
4. Klik titik mula.
5. Klik destinasi.
6. Portal memaparkan laluan jalan, jarak dan anggaran masa.

### Kaedah

- `Jarak Terpendek` menggunakan profil `mapbox/driving`,
  meminta laluan alternatif dan memilih alternatif dengan nilai jarak terendah.
- `Masa Terpantas` menggunakan profil `mapbox/driving-traffic`.
- Parameter `exclude=toll` dan `exclude=motorway` digunakan untuk pilihan
  elak tol dan elak lebuh raya.
- Titik mula dan destinasi dihantar kepada Mapbox Directions API.
- Laluan dikembalikan sebagai GeoJSON penuh dan dipaparkan pada peta.

### Nota

Pilihan `Jarak Terpendek` memilih laluan paling pendek daripada alternatif
yang dikembalikan oleh Directions API. Ia bukan jaminan carian exhaustive
bagi setiap kombinasi jalan yang mungkin.

Cache busting:

```text
styles.css?v=6.4
js/app.js?v=6.4
```


## Network Intelligence v7.7

Panel kiri kekal untuk alat GIS asas:

```text
Ukur & Analisis
├── Ukur Jarak
├── Ukur Keluasan
├── Analisis Buffer
├── Lokasi Saya
└── Padam Hasil
```

Panel kanan kini mempunyai modul:

```text
Network Intelligence
├── Route Intelligence
├── Accessibility Intelligence
├── Facility Intelligence
├── Planning Intelligence
└── Emergency Intelligence
```

### Fungsi aktif

- Jarak terpendek
- Masa terpantas
- Driving
- Walking
- Cycling
- Elak tol
- Elak highway
- Drive-time isochrone
- Walking/cycling isochrone
- Nearest hospital
- Nearest clinic
- Nearest school
- Nearest IPK/IPD
- Polis emergency nearest search
- Clear network results

### API

- Mapbox Directions API
- Mapbox Isochrone API

### Modul baharu

```text
js/network-intelligence.js
```

Cache busting:

```text
styles.css?v=7.7
js/app.js?v=7.7
```


## Right Panel Fix v7.7.1

Susunan panel kanan dikunci kepada:

```text
1. Urban Intelligence
2. Ringkasan PBT, Daerah & DPN2
3. Network Intelligence
4. Flood Intelligence
5. Weather Intelligence
6. Landuse Intelligence
7. Urban Planning AI Assistant
8. Feature Info
```

Pembetulan:

- Network Intelligence tidak lagi muncul paling atas.
- Ringkasan negeri kini mengandungi PBT, daerah, Bandar DPN2 dan layer aktif.
- Card Land Use dipulihkan dan dinamakan `Landuse Intelligence`.
- Semua fungsi Network Intelligence v7.7 dikekalkan.
- Cache-busting dinaik taraf kepada v7.7.1.


## Merge Release v7.7.2

Release ini memulihkan `Executive Landuse Intelligence` tanpa membuang
Network Intelligence, Flood Intelligence, Weather Intelligence,
Ask Mr. TPr. SUO atau Feature Info.

### Executive Landuse Intelligence

- Ringkasan KPI dashboard
- Komposisi guna tanah
- Butang SISMAPS Executive Dashboard
- Butang Applications SUO
- Statistik
- Trend
- Perbandingan
- Forecast
- Status konfigurasi pautan

Pautan luaran dikawal melalui:

```text
config/external-links.json
```

Masukkan URL terus dashboard pada:

```json
"sismapsExecutiveDashboard": "URL_DASHBOARD_SEBENAR"
```

Jika ruang tersebut kosong, butang dashboard akan membuka halaman Applications
SUO sebagai fallback.

### Component Registry

Susunan panel kanan kini dikunci melalui:

```text
js/component-registry.js
```

Susunan rasmi:

```text
1. Urban Intelligence
2. Ringkasan PBT, Daerah dan DPN2
3. Network Intelligence
4. Flood Intelligence
5. Weather Intelligence
6. Executive Landuse Intelligence
7. Urban Planning AI Assistant
8. Feature Info
```

Fail baharu:

```text
js/component-registry.js
js/executive-landuse.js
config/external-links.json
```


## Startup Hotfix v7.7.3

Pembetulan startup:

- Loading screen ditutup melalui `finally` walaupun layer gagal.
- Failsafe 12–15 saat menghalang loading overlay kekal selama-lamanya.
- Executive Landuse, Component Registry, Weather dan Flood dimulakan secara selamat.
- Ralat satu modul tidak lagi menghentikan keseluruhan GeoPortal.
- Notis pemulihan dipaparkan apabila sebahagian layer gagal.
- Semua komponen v7.7.2 dikekalkan.

Cache busting:

```text
styles.css?v=7.7.3
js/app.js?v=7.7.3
```


## Map Bootstrap Fix v7.7.4

- Mapbox GL JS dinaik taraf kepada v3.25.0.
- CDN rasmi digunakan sebagai sumber utama.
- jsDelivr digunakan sebagai fallback.
- app.js hanya dimuatkan selepas Mapbox GL tersedia.
- Ralat startup dipaparkan dalam ruang peta.
- Timeout ditutup selepas style.load.
- map.resize() dijalankan selepas layout stabil.


## v8.0 Enterprise Refactor

Pembetulan utama:

- Duplicate declaration `rightSidebar` dibuang.
- Map creation dipindahkan ke `js/core/map-engine.js`.
- Workspace panel control dipindahkan ke `js/ui/workspace-controller.js`.
- Urban Intelligence initialization dipindahkan ke `js/intelligence/intelligence-hub.js`.
- `app.js` dikurangkan dan berfungsi sebagai orchestration layer.
- Fail architecture manifest ditambah.
- Semua fungsi v7.7.x dikekalkan.
- Mapbox bootstrap fallback dikekalkan.

Tanda versi aktif:

```text
GeoPortal v8.0
Network Intelligence v8.0
```


## v8.0.1 Workspace Hotfix

Punca:

```text
setLeftPanel is not defined
```

Semasa refactor v8.0, kawalan panel dipindahkan ke `WorkspaceController`,
tetapi sebahagian event lama masih memanggil fungsi global `setLeftPanel()`.

Pembetulan:

- Semua panggilan lama diganti dengan `workspaceController.setLeft()`.
- Semua panggilan lama `setRightPanel()` diganti dengan
  `workspaceController.setRight()`.
- Event panel lama yang bertindih dibuang.
- Cache busting dikemas kini kepada v8.0.1.


### Additional startup correction

Ask Mr. TPr. SUO masih menerima shorthand action lama:

```javascript
setLeftPanel,
setRightPanel
```

Ia telah diganti dengan:

```javascript
setLeftPanel: (open) => workspaceController.setLeft(open),
setRightPanel: (open) => workspaceController.setRight(open)
```

Ini menghapuskan ralat `setLeftPanel is not defined` semasa import modul.


## v8.0.2 Executive Landuse Data Fix

Angka demo lama telah dibuang dan diganti dengan data dashboard SISMAPS 2024:

- Keluasan guna tanah: 833,720.73 ha
- Tepu bina: 239,840.56 ha (28.76%)
- Bukan tepu bina: 593,880.17 ha (71.23%)

Pecahan 12 kategori guna tanah turut dimasukkan berdasarkan dashboard yang
dibekalkan.

Data berstruktur disimpan dalam:

```text
data/landuse/landuse_summary_2024.json
```


## v8.0.3 Mr. TPr. SUO Avatar Restore

Avatar rasmi Mr. TPr. SUO dipulihkan menggunakan artwork yang dibekalkan.

Aset:

```text
assets/avatar/mr-tpr-suo.png
```

Perubahan:

- Avatar 58px pada profile card.
- Border emas dan online status indicator.
- Label `Urban Planning AI Assistant`.
- Capability badges: Spatial, Analytics, Forecasting.
- Engine status: `SUO Planner v8`.
- Spatial Data status: `Connected`.
- Setiap bubble jawapan AI kini mempunyai avatar kecil.
- Bubble pengguna kekal tanpa avatar.
- Avatar dioptimumkan kepada 640px untuk prestasi web.
- Semua fungsi v8.0.2 dikekalkan.

## v8.0.4 Public Transport Rail Layer

Layer baharu:
- Pengangkutan Awam > Rangkaian Rel
- 12 laluan unik daripada dataset verified pengguna
- MRT, LRT, KTM, ERL, Monorail dan BRT
- GeoJSON WGS84
- Styling mengikut mode
- Toggle, legend, split-screen refresh dan Toggle Semua disambungkan
- Data: `data/transport/rail_transportation_selangor.geojson`

## v8.0.4B Rail Line Colour Separation

Rangkaian rel kini diwarnakan berdasarkan `line_name`, bukan hanya mode.
Ini membezakan MRT 1/MRT 2 dan setiap LRT/KTM/ERL/BRT/Monorail secara visual.

Konfigurasi warna:
`config/rail-line-colors.json`


## v8.0.4C Rail Symbol Enhancement

Semua rangkaian rel kini menggunakan visual standard:

```text
White solid casing
        +
Coloured dashed centre line
```

Tujuan:
- membezakan rel daripada jalan, sempadan dan layer linear lain;
- memastikan line kekal jelas pada basemap cerah atau gelap;
- warna setiap line masih dikekalkan;
- MRT dedicated layers menggunakan dash pattern yang sama;
- legend diselaraskan dengan simbol sebenar di peta.


## v8.0.5 Final Rail Network

Source of truth:
`Selangor Rail Network.zip` supplied by user after checking/finalization.

Portal data:
- `data/transport/rail_network_final.geojson`
- `data/transport/rail_stations_final.geojson`

Rendering:
- Rail lines: white solid casing + coloured dashed route.
- Stations: white halo + coloured station core by line.
- Labels appear from zoom 11.
- Station popup: station name, code, line, mode, operator and status.
- Separate toggles for rail network and rail stations.

Data normalization:
20 exact duplicate LRT Shah Alam station records in the supplied station
shapefile were removed from the PORTAL RENDERING COPY only to prevent duplicate
symbols/labels. The uploaded source was not changed.


## v8.0.5A Layer Order Fix

Susunan Kandungan Peta dikemas kini supaya:

```text
...
Flood Intelligence Fasa 1
Pengangkutan Awam Rel
  ├── Rangkaian Rel
  └── Stesen Rel
Live Traffic
Lot Kadaster
Pentadbiran
...
```

Tiada perubahan pada data finalized, styling rel, simbol stesen atau popup.


## v8.0.5B Clean Rail Data Sync

Station source is now generated directly from the cleaned finalized dataset:

- Before cleaning: 254 station records
- Exact duplicate LRT Shah Alam records removed: 20
- Clean station source: 234 station records
- No runtime/render deduplication is required for the finalized station dataset.

This prevents duplicate counts in future analytics.

## v8.0.5C — Actual Map Render Order

Mapbox draw stack now explicitly keeps the transport overlays in this order
(bottom to top):

Live Traffic → Rail white casing → coloured dashed rail → MRT overlays →
station halo → station point → station label.

This fixes the mismatch where the left panel showed rail above traffic but the
actual map rendered traffic above rail.

## v8.0.5D — Mapbox Loader Recovery Fix

The previous startup could wait on `api.mapbox.com` for the Mapbox GL JS
library without triggering the fallback quickly enough.

New startup sequence:
1. jsDelivr Mapbox GL JS/CSS
2. 6-second timeout if the primary CDN hangs
3. automatic fallback to unpkg
4. app initialization is guarded so it runs only once

The v8.0.5C map render-order fix remains intact:
Live Traffic < Rail < Rail Stations.
