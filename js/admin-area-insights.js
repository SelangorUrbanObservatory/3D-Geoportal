import { DATA_URLS } from "./config.js";
import { loadGeoJSON, pointInFeature } from "./spatial-query.js";

const DATASETS = [
  { key: "schools", url: DATA_URLS.schools, label: "Pendidikan" },
  { key: "health", url: DATA_URLS.health, label: "Kesihatan" },
  { key: "police", url: DATA_URLS.police, label: "Keselamatan" }
];
const ADMIN_SOCIO_URL = "data/socioeconomy/district-household-dosm.json";
const M = new Intl.NumberFormat("ms-MY", { maximumFractionDigits: 1 });
const MONEY = new Intl.NumberFormat("ms-MY", { maximumFractionDigits: 0 });
const escapeHTML = v => String(v ?? "").replace(/[&<>"']/g, c =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

let socioPromise = null;
const peerCache = new Map();

export function areaBounds(feature) {
  const b = [Infinity, Infinity, -Infinity, -Infinity];
  const visit = node => {
    if (!Array.isArray(node)) return;
    if (node.length >= 2 && Number.isFinite(node[0]) && Number.isFinite(node[1])) {
      b[0] = Math.min(b[0], node[0]); b[1] = Math.min(b[1], node[1]);
      b[2] = Math.max(b[2], node[0]); b[3] = Math.max(b[3], node[1]);
    } else node.forEach(visit);
  };
  visit(feature?.geometry?.coordinates);
  return b.every(Number.isFinite) ? b : null;
}

export function spatialPoints(records, feature) {
  const bb = areaBounds(feature);
  if (!bb) return [];
  return (records || []).filter(f => {
    const c = f.geometry?.coordinates;
    if (f.geometry?.type !== "Point" || !Array.isArray(c) || !Number.isFinite(c[0]) || !Number.isFinite(c[1])) return false;
    return c[0] >= bb[0] && c[0] <= bb[2] && c[1] >= bb[1] && c[1] <= bb[3] && pointInFeature(c, feature);
  });
}

function areaHa(type, f, pbtReferences) {
  const n = type === "pbt" ? pbtReferences[f.properties?.web_name]?.areaHa : Number(f.properties?.web_area);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function median(values) {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function simpleBar(value, max, fillClass = "") {
  const width = max > 0 ? Math.max(0, Math.min(100, value * 100 / max)) : 0;
  return '<div class="admin-insight-bar"><div class="' + escapeHTML(fillClass) + '" style="width:' + width.toFixed(2) + '%"></div></div>';
}

async function peerMetrics(type, boundaries, references) {
  const key = type;
  if (peerCache.has(key)) return peerCache.get(key);
  const promise = (async () => {
    const all = await Promise.all(DATASETS.map(d => loadGeoJSON(d.key, d.url)));
    const rows = boundaries.map(f => {
      const ha = areaHa(type, f, references);
      const counts = all.map(g => spatialPoints(g.features || [], f).length);
      const total = counts.reduce((a, b) => a + b, 0);
      return { name: f.properties?.web_name, areaHa: ha, counts, total,
        density: ha ? total * 10000 / ha : null,
        categoryDensities: counts.map(n => ha ? n * 10000 / ha : null) };
    });
    return rows;
  })();
  peerCache.set(key, promise);
  try { return await promise; }
  catch (error) { peerCache.delete(key); throw error; }
}

function comparePanel(type, feature, rows) {
  const selected = rows.find(r => r.name === feature.properties?.web_name);
  if (!selected || selected.density === null) return '<p class="admin-insight-missing">Keluasan atau data perbandingan tidak lengkap.</p>';
  const peers = rows.filter(r => r.density !== null);
  const med = median(peers.map(r => r.density));
  const rank = 1 + peers.filter(r => r.density > selected.density).length;
  const countRank = 1 + rows.filter(r => r.total > selected.total).length;
  const maxVal = Math.max(1, ...peers.map(r => r.density));
  const ratio = med > 0 ? selected.density / med : null;
  const lines = [
    '<div class="admin-insight-pair">',
    '<div><span>Rekod kemudahan / 100 km²</span><strong>' + M.format(selected.density) + '</strong><small>Kepadatan rekod, bukan liputan perkhidmatan</small></div>',
    '<div><span>Median ' + (type === "pbt" ? "12 PBT" : "9 daerah") + '</span><strong>' + M.format(med) + '</strong><small>Perbandingan kumpulan yang sama</small></div>',
    '</div>',
    '<div class="admin-insight-compare"><div class="admin-insight-bar-label"><strong>Kawasan dipilih</strong><span>' + M.format(selected.density) + '</span></div>',
    simpleBar(selected.density, maxVal, "selected"),
    '<div class="admin-insight-bar-label"><strong>Median kawasan</strong><span>' + M.format(med) + '</span></div>',
    simpleBar(med, maxVal, "median"), '</div>',
    '<div class="admin-insight-detail">Kedudukan kepadatan: <b>' + rank + ' / ' + peers.length +
       '</b> &nbsp;·&nbsp; Kedudukan jumlah rekod: <b>' + countRank + ' / ' + rows.length + '</b></div>',
    '<p class="admin-insight-interpret">' + (ratio === null ? "Perbandingan median tidak tersedia." :
       ratio > 1.05 ? "Kepadatan rekod lebih tinggi daripada median kumpulan." :
       ratio < .95 ? "Kepadatan rekod lebih rendah daripada median kumpulan." :
       "Kepadatan rekod hampir sama dengan median kumpulan.") +
      ' Ini <b>bukan skor prestasi, kekurangan kemudahan atau tahap akses penduduk</b>.</p>',
    '<div class="admin-insight-subtitle">Kepadatan mengikut jenis (rekod / 100 km²)</div>'
  ];
  for (let i = 0; i < DATASETS.length; i++) {
    const local = selected.categoryDensities[i] || 0;
    const p = median(peers.map(r => r.categoryDensities[i]).filter(v => v !== null)) ?? 0;
    lines.push('<div class="admin-insight-category"><span>' + DATASETS[i].label +
      '</span><strong>' + M.format(local) + '</strong><small>Median ' + M.format(p) + '</small></div>');
  }
  lines.push('<p class="admin-insight-note">Pengiraan menggunakan keluasan rujukan JUPEM 2024 bagi PBT atau atribut sempadan GIS bagi daerah. Titik kemudahan dikira dalam poligon GIS semasa; sumber sempadan dan keluasan mungkin mempunyai vintaj berlainan.</p>');
  return lines.join("");
}

async function urbanPanel(feature) {
  const [cities, stations] = await Promise.allSettled([
    loadGeoJSON("cities", DATA_URLS.cities),
    loadGeoJSON("railStations", DATA_URLS.railStations)
  ]);
  const cityList = cities.status === "fulfilled" ? spatialPoints(cities.value.features, feature) : null;
  const railRecords = stations.status === "fulfilled" ? spatialPoints(stations.value.features, feature) : null;
  const railMap = new Map();
  for (const f of railRecords || []) {
    const name = String(f.properties?.station_name || "").trim();
    if (!name) continue;
    const key = name.toLocaleLowerCase("ms-MY");
    if (!railMap.has(key)) railMap.set(key, { name, modes: new Set() });
    if (f.properties?.mode) railMap.get(key).modes.add(String(f.properties.mode));
  }
  const rail = [...railMap.values()].sort((a,b)=>a.name.localeCompare(b.name,"ms"));
  const byTier = [1,2,3].map(t => cityList?.filter(f => Number(f.properties?.tier) === t).length ?? null);
  // KPI counts are shown once in the four-card profile header.
  // Keep this tab for interpretation, tier distribution, city navigation and station lists.
  const result = ['<div class="admin-insight-subtitle">Hierarki Bandar DPN3</div>'];
  if (cityList) {
    result.push('<div class="admin-insight-tier">');
    const colors = ["tier-one","tier-two","tier-three"];
    for (let t=1;t<=3;t++) result.push('<span class="' + colors[t-1] + '">Tier ' + t + ' <b>' + byTier[t-1] + '</b></span>');
    result.push('</div><div class="admin-insight-subtitle">Bandar dalam kawasan</div>');
    if (cityList.length) {
      result.push('<div class="admin-insight-city-list">');
      for (const f of cityList) {
        const name = f.properties.nama_bandar;
        result.push('<button type="button" data-admin-city="' + escapeHTML(name) + '" title="Fokus bandar pada peta">' +
          '<span>' + escapeHTML(name) + '</span><small>' + escapeHTML(f.properties.hierarki) + '</small></button>');
      }
      result.push('</div>');
    } else result.push('<p class="admin-insight-missing">Tiada titik bandar DPN3 direkodkan dalam sempadan GIS kawasan ini.</p>');
  } else result.push('<p class="admin-insight-missing">Data DPN3 tidak dapat dimuatkan.</p>');
  result.push('<div class="admin-insight-subtitle">Stesen pengangkutan rel</div>');
  if (!railRecords) result.push('<p class="admin-insight-missing">Data stesen rel tidak dapat dimuatkan.</p>');
  else if (!rail.length) result.push('<p class="admin-insight-missing">Tiada titik stesen rel direkodkan dalam kawasan ini.</p>');
  else {
    result.push('<div class="admin-insight-rail-list">');
    for (const s of rail.slice(0,10)) result.push('<div><span>' + escapeHTML(s.name) + '</span><small>' + escapeHTML([...s.modes].join(" / ")) + '</small></div>');
    result.push('</div>');
    if (rail.length>10) result.push('<p class="admin-insight-note">+' + (rail.length-10) + ' stesen lain dalam kawasan.</p>');
  }
  result.push('<p class="admin-insight-note">Bandar DPN3 ialah titik rujukan GeoPortal, bukan sempadan bandar. Stesen rel digabung mengikut nama dalam kawasan (rekod persimpangan/pertukaran laluan boleh diduplikasi dalam dataset). Bilangan stesen bukan ukuran capaian pengangkutan awam.</p>');
  return {
    html: result.join(""),
    points: cityList || [],
    cityCount: cityList ? cityList.length : null,
    railCount: railRecords ? rail.length : null
  };
}

function percentageChange(curr,prev) { return prev > 0 ? ((curr-prev)/prev)*100 : null; }
async function socioPanel(feature) {
  if (!socioPromise) {
    socioPromise = fetch(ADMIN_SOCIO_URL).then(r => {
      if (!r.ok) throw new Error("Data sosioekonomi tidak tersedia.");
      return r.json();
    }).catch(error => { socioPromise=null; throw error; });
  }
  const data = await socioPromise;
  const district = data.districts?.[feature.properties?.web_name];
  if (!district?.["2024"]) return '<p class="admin-insight-missing">Tiada statistik DOSM untuk daerah ini.</p>';
  const now = district["2024"], past = district["2022"];
  const trend = past ? percentageChange(now.income_median,past.income_median) : null;
  const pp = past ? now.poverty_absolute - past.poverty_absolute : null;
  return [
    '<div class="admin-insight-pair">',
    '<div><span>Pendapatan median isi rumah</span><strong>RM' + MONEY.format(now.income_median) + '</strong><small>Bulanan · DOSM 2024</small></div>',
    '<div><span>Pendapatan purata isi rumah</span><strong>RM' + MONEY.format(now.income_mean) + '</strong><small>Bulanan · DOSM 2024</small></div>',
    '</div>',
    '<div class="admin-insight-pair">',
    '<div><span>Kemiskinan mutlak</span><strong>' + M.format(now.poverty_absolute) + '%</strong><small>Isi rumah · DOSM 2024</small></div>',
    '<div><span>Kemiskinan relatif</span><strong>' + M.format(now.poverty_relative) + '%</strong><small>Isi rumah · DOSM 2024</small></div>',
    '</div>',
    '<div class="admin-insight-trend">',
    '<div><span>Perubahan median 2022–2024</span><strong>' + (trend === null ? '—' : (trend>0?'+':'')+M.format(trend)+'%') + '</strong></div>',
    '<div><span>Perubahan kemiskinan mutlak</span><strong>' + (pp===null?'—':(pp>0?'+':'')+M.format(pp)+' mata peratus') + '</strong></div>',
    '</div>',
    '<p class="admin-insight-note">Indikator ini hanya tersedia dan sah untuk <b>peringkat daerah</b>, bukan PBT. Sumber: data rasmi DOSM/OpenDOSM melalui Dashboard Demografi &amp; Sosioekonomi SUO (2022/2024).</p>',
    '<a class="admin-insight-link" href="https://selangorurbanobservatory.github.io/Dashboard-Demografi-Sosioekonomi-Negeri-Selangor/" target="_blank" rel="noopener noreferrer">Lihat Dashboard Demografi &amp; Sosioekonomi</a>'
  ].join("");
}

export async function generateAreaInsights({ type, feature, boundaries, pbtReferences } = {}) {
  const tasks = [
    peerMetrics(type,boundaries,pbtReferences).then(rows => comparePanel(type,feature,rows))
      .catch(err => { console.warn("P2 comparison:",err); return '<p class="admin-insight-missing">Perbandingan tidak dapat dikira kerana data tidak lengkap.</p>'; }),
    urbanPanel(feature).catch(err => {
      console.warn("P2 urban:",err); return {
        html: '<p class="admin-insight-missing">Maklumat bandar dan rel tidak tersedia.</p>',
        points: [], cityCount: null, railCount: null
      };
    })
  ];
  if(type === "district") tasks.push(socioPanel(feature).catch(err => {
    console.warn("P2 socioeconomic:",err); return '<p class="admin-insight-missing">Indikator sosioekonomi tidak dapat dimuatkan.</p>';
  }));
  const [benchmark,urban,socio] = await Promise.all(tasks);
  return {
    benchmark,
    urban: urban.html,
    cityPoints: urban.points,
    cityCount: urban.cityCount,
    railCount: urban.railCount,
    socioeconomic: socio ?? null
  };
}
