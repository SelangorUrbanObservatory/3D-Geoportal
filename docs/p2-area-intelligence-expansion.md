# P2 — PBT & District Intelligence | Pengembangan Dimensi (28 Oktober 2026)

## Objektif
Mengembangkan Fasa 1 daripada statistik keluasan dan inventori kemudahan kepada analitik pelbagai dimensi, tanpa mengada-adakan indikator yang belum tersedia.

## Tab selepas memilih PBT / daerah
1. **Kemudahan** — statistik spatial Fasa 1, kekal: sekolah, kemudahan kesihatan, keselamatan beserta jenis.
2. **Perbandingan** — kepadatan rekod kemudahan per 100 km², median kumpulan setara (12 PBT atau 9 daerah), kedudukan kepadatan dan jumlah rekod, serta kepadatan setiap kategori. **Bukan skor prestasi/aksesibiliti**; belum diselaraskan dengan penduduk.
3. **Bandar & Rel** — bilangan dan nama bandar DPN3 yang titik fokusnya terletak dalam kawasan, pecahan Tier 1–3, klik nama untuk fokus peta; bilangan stesen rel unik berdasarkan nama dan senarai stesen di dalam poligon GIS. Bilangan stesen bukan ukuran liputan pengangkutan awam.
4. **Sosioekonomi** (daerah sahaja) — pendapatan isi rumah median dan purata bulanan, kemiskinan mutlak dan relatif daripada DOSM 2024; perubahan median dan kemiskinan mutlak berbanding 2022. **Tidak ditampilkan sebagai statistik PBT**, kerana sumber hanya agregasi daerah.

## Sumber data
- `data/pentadbiran/sempadan_pbt_selangor_2024.geojson`
- `data/pentadbiran/sempadan_daerah_selangor.geojson`
- `data/hierarki_bandar_selangor_dpn3.geojson` — 33 titik rujukan DPN3
- `data/transport/rail_stations_final.geojson` — 234 station-line records, nama stesen dinyahgandakan dalam kawasan terpilih
- `data/pendidikan/sekolah_suo_gabungan.geojson`
- `data/kesihatan/kemudahan_kesihatan_selangor.geojson`
- `data/keselamatan/kemudahan_keselamatan_dashboard_184.geojson`
- `data/socioeconomy/district-household-dosm.json` — set dokumen DOSM (2019, 2022, 2024) disalin secara utuh daripada dua fail CSV di repository SUO Dashboard Demografi & Sosioekonomi Selangor, dengan metadata asal.

## Pengiraan dan sekatan tafsiran
- Statistik titik dikira daripada point-in-polygon terhadap sempadan GIS, bukan berdasarkan atribut daerah/PBT pada rekod titik.
- Kepadatan = jumlah titik dalam poligon × 10,000 / keluasan hektar. Bagi PBT, keluasan rujukan JUPEM 2024; bagi daerah, atribut keluasan poligon GIS semasa.
- Kedudukan dibandingkan **hanya** dalam jenis kawasan yang sama. Median tidak ditafsir sebagai piawaian nasional atau tahap perkhidmatan.
- Cache perbandingan dibina atas permintaan untuk mengelakkan pengiraan berulang antara 12 PBT atau 9 daerah.
- Data yang gagal dimuatkan dilabel sebagai tidak tersedia; sistem tidak menggantikannya dengan sifar.
- Paparan tambahan berbentuk tab untuk mengelakkan panel kanan menjadi terlalu panjang pada desktop/iPhone.
- Peta utama dan modul P1, Compare, Flood, Weather, AI tidak ditukar.

## Pemeriksaan pembangunan
- Sintaks JS baharu dan modul integrasi telah diuji.
- Simulasi sebenar dataset PBT: MBSA 45.1 rekod kemudahan / 100 km² berbanding median 20.9 bagi 12 PBT; satu titik bandar DPN3 (Shah Alam) dan 10 nama stesen rel unik direkodkan mengikut kaedah di atas.
- Simulasi daerah Petaling: pendapatan median DOSM 2024 = RM10,688; tab sosioekonomi hanya dipaparkan pada kategori daerah.
- **Belum disahkan dalam pelayar live desktop/iPhone** pada ketika commit dibangunkan.

## Prioriti sumber untuk fasa susulan
1. Data penduduk terkini mengikut daerah/PBT yang boleh dipertahankan untuk kepadatan penduduk dan nisbah kemudahan per kapita.
2. Lapisan guna tanah bergeometri dan atribut kategori sah untuk statistik pembangunan serta zon aktiviti.
3. Network accessibility (drive-time / service-area) untuk bukti capaian, bukan sekadar jumlah/kepadatan titik.
4. Data perumahan, industri, hazard banjir rasmi, ekonomi PBT dan indikator perancangan yang diperakui. Jangan cipta angka apabila belum tersedia.
