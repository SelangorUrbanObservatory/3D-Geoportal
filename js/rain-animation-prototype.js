/*
 * SUO Weather Rain Animation — opt-in prototype.
 * Open-Meteo current precipitation is MODELLED, not observed radar rainfall.
 * Keeps all existing map sources/layers untouched.
 */
(() => {
  const stations = [
    ["Shah Alam",3.0738,101.532],["Petaling Jaya",3.1073,101.6444],
    ["Klang",3.0449,101.4496],["Rawang",3.3213,101.5767],
    ["Kuala Selangor",3.3377,101.2524],["Kajang",2.9935,101.7909],
    ["Banting",2.8136,101.5037],["Sepang",2.6931,101.7495],
    ["Sabak Bernam",3.7697,100.9879],["Ampang",3.1491,101.7632],
    ["Hulu Selangor",3.5652,101.656],["Semenyih",2.948,101.845]
  ];
  let map, canvas, ctx, enabled=false, raf=0, points=[], frame=0, inflight=false;
  let lastUpdated="Belum dimuatkan";
  const reduced=window.matchMedia("(prefers-reduced-motion: reduce)");
  const element=document.createElement("div");
  element.id="suoRainAnimationControl";
  element.style.cssText="position:absolute;right:12px;bottom:110px;z-index:6;background:rgba(255,255,255,.97);color:#333;border:1px solid #ddd;border-radius:10px;padding:9px 11px;max-width:205px;box-shadow:0 2px 14px #0002;font:12px/1.4 system-ui,sans-serif;";
  element.innerHTML='<label style="display:flex;align-items:center;gap:7px;font-weight:700;cursor:pointer"><input type="checkbox" id="suoRainToggle"> 🌧 Animasi hujan</label><div id="suoRainStatus" role="status" aria-live="polite" style="margin-top:5px;color:#626262">Anggaran model cuaca · OFF</div><div style="margin-top:3px;color:#737373;font-size:10px">Bukan radar hujan masa nyata</div>';
  const status=()=>element.querySelector("#suoRainStatus");
  const toggle=()=>element.querySelector("#suoRainToggle");
  function projectRain(){
    if(!ctx||!canvas||!map)return;
    const bounds=map.getContainer().getBoundingClientRect();
    if(canvas.width!==Math.round(bounds.width*devicePixelRatio)||canvas.height!==Math.round(bounds.height*devicePixelRatio)){
      canvas.width=Math.round(bounds.width*devicePixelRatio);
      canvas.height=Math.round(bounds.height*devicePixelRatio);
      canvas.style.width=bounds.width+"px"; canvas.style.height=bounds.height+"px";
    }
    ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);
    ctx.clearRect(0,0,bounds.width,bounds.height);
    if(!enabled)return;
    const reducedMotion=reduced.matches;
    for(const s of points){
      if(s.rain<=0.05)continue;
      const p=map.project([s.lon,s.lat]);
      if(!Number.isFinite(p.x)||!Number.isFinite(p.y))continue;
      const intensity=Math.min(1,s.rain/5);
      const radius=Math.max(24,Math.min(105,38+map.getZoom()*3.7));
      const count=reducedMotion?10:Math.round(18+intensity*90);
      ctx.save();ctx.beginPath();ctx.arc(p.x,p.y,radius,0,Math.PI*2);ctx.clip();
      for(let i=0;i<count;i++){
        const seed=i*61.37+s.lat*91.7;
        const xx=p.x-radius+((seed*19.31)%1+1)%1*radius*2;
        const yFraction=((seed*0.339+(reducedMotion?0:frame*.009*(.65+intensity)))%1+1)%1;
        const yy=p.y-radius+yFraction*radius*2;
        ctx.beginPath();ctx.strokeStyle="rgba(45,151,226,"+(.24+intensity*.36)+")";
        ctx.lineWidth=1+intensity*.6;ctx.moveTo(xx,yy);ctx.lineTo(xx-3,yy+(reducedMotion?3:7+intensity*7));ctx.stroke();
      }
      ctx.restore();
      ctx.fillStyle="#136ba1";ctx.font="600 11px system-ui";ctx.textAlign="center";
      ctx.fillText(s.name+" · "+s.rain.toFixed(1)+" mm",p.x,p.y-radius-7);
    }
  }
  function tick(){if(!enabled)return;frame++;projectRain();raf=requestAnimationFrame(tick);}
  async function refresh(){
    if(inflight||!enabled)return;inflight=true;status().textContent="Mengambil bacaan hujan terkini…";
    try {
      const url=new URL("https://api.open-meteo.com/v1/forecast");
      url.searchParams.set("latitude",stations.map(s=>s[1]).join(","));
      url.searchParams.set("longitude",stations.map(s=>s[2]).join(","));
      url.searchParams.set("current","precipitation");
      url.searchParams.set("timezone","Asia/Kuala_Lumpur");
      const res=await fetch(url,{signal:AbortSignal.timeout(12000)});
      if(!res.ok)throw new Error("HTTP "+res.status);
      const data=await res.json();
      const arr=Array.isArray(data)?data:[data];
      points=stations.map((s,i)=>({name:s[0],lat:s[1],lon:s[2],rain:Math.max(0,Number(arr[i]?.current?.precipitation)||0)}));
      const wet=points.filter(x=>x.rain>.05).length;
      lastUpdated=arr[0]?.current?.time||"masa tidak tersedia";
      status().textContent=wet+" / "+stations.length+" titik hujan · "+lastUpdated;
      projectRain();
    }catch(e){points=[];projectRain();status().textContent="Data hujan tidak tersedia · animasi dihentikan";console.warn("SUO rain animation",e);}
    finally{inflight=false;}
  }
  function start(){
    if(enabled)return;enabled=true;refresh();tick();
  }
  function stop(){
    enabled=false;cancelAnimationFrame(raf);if(ctx&&canvas){ctx.clearRect(0,0,canvas.width,canvas.height);}
    status().textContent="Anggaran model cuaca · OFF";
  }
  function init(){
    map=window.__SUO_MAIN_MAP__;
    if(!map||typeof map.project!=="function")return false;
    const root=map.getContainer();if(!root)return false;
    root.style.position="relative";
    canvas=document.createElement("canvas");
    canvas.id="suoRainAnimationCanvas";
    canvas.setAttribute("aria-hidden","true");
    canvas.style.cssText="position:absolute;inset:0;z-index:4;pointer-events:none";
    root.appendChild(canvas);ctx=canvas.getContext("2d");root.appendChild(element);
    toggle().addEventListener("change",e=>e.target.checked?start():stop());
    map.on("move",()=>{if(enabled)projectRain();});
    map.on("resize",()=>{if(enabled)projectRain();});
    document.addEventListener("visibilitychange",()=>{cancelAnimationFrame(raf);if(enabled&&!document.hidden)tick();});
    setInterval(()=>{if(enabled)refresh();},15*60*1000);
    return true;
  }
  let tries=0;
  const attempt=setInterval(()=>{if(init()||++tries>60)clearInterval(attempt);},500);
})();
