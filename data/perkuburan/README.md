# Tapak Perkuburan — sumber induk SUO 3D GeoPortal

- **Master Dashboard:** https://github.com/SelangorUrbanObservatory/Tapak-Perkuburan-Negeri-Selangor/blob/main/cemeteries.geojson
- **GeoPortal derived snapshot:** `data/perkuburan/tapak_perkuburan_selangor.geojson`
- **Jumlah:** 220 rekod, 147 Perkuburan Islam dan 73 tapak bukan Islam/kemudahan berkaitan.
- 8 kategori master: Perkuburan Islam (147), Buddha/Tao (23), Hindu (19), Kristian (8), Krematorium/Dewan Pengurusan Mayat (6), Perkuburan Lain (10), Tempat Perkuburan Bersepadu Bukan Islam (3), Kolumbarium (4).
- Keluasan atribut keseluruhan: 1,064.3952 hektar (jumlah nilai sumber, tidak semestinya keluasan unik poligon).
- **Jenis geometri:** titik lokasi, **bukan sempadan perkuburan**. Jangan paparkan keluasan sebagai poligon tanpa geometri rasmi.
- Semua nama, kategori, agama, daerah, PBT, lokasi, alamat, luas dan koordinat mengikuti master dashboard. Sumber tidak membuktikan kapasiti baki, status operasi, keluasan sebenar tapak atau pengesahan setiap koordinat.
- Layer di bawah Kemudahan Masyarakat, OFF secara default, penapis Islam dan Bukan Islam (termasuk kategori kemudahan berkaitan). Popup mengekalkan lapan kategori asal.
- Jika master berubah, kemas kini dataset GeoPortal daripada master dan jalankan audit rekod sekali lagi; jangan sunting secara terasing.
- Selepas penerbitan, uji Mapbox click popup, legend, main global toggle, subkategori, 2D/3D, style reload dan Split Screen.
