# P3 — Planning Intelligence Fasa 1 (30 Oktober 2026)

## Objektif
Aktifkan fungsi Planning Intelligence yang sebelumnya hanya menyampaikan status; gunakan enjin Mapbox Isochrone sedia ada untuk mengukur kawasan capaian perjalanan dan mengira lokasi kemudahan yang terdapat di dalam poligon rangkaian jalan.

## Modul yang berfungsi
1. **Service Area:** Pilih masa 5/10/15/20/30 minit dan mod memandu, berjalan kaki atau berbasikal; klik pusat pada peta. Satu poligon capaian dihasilkan oleh Mapbox Isochrone API. Polygon berwarna keemasan berbeza daripada paparan Network asal.
2. **Coverage Analysis:** Pilih jenis kemudahan (semua, pendidikan, kesihatan, keselamatan), tempoh dan mod perjalanan. Klik pusat pada peta. Spatial join `pointInFeature` mengira bilangan rekod kemudahan sebenar dalam poligon. Hasil memaparkan jumlah, jumlah dataset peringkat negeri, dan pecahan kategori; titik dalam poligon dipaparkan sehingga 80 penanda **setiap** kategori untuk menjaga prestasi (kiraan sebenar tidak dihadkan).
3. **Gap Analysis dan Accessibility Score:** Butang menjelaskan prasyarat dan had Fasa 2. Tiada peratus penduduk diliputi, indeks akses penduduk, skor kecukupan atau tuntutan jurang perkhidmatan direka-reka.

## Dataset
- `data/pendidikan/sekolah_suo_gabungan.geojson` — 1,212 rekod
- `data/kesihatan/kemudahan_kesihatan_selangor.geojson` — 87 rekod
- `data/keselamatan/kemudahan_keselamatan_dashboard_184.geojson` — 184 rekod
- Poligon perjalanan: Mapbox Isochrone API, bukan peta buffer bulat atau kajian rangkaian jalan dalaman SUO.

## Had tafsiran dan kesahihan
- Kiraan titik di dalam isochrone dari **satu titik pusat** ialah taburan rekod, **bukan** liputan penduduk, waktu perjalanan khusus dari setiap kemudahan, piawaian perkhidmatan, atau kelengkapan kemudahan.
- Ketepatan keputusan bergantung pada jaringan jalan Mapbox, mod perjalanan, vintaj data lokasi dan penggunaan Mapbox Isochrone API.
- Poligon isochrone boleh melintasi sempadan Selangor; rekod kemudahan yang digunakan kekal dataset Selangor. Denominator seluruh negeri tidak boleh ditafsir sebagai peratus liputan penduduk.
- Sebarang kegagalan memuat dataset dikemukakan sebagai **gagal**, bukannya sifar atau keputusan separa.
- Data GIS tidak diubah, dan paparan P1 DPN3, P2 Profil Kawasan, Compare, Weather, Flood, Landuse dan AI dikekalkan.

## Ujian pembangunan
- Static JavaScript syntax: `js/network-intelligence.js` dan `js/planning-coverage.js` lulus.
- Ujian logik dengan poligon MBSA: 103 pendidikan + 12 kesihatan + 21 keselamatan = **136** rekod dalam poligon, sejajar dengan P2.
- Mock Mapbox Isochrone API: mod Service Area, Coverage dan Drive-Time asal berjaya tanpa mempengaruhi paparan lain.
- Semakan browser live desktop/iPhone, had kuota API dan status deployment GitHub Pages masih perlu disahkan selepas merge.

## Langkah P3 Fasa 2
Data taburan penduduk / grid permintaan dan standard capaian mengikut jenis kemudahan diperlukan sebelum menjalankan Gap Analysis dan Accessibility Score yang benar-benar boleh dipertahankan.

## Penambahbaikan UX Visual v1.2 (30 Oktober 2026)
- Kawalan **Kelegapan kawasan** 12–65% mengubah `fill-opacity` pada contour P3 tanpa menjalankan semula analisis atau menukar bilangan rekod.
- Checkbox **Papar titik kemudahan** hanya menyorok simbol kemudahan, bukan titik pusat, poligon atau pengiraan spatial. Keadaan kawalan digunakan semula apabila gaya Mapbox dimuat semula.
- **Fokus Kawasan** zoom semula kepada poligon hasil terakhir; **Padam Hasil** mengosongkan peta dan panel keputusan.
- Klik titik berwarna pada peta untuk popup nama kemudahan, kumpulan dan kategori. Popup menerangkan had tafsiran dan data yang diperoleh daripada atribut sedia ada; kawalan klik kawasan PBT/daerah di bawah tidak dibuka serentak.
- Kiraan Coverage dipersembahkan dalam kad jenis kemudahan dan senarai kategori utama (*details* boleh dikembangkan). Bar komposisi hanya untuk pilihan semua kategori dan **bukan kadar liputan penduduk**.
- Penanda visual dihadkan kepada 80 bagi setiap kumpulan, dipilih secara tersebar daripada turutan rekod. Kiraan **tidak** disampel.
- Kemudahan P3 yang tidak tersedia disampaikan melalui ralat data sedia ada, bukan sifar atau andaian.
- Pengesahan statik dan simulasi JavaScript dilakukan; ujian interaksi visual pada GitHub Pages desktop/iPhone masih diperlukan.
