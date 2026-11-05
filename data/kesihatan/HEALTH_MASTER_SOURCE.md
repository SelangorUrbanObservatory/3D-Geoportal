# SUO — Master Data Kemudahan Kesihatan (penyelarasan Dashboard → GeoPortal)
Tarikh semakan: 5 November 2026

## Keputusan sumber induk
**CSV Dashboard Kemudahan Kesihatan Negeri Selangor** ialah sumber induk bagi kemudahan kesihatan dalam GeoPortal. Fail GeoPortal `data/kesihatan/kemudahan_kesihatan_selangor.geojson` ialah salinan terbitan berstruktur yang diselaraskan daripada master tersebut, BUKAN sumber data kedua yang disunting secara berasingan.

- Master: https://github.com/geospatialpms-glitch/Kemudahan-Kesihatan-Negeri-Selangor/blob/main/data/fasiliti_kesihatan.csv
- Fail terbitan GeoPortal: `data/kesihatan/kemudahan_kesihatan_selangor.geojson`
- **250 rekod** (Hospital 54, Klinik Kesihatan 87, Klinik Ibu dan Anak 4, Klinik Desa 105)
- `FAC_ID` mengikuti CSV Dashboard. Jangan andaikan ID GeoPortal lama sama; ia telah diganti.
- Format koordinat GeoJSON: [LONGITUDE, LATITUDE], WGS84.
- Atribut web untuk keserasian modul sedia ada: `web_name`, `web_category`, `web_district`, `web_operator`, `web_sector`, `web_locality`, `web_status`.
- `LUAS_HEKTAR` kosong disimpan `null` (bukan sifar).
- Penanda kualiti: `PERLU_PENGESAHAN_SUMBER`. Menggunakan dashboard sebagai master tidak semestinya bermaksud koordinat/status operasi telah disahkan KKM.

## Audit QC statik penyelarasan
- 250 rekod CSV → 250 Feature Point GeoJSON
- 250 FAC_ID unik; 250 nama tidak kosong; 250 koordinat berangka
- Kategori mengikut CSV; tiada penapisan automatik
- Dua rekod `Klinik Desa Sungai Burung` (ID 193 dan 194) mempunyai daerah/lokasi berbeza. **Jangan buang** tanpa pengesahan identiti.
- `Klinik Desa Sungai Buaya` dan `Klinik Kesihatan Sungai Buaya` mempunyai koordinat sama. Boleh jadi berkongsi premis atau isu geokod — perlu pengesahan.
- Sebarang perbezaan baharu antara Dashboard dan GeoPortal mesti diselesaikan di sumber induk dan diselaraskan semula, bukan diubah ad hoc pada GeoPortal.

## Kesan kepada aplikasi
- Layer Mapbox 3D dan Smart Search menggunakan atribut `web_*` yang dikekalkan.
- Legend di `index.html` dikemas kini kepada 250 / 54 / 87 / 4 / 105.
- Planning Coverage dan Nearest Facility kini mengakses set rekod yang lebih besar apabila fail baharu diterbitkan.
- Ujian sebenar perlu memastikan kesemua kategori, master toggle, Smart Search, popup, pemuatan map dan Split Screen tidak terjejas.
- Untuk analisis kebolehcapaian berimpak tinggi, semak koordinat dan status sebenar kemudahan terlebih dahulu.

## Kriteria kelulusan
1. Pastikan dashboard CSV masih 250 rekod apabila diterbitkan.
2. Paparan peta normal dengan 250 simbol/rekod; tiada kehilangan map.
3. Legend dan subkategori cocok.
4. Smart Search dan popup gunakan rekod dikemas kini.
5. Data mudah dijejak kepada master dashboard.
