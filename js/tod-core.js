// SUO TOD Phase 1: geodesic catchments, no walking-network claim.
export const STATIONS_URL = "data/transport/rail_stations_final.geojson";
export function circle([lng,lat], radiusMetres, steps=72) {
  const R=6371008.8, d=radiusMetres/R, lat1=lat*Math.PI/180, lon1=lng*Math.PI/180;
  const ring=[];
  for(let i=0;i<=steps;i++){
    const bearing=2*Math.PI*i/steps;
    const lat2=Math.asin(Math.sin(lat1)*Math.cos(d)+Math.cos(lat1)*Math.sin(d)*Math.cos(bearing));
    const lon2=lon1+Math.atan2(Math.sin(bearing)*Math.sin(d)*Math.cos(lat1),Math.cos(d)-Math.sin(lat1)*Math.sin(lat2));
    ring.push([((lon2*180/Math.PI+540)%360)-180,lat2*180/Math.PI]);
  }
  return {type:"Feature",properties:{radius_m:radiusMetres},geometry:{type:"Polygon",coordinates:[ring]}};
}
export async function getStations(url=STATIONS_URL){
  const response=await fetch(url,{cache:"no-store"});
  if(!response.ok)throw new Error("Dataset stesen gagal dimuatkan ("+response.status+")");
  const data=await response.json();
  return (data.features||[]).filter(f=>f.geometry?.type==="Point"&&Array.isArray(f.geometry.coordinates)&&f.geometry.coordinates.length>=2)
    .map((f,i)=>({id:i,name:String(f.properties?.station_name||"Stesen "+(i+1)),line:String(f.properties?.line_name||""),mode:String(f.properties?.mode||""),status:String(f.properties?.status||""),coordinates:f.geometry.coordinates.slice(0,2)}));
}
export function featuresFor(station,r400,r800){
  if(!station)return {type:"FeatureCollection",features:[]};
  const f=[];
  // Render larger ring first, smaller one on top.
  if(r800)f.push(circle(station.coordinates,800));
  if(r400)f.push(circle(station.coordinates,400));
  return {type:"FeatureCollection",features:f};
}
export function stationById(stations,id){return stations.find(s=>String(s.id)===String(id))||stations[0]||null;}
