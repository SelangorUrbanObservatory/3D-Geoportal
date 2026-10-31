import {getStations,featuresFor,stationById} from "./tod-core.js";
const qs=new URLSearchParams(location.search);
if(qs.get("tod")==="1"){
  (async()=>{
    try {
      const stations=await getStations("data/transport/rail_stations_final.geojson");
      let map=window.__SUO_MAIN_MAP__;
      for(let attempt=0;attempt<50&&!map;attempt++){
        await new Promise(resolve=>setTimeout(resolve,200));
        map=window.__SUO_MAIN_MAP__;
      }
      if(!map||!stations.length)return;
      const ctl=document.createElement("section");ctl.id="suoTodMapControl";
      ctl.style.cssText="position:absolute;right:16px;bottom:95px;z-index:11;background:#fffefb;color:#242424;padding:12px;border:1px solid #dedede;border-radius:12px;box-shadow:0 4px 20px #0002;width:min(275px,calc(100% - 34px));font:12px system-ui";
      ctl.innerHTML='<strong>Transit Accessibility · Fasa 1</strong><p style="margin:4px 0 8px">Zon jarak lurus, bukan laluan berjalan kaki.</p><label>Stesen <select id="suoTodStation" style="width:100%;margin:4px 0 10px"></select></label><div style="display:flex;gap:12px"><label><input id="suoTod400" type="checkbox" checked> 400 m</label><label><input id="suoTod800" type="checkbox" checked> 800 m</label></div><button id="suoTodClose" type="button" style="margin-top:10px">Tutup TOD</button>';
      map.getContainer().appendChild(ctl);
      const select=ctl.querySelector("#suoTodStation"),c400=ctl.querySelector("#suoTod400"),c800=ctl.querySelector("#suoTod800");
      for(const s of stations){const opt=document.createElement("option");opt.value=s.id;opt.textContent=s.name+" · "+s.line;select.appendChild(opt);}
      const first=stationById(stations,qs.get("station"));select.value=first.id;
      const id="suo-tod-catchment",layerFill="suo-tod-fill",layerLine="suo-tod-outline";
      function install(){
        if(!map.getSource(id))map.addSource(id,{type:"geojson",data:featuresFor(first,true,true)});
        if(!map.getLayer(layerFill))map.addLayer({id:layerFill,type:"fill",source:id,paint:{"fill-color":["match",["get","radius_m"],400,"#24aa69","#278bd2"],"fill-opacity":0.16}});
        if(!map.getLayer(layerLine))map.addLayer({id:layerLine,type:"line",source:id,paint:{"line-color":["match",["get","radius_m"],400,"#14965a","#0877b7"],"line-width":2}});
        render();
      }
      function render(){
        if(!map.getSource(id))return;
        const station=stationById(stations,select.value);
        map.getSource(id).setData(featuresFor(station,c400.checked,c800.checked));
      }
      select.addEventListener("change",()=>{render();const s=stationById(stations,select.value);map.flyTo({center:s.coordinates,zoom:13.7,bearing:0});});
      c400.addEventListener("change",render);c800.addEventListener("change",render);
      ctl.querySelector("#suoTodClose").addEventListener("click",()=>{ctl.remove();if(map.getLayer(layerLine))map.removeLayer(layerLine);if(map.getLayer(layerFill))map.removeLayer(layerFill);if(map.getSource(id))map.removeSource(id);});
      map.on("style.load",()=>{if(ctl.isConnected)install();});
      if(map.isStyleLoaded())install();else map.once("load",install);
      map.flyTo({center:first.coordinates,zoom:13.7,bearing:0});
    }catch(err){console.warn("SUO TOD preview unavailable",err);}
  })();
}
