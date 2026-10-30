# SUO 3D GeoPortal — Lot Kadaster MBSA 2023 sebagai Layer Induk

**30 Oktober 2026 · Fasa Pilot MBSA**  
**Status:** kod layer utama dan konfigurasi disediakan; sumber sebenar masih dalam storan terkawal, belum disiarkan ke GitHub Pages atau servis tile live.

## Mengapa satu sumber berpusat
Modul `js/cadastral.js` mengurus sumber Mapbox `cadastral-source` dan layer `cadastral-fill`, `cadastral-line`, `cadastral-label`. Ketiga-tiga produk berikut mengakses modul yang sama:
- **GeoPortal utama** — Layer Management → Lot Kadaster MBSA 2023 → papar dan klik lot.
- **Compare Engine** — layer kadaster pada peta kiri/kanan apabila kebenaran dan sumber tile tersedia.
- **Planning Intelligence** — gunakan `lastPlanningPolygon` untuk servis PostGIS yang mengira jumlah lot sebenar; *bukan* kiraan daripada tile yang kelihatan.

Apabila poligon guna tanah sah kemudian diimport, sumber baharu akan mengguna semula komponen analitik PostGIS dan peta melalui `Planning Intelligence`, tanpa menyalin rekod lot ke dalam setiap modul.

## Audit pilot
- Sumber: `NDCDB_MBSA2023.zip` (Shapefile rasmi; asal EPSG:3380/GDM2000 Selangor Cassini).
- Staging terkawal: `MBSA_2023_P3_RESTRICTED.gpkg`, 150,559 lot unik selepas gabung 68 UPI berganda; bukan luas pentadbiran MBSA.
- Geometri sah selepas QA; tiada atribut pemilik dalam staging; UPI untuk *dedupe* dan SQL sahaja. Maklumat lesen JUPEM dan hak penerbitan **masih memerlukan pengesahan**.
- Koordinat WGS84 yang mengandungi liputan pilot dianggarkan daripada bounding box staging: 101.427–101.592 E, 2.950–3.230 N. Bukan sempadan rasmi MBSA.
- Label 1,350,128 lot Selangor dalam UI lama dikeluarkan kerana belum ada sumber penuh Selangor aktif.

## Langkah untuk menghidupkan layer utama dengan data sebenar
1. **Kawal data** — letak GeoPackage di storan SUO yang dibenarkan. Jangan push ke GitHub Pages atau fail statik portal. Sahkan sama ada penerbitan geometri cadastral/tile dibenarkan oleh agensi pembekal, dan siapa yang boleh mengakses.
2. **Import** — di server dalaman, jalankan perintah `ogr2ogr` serta QA dan indeks GiST dalam `scripts/p3_mbsa_cadastre_postgis.sql` (atau `scripts/p3_mbsa_cadastre_postgis.sql` jika tersedia). Jadual sasaran `suo_cadastre.mbsa_parcels_2023`, geometri EPSG:4326, UPI unik. Sasaran QA = 150,559 rekod.
3. **Terbitkan Vector Tile terkawal** — jalankan `scripts/mbsa_2023_restricted_vector_tile.sql` di PostGIS. Function `suo_tiles.mbsa_parcels_2023(z,x,y)` menjana MVT dengan nama source-layer `mbsa_parcels_2023`. **Tidak mengandungi UPI, nama/alamat pemilik atau nombor hak milik**. Berikan EXECUTE hanya kepada role tileserver yang dibenarkan; gunakan HTTPS reverse proxy, autentikasi dan kawalan CORS, bukan endpoint awam tanpa kawalan.
4. **Konfigurasi GeoPortal** — setelah tile endpoint diverifikasi menggunakan akaun yang dibenarkan, edit `config/cadastral-layer.json`:
   - `enabled: true`
   - `sourceType: "vectorTiles"`
   - `tiles: ["https://<DOMAIN_SUO_TERKAWAL>/tiles/suo_tiles.mbsa_parcels_2023/{z}/{x}/{y}.pbf"]` (contoh struktur sahaja; **bukan URL sebenar**)
   - `sourceLayer: "mbsa_parcels_2023"`
   - `minzoom: 12` dengan fields `lot_number,district_code,mukim_code,section_code,area_geom_m2,source_year`
   - Semak bahawa tile berjaya dimuat (status 200 dengan akaun sah, 401/403 tanpa kebenaran), Mapbox popup tidak memaparkan maklumat pemilik, serta gaya 2D/3D, satelit dan Compare Engine konsisten.
5. **Analisis PostGIS P3** — import tidak automatik menghasilkan fungsi analisis. Sediakan backend `/api/v1/planning/spatial-summary` untuk membaca parcel server-side dengan `ST_Intersects` / `ST_Intersection` / `ST_Area` dan hitung UPI unik, lot separa dan ha. Selepas ujian validasi, hidupkan `config/planning-spatial-integration.json`. Jangan gunakan `queryRenderedFeatures()` untuk jumlah lot kerana tile boleh terpotong dan hanya merangkumi peta yang dimuatkan.
6. **Guna tanah 2024** — jadual geometri berasingan diperlukan. Jangan gantikan dengan `KOD_KEGUNA` lot, kerana banyak rekod kosong dan itu bukan zoning yang disahkan. Apabila tersedia, overlay PostGIS menghitung kawasan mengikut kategori dan melaporkan provenance/tahun 2024.

## Keselamatan dan had
- **GitHub repo awam hanya menyimpan konfigurasi dan skrip**. Tiada ZIP/GPKG/UPI/lot geometry diterbitkan.
- Semakan `enabled: true` hanya menunjukkan endpoint telah ditetapkan, **bukan jaminan geometri tersedia kepada semua pengguna**. Authorization adalah tanggungjawab pelayan. Portal GitHub Pages awam tidak menyediakan fungsi server PostGIS atau gate akses tile.
- Jika perlukan kawalan peranan, penyelesaian paling kemas ialah host versi SUO dalaman di bawah domain yang sama dengan API/tiles, atau reverse proxy berautentikasi. Jangan simpan token rahsia dalam frontend.
- Bilangan 150,559 ialah hasil QA staging, **bukan bilangan lot yang sedang dipaparkan pada portal live**.

## Rujukan
- pg_tileserv standard MVT/function: https://github.com/CrunchyData/pg_tileserv
- PostGIS vector tile functions: https://postgis.net/docs/ST_AsMVT.html
- QGIS dan ArcGIS Pro digunakan untuk semakan perbandingan geometri/UPI.
