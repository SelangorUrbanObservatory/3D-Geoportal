# Kemudahan Keagamaan (Islam) Negeri Selangor — SUO GeoPortal

## Master Dataset
- Dashboard/repo: `geospatialpms-glitch/Kemudahan-Keagamaan-Islam-Negeri-Selangor`
- Master: `data.json` dalam repo Dashboard
- URL: https://github.com/geospatialpms-glitch/Kemudahan-Keagamaan-Islam-Negeri-Selangor/blob/main/data.json
- Snapshot GeoPortal: `data/keagamaan/tapak_keagamaan_islam_master.json`
- Derived point layer: `data/keagamaan/kemudahan_keagamaan_islam_selangor.geojson`
- Sumber asal menurut README dashboard: Shapefile Kemudahan Keagamaan (Islam) Negeri Selangor terkini yang dibekalkan kepada pembangun Dashboard.

## Skop dan audit
- 1,587 tapak: **476 Masjid** dan **1,111 Surau**.
- 9 daerah / 12 PBT; jumlah luas atribut sekitar **592.59 hektar**.
- ID: 1,587 unik; koordinat: 1,587 berangka; geometri: 1,587 Polygon/MultiPolygon.
- Titik GeoPortal ialah **titik wakil** tapak. Poligon tapak asal disimpan dan dilukis **hanya apabila titik dipilih**.
- Status operasi dan pengesahan rasmi mutakhir tapak **tidak tersedia** dalam dataset; jangan mereka atau infer.
- **Data Islam sahaja**, bukan inventori penuh kemudahan keagamaan seluruh agama. Sekolah Agama dikategorikan di bawah Pendidikan, bukan lapisan ini.

## Pemaparan
- Layer Management → Kemudahan Masyarakat → Keagamaan Islam (default OFF untuk mengelak penanda terlalu padat).
- Dua subkategori: Masjid (hijau) / Surau (jingga).
- Popup memaparkan nama, kategori, daerah, PBT, luas (hektar) dan sumber.
- Poligon terpilih diserlahkan, tidak menggunakan buffer hipotetikal.
- Layer didaftarkan dalam Split Screen Compare sebagai toggle tersendiri.

## Kawalan kualiti dan penerbitan
- Bila master Dashboard berubah, sync semula **kedua-dua** snapshot master dan derived GeoJSON supaya ID dan nama sepadan.
- Semak isu duplikasi/keluasan/nama dengan pembekal sumber sebelum digunakan sebagai pengesahan statutory atau analisis keperluan.
- Perlu uji secara interaktif pada Mapbox, toggles global/individu, Split Screen dan reload style selepas deploy.
