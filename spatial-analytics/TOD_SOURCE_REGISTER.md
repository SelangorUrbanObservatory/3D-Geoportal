# Inventori sumber & data Transit-Oriented Development (TOD) — Selangor
Tarikh inventori: 31 Oktober 2026 | Status: bahan penyelidikan / pra-pengesahan | Branch ujian, bukan produksi.

## Prinsip pemisahan hierarki
- Hierarki bandar DPN3 bukan tipologi TOD dan tidak boleh disamakan berdasarkan label Tier.
- Tipologi TOD koridor MRT SSP daripada kajian PLANMalaysia: T1 Wilayah, T2 Bandar, T3 Sub-Bandar, T4 Aktiviti Khas. Tipologi kajian, bukan pengkelasan automatik semua stesen.
- Buffer jarak lurus 400/800 m dalam Fasa 1 ialah visualisasi tadahan, bukan zon perundangan yang telah ditetapkan, bukan rangkaian berjalan kaki.
- RSN Selangor 2035 (Pengubahan) menyebut Zon Teras, Zon Utama, Zon Sekunder; radius dan pelaksanaan mesti dirujuk pada dokumen berkuat kuasa/garis panduan negeri sebelum disamakan dengan buffer 400/800 m.

## Sumber rasmi / primer (URL, kegunaan, status)
| Sumber | URL | Kegunaan / status |
|---|---|---|
| Dasar TOD Negeri Selangor 2016 — pengesahan dasar | https://dewan.selangor.gov.my/question/transit-oriented-development-tod/ | Disahkan: kelulusan MMKN 24 Feb 2016; carian dokumen dasar penuh diperlukan |
| Pemakaian dasar TOD negeri | https://dewan.selangor.gov.my/question/transport-oriented-development/ | Disahkan: berkuat kuasa 2 Mac 2016; sembilan prinsip |
| RSN Selangor 2035 (Pengubahan) | https://www.jpbdselangor.gov.my/index.php/en/perkhidmatan/dokumen-rancangan/negeri | Diwartakan 19 Mac 2026; semak dokumen lengkap & warta sebelum pindahkan syarat |
| Ringkasan Eksekutif RSN Selangor 2035 | https://www.selangor.gov.my/sabakbernam/resources/RSN%202035/BM_RE_RSN_Selangor_2035_%28Pengubahan%29.pdf | MP4 TOD, P1–P5 |
| GPP028 PLANMalaysia TOD 2018 | https://www.planmalaysia.gov.my/planmalaysia/modules_resources/database_stores/17/46_24.pdf | Panduan perancangan nasional; tidak mengatasi RT/RKK |
| Pelan Induk Perancangan Bersepadu Guna Tanah Laluan MRT SSP | https://myplan.planmalaysia.gov.my/portal-main/publication-details?id=15 | Bab 2 tipologi, Bab 4 guna tanah, Bab 6 reka bentuk, Bab 7 GIS |
| Bab 2 Tipologi TOD MRT SSP | https://myplan.planmalaysia.gov.my/admin/uploads_publication/pdf_20240612103840_3.pdf | T1–T4; pengelasan khusus koridor |
| Cadangan kepadatan TOD mengikut tipologi & radius | https://myplan.planmalaysia.gov.my/admin/uploads_publication/pdf_20240612103858_5.pdf | Angka kajian, BUKAN automatik standard negeri/PBT |
| RTPJ 1 Pengubahan 4 | https://www.mbpj.gov.my/sites/default/files/peta_cadangan_rtpj_1_pengubahan_4.pdf | Petikan dasar TOD Selangor, 9 prinsip |
| RKK Kwasa Damansara (draf) | https://www.mbpj.gov.my/sites/default/files/rkk_kwasa_damansara-28_ogos_2017.pdf | Rujukan 400 m TOD dan 800 m TAD khusus konteks dokumen; periksa status kuat kuasa |
| GTFS Static API rasmi | https://developer.data.gov.my/realtime-api/gtfs-static.en | KTMB & Prasarana rapid-rail-kl, bas perantara MRT; CC BY 4.0; semak versi dan tarikh |

## Dataset SUO sedia ada
- `data/transport/rail_stations_final.geojson`: 234 rekod titik (LRT 94, MRT 65, KTM Komuter 51, Monorel 11, BRT 7, ERL 6). Atribut station_name, line_name, mode, station_code, status, source. Semua dilabel active dalam fail, **tidak bermakna perkhidmatan 2026 telah disahkan**.
- `data/transport/rail_network_final.geojson`: jajaran rel; perlu semak geometri/saiz data dan tarikh.
- Sempadan 12 PBT, 9 daerah: untuk spatial join selepas validasi.
- Rangkaian jalan/pejalan kaki: BELUM disahkan tersedia bagi seluruh Selangor.
- Guna tanah, lot kadaster, zon RT/RKK, kepadatan penduduk, tapak pembangunan, ridership: belum lengkap/semak akses.

## Skema master TOD untuk penyediaan klasifikasi
`station_id, station_name, line_name, mode, operator, station_status, station_status_checked_at, lon, lat, pbt_code, district_code, tod_typology, typology_source, typology_document_year, typology_page, typology_status, statutory_zone_type, statutory_zone_source, buffer_400m, buffer_800m, walk_400m, walk_800m, transfer_lines, feeder_bus, ridership, landuse_mix, population_density, plot_ratio, planning_status, verified_by, verified_at, source_url, notes`

Enumerasi `typology_status`: `official_verified`, `study_proposed`, `candidate_unverified`, `not_assessed`. Default `not_assessed`, `tod_typology=null`. Jangan klasifikasikan mengikut mod rel sahaja.

## Pengumpulan susulan yang diperlukan
1. Dapatkan naskhah dasar TOD Negeri Selangor 2016 penuh (UPEN/JPBD Selangor), termasuk perubahan terkini.
2. Ekstrak senarai stesen yang benar-benar diklasifikasi T1–T4 dalam kajian MRT SSP serta helaian peta/atribut dan halaman.
3. Semak RT/RKK semua PBT yang ada transit: TOD yang telah dikenal pasti, status cadangan/pewartaan dan zon kawalan.
4. Muat turun GTFS Prasarana/KTMB dan buat padanan nama/ID/koordinat serta status perkhidmatan.
5. Dapatkan data stesen masuk/keluar, laluan pejalan kaki, penghadang fizikal, land use, penduduk, nisbah plot, densiti, perumahan mampu milik, kemudahan, ridership.
6. QC titik pertukaran, stesen di luar Selangor, duplikasi multi-line, status LRT3. Bandingkan rekod dengan GTFS bertarikh.
7. Hanya selepas pengesahan, hasilkan polygon tadahan mengikut sempadan PBT dan hierarki TOD (jangan double-count overlap).

## Nota pengurusan
Ini ialah katalog rujukan dan rangka kerja pengumpulan data — bukan arkib salinan PDF penuh atau semakan undang-undang. Sumber PDF dikekalkan sebagai URL dokumen rasmi. Jangan merge/terbitkan sebagai klasifikasi rasmi tanpa validasi.
