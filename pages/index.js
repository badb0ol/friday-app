// â”€â”€â”€ FRIDAY v4 Â· Iron Man Interface â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
import Head from 'next/head'
import { useState, useEffect, useRef, useCallback } from 'react'

const C = {
  bg:'oklch(0.155 0.008 60)', surface:'oklch(0.19 0.008 60)',
  card:'oklch(0.22 0.010 60)', card2:'oklch(0.25 0.012 60)',
  primary:'oklch(0.80 0.13 75)',   // amber accent
  gold:'oklch(0.80 0.13 75)',
  success:'oklch(0.72 0.07 165)',  // sage
  danger:'oklch(0.62 0.18 25)',
  purple:'oklch(0.72 0.10 295)',
  teal:'oklch(0.72 0.07 165)',
  secondary:'oklch(0.75 0.12 50)',
  text:'oklch(0.95 0.018 80)', muted:'oklch(0.70 0.012 70)',
  dim:'oklch(0.50 0.012 70)',
  border:'oklch(0.30 0.010 65 / 0.9)', glow:'oklch(0.80 0.13 75 / 0.15)',
}
const SERIF = '"Instrument Serif","Cormorant Garamond",Georgia,serif'
const SANS  = '"Inter Tight","Inter",-apple-system,system-ui,sans-serif'
const MONO  = '"IBM Plex Mono","JetBrains Mono",ui-monospace,monospace'
const catColor = c => ({ cycling:C.primary, health:C.success, productivity:C.gold, finance:C.secondary, learning:C.purple, custom:C.muted }[c] || C.muted)

const NAV = [
  { id:'orb',       icon:'â—Ž', tip:'Home'       },
  { id:'cycling',   icon:'â—ˆ', tip:'Cycling'    },
  { id:'training',  icon:'â¬¡', tip:'Training'   },
  { id:'body',      icon:'ðŸ«€', tip:'Body'       },
  { id:'goals',     icon:'âŠ•', tip:'Goals'      },
  { id:'projects',  icon:'â—§', tip:'Projects'   },
  { id:'finance',   icon:'â—ˆ', tip:'Finance'    },
  { id:'calendar',  icon:'â—·', tip:'Calendar'   },
  { id:'learning',  icon:'â—‰', tip:'Learning'   },
  { id:'memory',    icon:'â—', tip:'Memory'     },
  { id:'strava',    icon:'â—¬', tip:'Strava'     },
]

const tod = () => { const h = new Date().getHours(); return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening' }
const today = () => new Date().toISOString().split('T')[0]
const fmt = d => new Date(d).toLocaleDateString('en-GB', { day:'numeric', month:'short' })
const pct = (c,t,inv=false) => inv ? Math.min(100,Math.max(0,Math.round(((2*t-c)/t)*100))) : Math.min(100,Math.max(0,Math.round((c/t)*100)))
const daysAgo = d => Math.floor((new Date()-new Date(d))/86400000)
const weeklyKm = r => r.filter(x => daysAgo(x.date) < 7).reduce((s,x) => s+Number(x.km), 0)
const prevWeekKm = r => r.filter(x => { const d = daysAgo(x.date); return d>=7&&d<14 }).reduce((s,x) => s+Number(x.km), 0)
const avgSpd = (r,n=8) => { const s=r.slice(0,n); return s.length ? +(s.reduce((a,x)=>a+Number(x.avgSpeed),0)/s.length).toFixed(1) : 0 }
const getStreak = r => {
  if (!r.length) return 0
  const sorted = [...r].sort((a,b)=>new Date(b.date)-new Date(a.date))
  let st=0, ch=new Date(); ch.setHours(0,0,0,0)
  for (const x of sorted) {
    const rd=new Date(x.date); rd.setHours(0,0,0,0)
    const d=Math.round((ch-rd)/86400000)
    if (d===0||d===1){st++;ch=rd}else break
  }
  return st
}
const haversine = (p1,p2) => {
  const R=6371,dLat=(p2.lat-p1.lat)*Math.PI/180,dLon=(p2.lon-p1.lon)*Math.PI/180
  const a=Math.sin(dLat/2)**2+Math.cos(p1.lat*Math.PI/180)*Math.cos(p2.lat*Math.PI/180)*Math.sin(dLon/2)**2
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a))
}
const rideTSS = r => Number(r.km)*Math.pow(Number(r.avgSpeed)/22,1.2)
const computeLoad = rides => {
  const daily={}
  rides.forEach(r=>{daily[r.date]=(daily[r.date]||0)+rideTSS(r)})
  const ctlD=Math.exp(-1/42),atlD=Math.exp(-1/7)
  let ctl=0,atl=0
  for (let i=89;i>=0;i--){
    const d=new Date();d.setDate(d.getDate()-i)
    const k=d.toISOString().split('T')[0]
    const tss=daily[k]||0
    ctl=ctl*ctlD+tss*(1-ctlD); atl=atl*atlD+tss*(1-atlD)
  }
  const tsb=ctl-atl
  const status=tsb>15?{l:'Peak Form',c:C.success}:tsb>5?{l:'Primed',c:C.primary}:tsb>-5?{l:'Neutral',c:C.gold}:tsb>-20?{l:'Building',c:C.secondary}:{l:'Fatigued',c:C.danger}
  return {ctl:+ctl.toFixed(1),atl:+atl.toFixed(1),tsb:+tsb.toFixed(1),status}
}
const parseGPX = text => {
  const doc=new DOMParser().parseFromString(text,'application/xml')
  const pts=doc.querySelectorAll('trkpt')
  if(!pts.length)return null
  const points=Array.from(pts).map(p=>({lat:parseFloat(p.getAttribute('lat')),lon:parseFloat(p.getAttribute('lon')),ele:parseFloat(p.querySelector('ele')?.textContent||'0'),time:p.querySelector('time')?.textContent||''}))
  let dist=0,elev=0
  for(let i=1;i<points.length;i++){dist+=haversine(points[i-1],points[i]);const dE=points[i].ele-points[i-1].ele;if(dE>0)elev+=dE}
  let dur=0
  if(points[0].time&&points[points.length-1].time)dur=Math.round((new Date(points[points.length-1].time)-new Date(points[0].time))/60000)
  return{points,distance:+dist.toFixed(2),elevGain:Math.round(elev),durationMin:dur,avgSpeed:dur>0?+((dist/(dur/60))).toFixed(1):0}
}
const loadMem = () => { try{return JSON.parse(localStorage.getItem('fri_memory')||'{}')}catch{return{}} }
const saveMem = u => { const m={...loadMem(),...u,ts:Date.now()}; localStorage.setItem('fri_memory',JSON.stringify(m)); return m }

// â”€â”€â”€ TOOLS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const TOOLS = [
  {name:'log_ride',description:'Log a cycling ride. Call immediately when sir mentions completing one.',input_schema:{type:'object',required:['km'],properties:{date:{type:'string'},km:{type:'number'},avg_speed:{type:'number'},duration:{type:'string'},notes:{type:'string'}}}},
  {name:'manage_goal',description:'Create, update or auto-progress goals.',input_schema:{type:'object',required:['action'],properties:{action:{type:'string',enum:['create','update_current','update_target','delete']},goal_id:{type:'number'},title:{type:'string'},category:{type:'string',enum:['cycling','health','productivity','finance','learning','custom']},current:{type:'number'},target:{type:'number'},unit:{type:'string'},icon:{type:'string'},inverted:{type:'boolean'}}}},
  {name:'manage_project',description:'Add or update a project.',input_schema:{type:'object',required:['action','name'],properties:{action:{type:'string',enum:['create','update_status']},name:{type:'string'},description:{type:'string'},status:{type:'string',enum:['idea','active','paused','done']},tech:{type:'string'},priority:{type:'string',enum:['low','medium','high']},github_url:{type:'string'},live_url:{type:'string'}}}},
  {name:'log_transaction',description:'Log a financial transaction.',input_schema:{type:'object',required:['description','amount','type'],properties:{description:{type:'string'},amount:{type:'number'},type:{type:'string',enum:['income','expense']},category:{type:'string'},date:{type:'string'}}}},
  {name:'update_learning',description:'Add or update a learning topic.',input_schema:{type:'object',required:['action','topic'],properties:{action:{type:'string',enum:['add','update_progress']},topic:{type:'string'},progress:{type:'number'},notes:{type:'string'}}}},
  {name:'log_body_metric',description:'Log weight (kg), sleep (hours), or HRV (ms).',input_schema:{type:'object',required:['type','value'],properties:{type:{type:'string',enum:['weight','sleep','hrv']},value:{type:'number'},date:{type:'string'},notes:{type:'string'}}}},
  {name:'create_training_plan',description:'Create a 7-day training plan. Use get_analytics first.',input_schema:{type:'object',required:['plan'],properties:{plan:{type:'array',items:{type:'object',properties:{day_name:{type:'string'},type:{type:'string',enum:['rest','easy','medium','hard','long','intervals']},km:{type:'number'},description:{type:'string'}}}},rationale:{type:'string'}}}},
  {name:'remember',description:'Save an important fact about sir to long-term memory. Use proactively.',input_schema:{type:'object',required:['fact','category'],properties:{fact:{type:'string'},category:{type:'string',enum:['preference','goal','personal','pattern','achievement']}}}},
  {name:'get_analytics',description:'Compute trends and analytics. Use before giving performance advice.',input_schema:{type:'object',required:['metric'],properties:{metric:{type:'string',enum:['cycling','goals','finance','body','training_load','all']}}}},
]

const toolLabel = (n,i) => ({
  log_ride:`ðŸ“ ${i.km}km logged${i.avg_speed?` @ ${i.avg_speed}kph`:''}`,
  manage_goal:i.action==='create'?`ðŸŽ¯ Goal: ${i.title}`:`âœï¸ Goal updated`,
  manage_project:`ðŸš€ ${i.name}`,
  log_transaction:`ðŸ’¶ ${i.type==='income'?'+':'-'}â‚¬${i.amount} Â· ${i.description}`,
  update_learning:`ðŸ“š ${i.topic}`,
  log_body_metric:`${i.type==='weight'?'âš–ï¸':i.type==='sleep'?'ðŸ˜´':'ðŸ’“'} ${i.type}: ${i.value}`,
  create_training_plan:`ðŸ“… Training plan created`,
  remember:`ðŸ§  "${i.fact}"`,
  get_analytics:`ðŸ“Š Analysing ${i.metric}...`,
}[n]||`ðŸ”§ ${n}`)

// â”€â”€â”€ MINIMAL UI ATOMS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const Hdg = ({children,color=C.primary,mb=14}) => (
  <div style={{fontFamily:MONO,fontSize:10,letterSpacing:'0.18em',color,textTransform:'uppercase',marginBottom:mb,opacity:0.8}}>{children}</div>
)
const Prog = ({value,color=C.primary,h=4}) => (
  <div className="progress-track" style={{height:h}}>
    <div className="progress-fill" style={{width:`${value}%`,background:`linear-gradient(90deg,${color}77,${color})`}}/>
  </div>
)
const Badge = ({label,color=C.primary}) => (
  <span style={{fontSize:9,padding:'2px 6px',borderRadius:3,border:`1px solid ${color}44`,background:`${color}0f`,color,letterSpacing:1,fontFamily:MONO}}>{label}</span>
)
const Inp = ({value,onChange,placeholder,type='text',style={}}) => (
  <input type={type} value={value} onChange={onChange} placeholder={placeholder}
    style={{background:C.card2,border:`1px solid ${C.border}`,borderRadius:6,padding:'8px 12px',color:C.text,width:'100%',fontSize:14,outline:'none',...style}}
    onFocus={e=>e.target.style.borderColor=C.primary} onBlur={e=>e.target.style.borderColor=C.border}/>
)
const Sel = ({value,onChange,options}) => (
  <select value={value} onChange={onChange} style={{background:C.card2,border:`1px solid ${C.border}`,borderRadius:6,padding:'8px 12px',color:C.text,width:'100%',fontSize:14,outline:'none'}}>
    {options.map(o=><option key={o.value||o} value={o.value||o}>{o.label||o}</option>)}
  </select>
)
const Btn = ({children,onClick,color=C.primary,outline=false,small=false,style={}}) => (
  <button onClick={onClick} style={{padding:small?'5px 12px':'8px 18px',borderRadius:6,fontSize:small?11:13,fontWeight:600,border:`1px solid ${color}`,background:outline?'transparent':`${color}18`,color,cursor:'pointer',letterSpacing:1,transition:'all 0.2s',...style}}
    onMouseEnter={e=>{e.currentTarget.style.background=`${color}30`;e.currentTarget.style.boxShadow=`0 0 12px ${color}40`}}
    onMouseLeave={e=>{e.currentTarget.style.background=outline?'transparent':`${color}18`;e.currentTarget.style.boxShadow='none'}}>
    {children}
  </button>
)
const Row = ({children,mb=10}) => <div style={{marginBottom:mb}}>{children}</div>
const Label = ({children}) => <div style={{fontFamily:MONO+',monospace',fontSize:9,letterSpacing:'0.22em',textTransform:'uppercase',color:C.dim,marginBottom:4,letterSpacing:1}}>{children.toUpperCase()}</div>

// â”€â”€â”€ GPX MAP â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function GPXMap({points}) {
  const ref=useRef(null); const inst=useRef(null)
  useEffect(()=>{
    if(!points||points.length<2||typeof window==='undefined')return
    const init=()=>{
      if(inst.current){inst.current.remove();inst.current=null}
      const L=window.L
      const map=L.map(ref.current,{zoomControl:false})
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',{attribution:'Â© OSM'}).addTo(map)
      const lls=points.map(p=>[p.lat,p.lon])
      const poly=L.polyline(lls,{color:C.primary,weight:3,opacity:0.9}).addTo(map)
      map.fitBounds(poly.getBounds(),{padding:[20,20]})
      L.circleMarker(lls[0],{radius:6,color:C.success,fillColor:C.success,fillOpacity:1}).addTo(map)
      L.circleMarker(lls[lls.length-1],{radius:6,color:C.danger,fillColor:C.danger,fillOpacity:1}).addTo(map)
      inst.current=map
    }
    if(!document.querySelector('#lf-css')){const l=document.createElement('link');l.id='lf-css';l.rel='stylesheet';l.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';document.head.appendChild(l)}
    if(window.L)init();else{const s=document.createElement('script');s.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';s.onload=init;document.head.appendChild(s)}
    return()=>{if(inst.current){inst.current.remove();inst.current=null}}
  },[points])
  return <div ref={ref} style={{height:220,borderRadius:8,overflow:'hidden',border:`1px solid ${C.border}`}}/>
}

// â”€â”€â”€ FRIDAY ORB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// NavIcon component
function NavIcon({id, size=18}) {
  const p = {fill:"none",stroke:"currentColor",strokeWidth:1.5,strokeLinecap:"round",strokeLinejoin:"round"}
  const icons = {
    orb:      <><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3"/></>,
    cycling:  <><circle cx="5.5" cy="17" r="3.5"/><circle cx="18.5" cy="17" r="3.5"/><path d="M5.5 17 9 9h5l4 8"/><circle cx="12" cy="6" r="1"/></>,
    training: <><path d="M4 20V14M9 20V10M14 20V6M19 20v-9M3 20h18"/></>,
    body:     <><circle cx="12" cy="6" r="2.5"/><path d="M7 21v-5l2-4h6l2 4v5M9 12V9M15 12V9"/></>,
    goals:    <><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/></>,
    projects: <><rect x="3.5" y="3.5" width="7" height="7" rx="1"/><rect x="13.5" y="3.5" width="7" height="7" rx="1"/><rect x="3.5" y="13.5" width="7" height="7" rx="1"/><rect x="13.5" y="13.5" width="7" height="7" rx="1"/></>,
    finance:  <><circle cx="12" cy="12" r="8.5"/><path d="M12 7v10M15 9.5c-.5-1-1.5-1.5-3-1.5s-3 .75-3 2 1.25 1.75 3 2 3 .75 3 2-1.5 2-3 2-2.5-.5-3-1.5"/></>,
    calendar: <><rect x="3.5" y="5" width="17" height="15.5" rx="1.5"/><path d="M3.5 9.5h17M8 3.5v3.5M16 3.5v3.5"/></>,
    learning: <><path d="M3.5 5.5h7c1 0 1.5.5 1.5 1.5v13c0-1-.5-1.5-1.5-1.5h-7ZM20.5 5.5h-7c-1 0-1.5.5-1.5 1.5v13c0-1 .5-1.5 1.5-1.5h7Z"/></>,
    memory:   <><circle cx="7" cy="8" r="2"/><circle cx="17" cy="8" r="2"/><circle cx="12" cy="16" r="2"/><path d="M8.5 9 11 14.5M15.5 9 13 14.5M9 8h6"/></>,
    strava:   <><path d="m6 13 4-8 4 8h-3M11 13l3 6 3-6h-2"/></>,
    mic:      <><rect x="9" y="3.5" width="6" height="11" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/></>,
    export:   <><path d="M12 3v12M7 10l5 5 5-5M20 21H4"/></>,
    import:   <><path d="M12 21V9M7 14l5-5 5 5M20 3H4"/></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" {...p} style={{display:"block",flexShrink:0}}>{icons[id]||null}</svg>
}

function FridayOrb({isSpeaking, isLoading, isListening, orbSize=320}) {
  const accent = C.primary, accent2 = C.success
  return (
    <div style={{position:"relative",width:orbSize,height:orbSize}}>
      <svg viewBox="0 0 500 500" width={orbSize} height={orbSize} style={{display:"block"}}>
        <defs>
          <radialGradient id="vp-glow" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor={accent} stopOpacity="0.35"/><stop offset="40%" stopColor={accent2} stopOpacity="0.12"/><stop offset="100%" stopColor={accent} stopOpacity="0"/></radialGradient>
          <linearGradient id="vp-rim" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor={accent}/><stop offset="100%" stopColor={accent2}/></linearGradient>
          <linearGradient id="vp-rim2" x1="1" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={accent2} stopOpacity="0.85"/><stop offset="100%" stopColor={accent} stopOpacity="0.45"/></linearGradient>
          <radialGradient id="vp-core" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="oklch(0.97 0.04 80)" stopOpacity="0.95"/><stop offset="35%" stopColor={accent} stopOpacity="0.7"/><stop offset="100%" stopColor={accent2} stopOpacity="0"/></radialGradient>
        </defs>
        <circle cx="250" cy="250" r="240" fill="url(#vp-glow)"/>
        <g style={{animation:`vp-rotate ${isLoading?"8s":"40s"} linear infinite`,transformOrigin:"250px 250px"}}>
          <ellipse cx="250" cy="250" rx="195" ry="195" fill="none" stroke="url(#vp-rim)" strokeWidth="0.8" opacity="0.55"/>
        </g>
        <g style={{animation:"vp-rotate 80s linear infinite reverse",transformOrigin:"250px 250px"}}>
          {[150,110,60,0,-60,-110,-150].map((dy,i)=>{const ry=160*Math.sqrt(Math.max(0,1-Math.pow(dy/160,2)));return <ellipse key={i} cx="250" cy={250+dy*0.55} rx="160" ry={ry*0.18} fill="none" stroke="url(#vp-rim)" strokeOpacity={dy===0?0.65:0.32} strokeWidth={dy===0?1:0.6}/>})}
        </g>
        <g style={{animation:"vp-rotate 32s linear infinite",transformOrigin:"250px 250px"}}>
          {[0,30,60,90,120,150].map((deg,i)=>(<ellipse key={i} cx="250" cy="250" rx={160*Math.abs(Math.cos(deg*Math.PI/180))} ry="160" fill="none" stroke="url(#vp-rim2)" strokeOpacity={deg===0||deg===90?0.5:0.22} strokeWidth="0.55"/>))}
        </g>
        <g style={{animation:`vp-rotate ${isListening?"6s":isSpeaking?"8s":"18s"} linear infinite`,transformOrigin:"250px 250px"}}>
          {[0,60,120,180,240,300].map((deg,i)=>{const a=deg*Math.PI/180;return <circle key={i} cx={250+Math.cos(a)*195} cy={250+Math.sin(a)*195*0.55} r={i===0?3.5:1.8} fill={i%2?accent2:accent} opacity="0.85"/>})}
        </g>
        <circle cx="250" cy="250" r="38" fill="url(#vp-core)" style={{animation:"vp-pulse 4s ease-in-out infinite",transformOrigin:"250px 250px"}}/>
        <path d="M 220 215 A 38 38 0 0 1 280 235" stroke="oklch(0.96 0.06 80)" strokeOpacity="0.75" strokeWidth="1.4" fill="none"/>
      </svg>
    </div>
  )
}


// â”€â”€â”€ DATA BADGE (floats around orb) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function OrbCaption({label, value, style={}}) {
  return (
    <div style={{position:"absolute",maxWidth:160,pointerEvents:"none",...style}}>
      <div style={{fontFamily:MONO,fontSize:10,color:C.dim,letterSpacing:"0.16em",textTransform:"uppercase",marginBottom:6}}>{label}</div>
      <div style={{fontFamily:SERIF,fontSize:24,color:C.text,fontWeight:400,lineHeight:1,letterSpacing:"-0.01em"}}>{value}</div>
    </div>
  )
}


// â”€â”€â”€ PANEL WRAPPER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function Panel({children, title, eyebrow, onClose}) {
  return (
    <div className="panel-in" style={{width:490,minWidth:490,height:"100%",background:C.surface,borderLeft:`1px solid ${C.border}`,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <div style={{padding:"32px 36px 22px",position:"relative",flexShrink:0}}>
        <button onClick={onClose} style={{position:"absolute",top:22,right:22,background:"transparent",border:0,cursor:"pointer",color:C.muted,padding:4,lineHeight:1,display:"flex"}} onMouseEnter={e=>e.currentTarget.style.color=C.text} onMouseLeave={e=>e.currentTarget.style.color=C.muted}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="m6 6 12 12M18 6 6 18"/></svg>
        </button>
        {eyebrow&&<div style={{fontFamily:MONO,fontSize:10,color:C.success,letterSpacing:"0.22em",textTransform:"uppercase",marginBottom:12}}>{eyebrow}</div>}
        <div style={{fontFamily:SERIF,fontSize:36,color:C.text,lineHeight:1,letterSpacing:"-0.015em"}}>{title}</div>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"4px 36px 32px"}}>{children}</div>
    </div>
  )
}


// â”€â”€â”€ CYCLING PANEL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function CyclingPanel({rides, setRides}) {
  const [adding,setAdding]=useState(false)
  const [form,setForm]=useState({date:today(),km:'',avgSpeed:'',duration:'',notes:''})
  const [gpxData,setGpxData]=useState(null)
  const gpxRef=useRef(null)

  const wk=weeklyKm(rides),pk=prevWeekKm(rides)
  const streak=getStreak(rides)
  const best=rides.length?Math.max(...rides.map(r=>Number(r.km))):0
  const trendStr=pk>0?`${wk>pk?'â†‘':'â†“'}${Math.abs(wk-pk)} km`:'First week'
  const last8=rides.slice(0,8).reverse()

  const addRide=()=>{if(!form.km)return;setRides(p=>[{id:Date.now(),...form,km:Number(form.km),avgSpeed:Number(form.avgSpeed||22)},...p]);setForm({date:today(),km:'',avgSpeed:'',duration:'',notes:''});setAdding(false)}
  const handleGPX=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>{const d=parseGPX(ev.target.result);setGpxData(d?{...d,name:f.name}:null)};r.readAsText(f)}
  const logGPX=()=>{if(!gpxData)return;const h=Math.floor(gpxData.durationMin/60),m=gpxData.durationMin%60;setRides(p=>[{id:Date.now(),date:today(),km:gpxData.distance,avgSpeed:gpxData.avgSpeed||22,duration:`${h>0?h+'h':''}${m}m`,notes:`GPX Â· +${gpxData.elevGain}m`},...p]);setGpxData(null)}

  return (
    <div className="fade-in">
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
        {[{l:'This Week',v:wk,u:'km',sub:trendStr,c:C.primary},{l:'Streak',v:streak,u:'days',sub:streak>=3?'ðŸ”¥':'Ride today',c:streak>=3?C.success:C.gold},{l:'Best Ride',v:best,u:'km',c:C.secondary},{l:'Avg Speed',v:avgSpd(rides),u:'kph',c:C.gold}].map((s,i)=>(
          <div key={i} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:'12px 14px'}}>
            <div style={{fontSize:9,color:C.muted,fontFamily:MONO,letterSpacing:2,marginBottom:6}}>{s.l}</div>
            <div style={{fontFamily:MONO,fontSize:20,color:s.c}}>{s.v}<span style={{fontSize:11,color:C.muted}}> {s.u}</span></div>
            {s.sub&&<div style={{fontFamily:MONO+',monospace',fontSize:9,letterSpacing:'0.22em',textTransform:'uppercase',color:C.dim,marginTop:3}}>{s.sub}</div>}
          </div>
        ))}
      </div>

      {/* Speed sparkline */}
      <div style={{background:C.card,borderRadius:8,padding:'12px 14px',marginBottom:16,border:`1px solid ${C.border}`}}>
        <Hdg mb={8}>Speed trend</Hdg>
        <div style={{display:'flex',alignItems:'flex-end',gap:3,height:42}}>
          {last8.map((r,i)=>{const h=Math.max(3,(Number(r.avgSpeed)/30)*38);const isL=i===last8.length-1;return(
            <div key={r.id} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:2}}>
              <div style={{width:'100%',height:`${h}px`,background:isL?`linear-gradient(180deg,${C.gold},${C.gold}44)`:`linear-gradient(180deg,${C.primary}77,${C.primary}22)`,borderRadius:2}}/>
              <span style={{fontSize:7,color:C.muted}}>{r.avgSpeed}</span>
            </div>
          )})}
        </div>
      </div>

      {/* Weekly progress */}
      <div style={{marginBottom:16}}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
          <span style={{fontSize:11,color:C.muted}}>Weekly target Â· 120 km</span>
          <span style={{fontFamily:MONO,fontSize:11,color:wk>=120?C.success:C.primary}}>{wk} km</span>
        </div>
        <Prog value={Math.min(100,(wk/120)*100)} color={wk>=120?C.success:C.primary} h={6}/>
      </div>

      {/* GPX Import */}
      {gpxData?(
        <div style={{background:C.card,borderRadius:8,padding:14,marginBottom:14,border:`1px solid ${C.teal}44`}}>
          <Hdg color={C.teal} mb={10}>GPX Â· {gpxData.name}</Hdg>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:12}}>
            {[{l:'Dist',v:gpxData.distance,u:'km'},{l:'Speed',v:gpxData.avgSpeed,u:'kph'},{l:'Elev',v:`+${gpxData.elevGain}`,u:'m'},{l:'Time',v:`${Math.floor(gpxData.durationMin/60)}h${gpxData.durationMin%60}m`,u:''}].map((s,i)=>(
              <div key={i} style={{textAlign:'center'}}><div style={{fontSize:8,color:C.muted,marginBottom:3}}>{s.l}</div><div style={{fontFamily:MONO,fontSize:14,color:C.teal}}>{s.v}<span style={{fontSize:9,color:C.muted}}>{s.u}</span></div></div>
            ))}
          </div>
          <GPXMap points={gpxData.points}/>
          <div style={{display:'flex',gap:8,marginTop:12}}>
            <Btn onClick={logGPX} color={C.success} small>Log as Ride</Btn>
            <Btn onClick={()=>setGpxData(null)} color={C.muted} outline small>Discard</Btn>
          </div>
        </div>
      ):(
        <div style={{display:'flex',gap:8,marginBottom:14}}>
          <Btn onClick={()=>gpxRef.current?.click()} color={C.teal} small>ðŸ“ Import GPX</Btn>
          <input ref={gpxRef} type="file" accept=".gpx" onChange={handleGPX} style={{display:'none'}}/>
          <Btn onClick={()=>setAdding(a=>!a)} color={C.primary} small>{adding?'âœ•':'+ Log Ride'}</Btn>
        </div>
      )}

      {adding&&(
        <div style={{background:C.card,borderRadius:8,padding:14,marginBottom:14,border:`1px solid ${C.primary}44`}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
            <div><Label>Date</Label><Inp type="date" value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))}/></div>
            <div><Label>Distance km</Label><Inp type="number" value={form.km} onChange={e=>setForm(p=>({...p,km:e.target.value}))} placeholder="28"/></div>
            <div><Label>Avg Speed kph</Label><Inp type="number" value={form.avgSpeed} onChange={e=>setForm(p=>({...p,avgSpeed:e.target.value}))} placeholder="22"/></div>
            <div><Label>Duration</Label><Inp value={form.duration} onChange={e=>setForm(p=>({...p,duration:e.target.value}))} placeholder="1h15m"/></div>
          </div>
          <div style={{marginBottom:10}}><Label>Notes</Label><Inp value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} placeholder="How did it feel?"/></div>
          <Btn onClick={addRide} color={C.success} small>Save</Btn>
        </div>
      )}

      {/* Ride list */}
      <Hdg mb={8}>Ride History</Hdg>
      {rides.slice(0,20).map(r=>(
        <div key={r.id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:`1px solid ${C.dim}`,fontSize:13}}>
          <span style={{color:C.muted,fontSize:10,width:55}}>{fmt(r.date)}</span>
          <span style={{fontFamily:MONO,color:C.primary,fontSize:12}}>{r.km}<span style={{fontSize:9,color:C.muted}}> km</span></span>
          <span style={{fontFamily:MONO,color:C.gold,fontSize:12}}>{r.avgSpeed}<span style={{fontSize:9,color:C.muted}}> kph</span></span>
          <span style={{flex:1,color:C.muted,fontSize:11,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.duration||''}{r.notes?' Â· '+r.notes:''}</span>
          <button onClick={()=>setRides(p=>p.filter(x=>x.id!==r.id))} style={{background:'none',border:'none',color:C.dim,cursor:'pointer',fontSize:11}}
            onMouseEnter={e=>e.target.style.color=C.danger} onMouseLeave={e=>e.target.style.color=C.dim}>âœ•</button>
        </div>
      ))}
      {!rides.length&&<div style={{textAlign:'center',padding:20,color:C.muted,fontSize:13}}>No rides yet. Import a GPX or tell Friday.</div>}
    </div>
  )
}

// â”€â”€â”€ TRAINING PANEL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function TrainingPanel({rides, trainingPlan, setTrainingPlan}) {
  const {ctl,atl,tsb,status}=computeLoad(rides)
  const typeColor={rest:C.muted,easy:C.success,medium:C.primary,hard:C.danger,long:C.gold,intervals:C.purple}
  const typeIcon={rest:'ðŸ˜´',easy:'ðŸŸ¢',medium:'ðŸ”µ',hard:'ðŸ”´',long:'ðŸŸ¡',intervals:'âš¡'}
  const advice=tsb>15?'Peak form â€” push hard'
    :tsb>5?'Primed â€” quality session'
    :tsb>-5?'Neutral â€” moderate effort'
    :tsb>-20?'Building â€” manageable fatigue'
    :'Fatigued â€” rest or easy only'

  return (
    <div className="fade-in">
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:16}}>
        {[{l:'CTL',v:ctl,sub:'Fitness',c:C.primary},{l:'ATL',v:atl,sub:'Fatigue',c:C.danger},{l:'TSB',v:tsb,sub:status.l,c:status.c}].map((s,i)=>(
          <div key={i} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:'12px',textAlign:'center'}}>
            <div style={{fontSize:9,color:C.muted,fontFamily:MONO,letterSpacing:2,marginBottom:6}}>{s.l}</div>
            <div style={{fontFamily:MONO,fontSize:24,color:s.c}}>{s.v}</div>
            <div style={{fontSize:10,color:s.c,marginTop:3}}>{s.sub}</div>
          </div>
        ))}
      </div>
      <div style={{background:`${status.c}10`,border:`1px solid ${status.c}30`,borderRadius:8,padding:'10px 14px',marginBottom:16,fontSize:13,color:C.text}}>
        <span style={{color:status.c}}>â—ˆ </span>{advice}
      </div>

      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
        <Hdg mb={0}>Weekly Plan</Hdg>
        {trainingPlan.length>0&&<button onClick={()=>setTrainingPlan([])} style={{background:'none',border:'none',color:C.muted,cursor:'pointer',fontSize:11}}>Clear</button>}
      </div>
      {trainingPlan.length===0?(
        <div style={{textAlign:'center',padding:'24px 0',color:C.muted,fontSize:13}}>
          <div style={{fontSize:28,marginBottom:8}}>ðŸ“…</div>
          Ask Friday: &quot;Generate my training plan&quot;
        </div>
      ):(
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
          {trainingPlan.map((d,i)=>{
            const isT=d.date===today(),tc=typeColor[d.type]||C.muted
            return(
              <div key={i} style={{background:isT?`${tc}12`:C.card,border:`1px solid ${isT?tc:C.dim}`,borderRadius:8,padding:'10px 12px'}}>
                <div style={{fontSize:9,color:C.muted,fontFamily:MONO,marginBottom:4}}>{d.day_name||fmt(d.date)}</div>
                <div style={{fontSize:14,marginBottom:3}}>{typeIcon[d.type]||'â—ˆ'}</div>
                <div style={{fontSize:11,color:tc,fontWeight:600,textTransform:'capitalize',marginBottom:3}}>{d.type}{d.km>0?` Â· ${d.km}km`:''}</div>
                <div style={{fontSize:11,color:C.text,lineHeight:1.4}}>{d.description}</div>
                {isT&&<div style={{fontSize:8,color:tc,fontFamily:MONO,marginTop:5,letterSpacing:1}}>TODAY â—ˆ</div>}
              </div>
            )
          })}
        </div>
      )}
      {trainingPlan[0]?.rationale&&(
        <div style={{marginTop:12,padding:'10px 12px',background:`${C.primary}08`,borderRadius:8,fontSize:12,color:C.muted,lineHeight:1.6}}>
          <span style={{color:C.primary}}>Friday: </span>{trainingPlan[0].rationale}
        </div>
      )}
    </div>
  )
}

// â”€â”€â”€ BODY PANEL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function BodyPanel({bodyMetrics, setBodyMetrics, rides}) {
  const [adding,setAdding]=useState(false)
  const [form,setForm]=useState({type:'weight',value:'',date:today(),notes:''})
  const add=()=>{if(!form.value)return;setBodyMetrics(p=>[...p,{id:Date.now(),...form,value:Number(form.value)}]);setForm({type:'weight',value:'',date:today(),notes:''});setAdding(false)}

  const weights=bodyMetrics.filter(m=>m.type==='weight').sort((a,b)=>a.date.localeCompare(b.date))
  const sleeps=bodyMetrics.filter(m=>m.type==='sleep').sort((a,b)=>a.date.localeCompare(b.date)).slice(-14)
  const latestW=weights[weights.length-1]
  const prevW=weights[weights.length-2]
  const wDelta=latestW&&prevW?+(latestW.value-prevW.value).toFixed(1):null
  const avgSl=sleeps.length?+(sleeps.slice(-7).reduce((s,m)=>s+m.value,0)/Math.min(7,sleeps.length)).toFixed(1):null
  const minW=weights.length?Math.min(...weights.map(m=>m.value)):80
  const maxW=weights.length?Math.max(...weights.map(m=>m.value)):90
  const wRange=Math.max(maxW-minW,2)

  let corr=null
  if(sleeps.length>=3&&rides.length>=3){
    const gd=new Set(sleeps.filter(s=>s.value>=7.5).map(s=>s.date)),pd=new Set(sleeps.filter(s=>s.value<7.5).map(s=>s.date))
    const ag=rides.filter(r=>{const p=new Date(r.date);p.setDate(p.getDate()-1);return gd.has(p.toISOString().split('T')[0])})
    const ap=rides.filter(r=>{const p=new Date(r.date);p.setDate(p.getDate()-1);return pd.has(p.toISOString().split('T')[0])})
    if(ag.length>=2&&ap.length>=2){
      const vg=ag.reduce((s,r)=>s+Number(r.avgSpeed),0)/ag.length
      const vp=ap.reduce((s,r)=>s+Number(r.avgSpeed),0)/ap.length
      corr={g:+vg.toFixed(1),p:+vp.toFixed(1),d:+(vg-vp).toFixed(1)}
    }
  }

  return (
    <div className="fade-in">
      <div style={{display:'flex',gap:8,marginBottom:16}}>
        <Btn onClick={()=>setAdding(a=>!a)} color={C.success} small>{adding?'âœ•':'+ Log Metric'}</Btn>
      </div>
      {adding&&(
        <div style={{background:C.card,borderRadius:8,padding:14,marginBottom:14,border:`1px solid ${C.success}44`}}>
          <div style={{display:'flex',gap:6,marginBottom:10}}>
            {[['weight','âš–ï¸ Weight'],['sleep','ðŸ˜´ Sleep'],['hrv','ðŸ’“ HRV']].map(([t,l])=>(
              <button key={t} onClick={()=>setForm(f=>({...f,type:t}))} style={{padding:'5px 12px',borderRadius:6,border:`1px solid ${form.type===t?C.success:C.dim}`,background:form.type===t?`${C.success}18`:'transparent',color:form.type===t?C.success:C.muted,fontSize:11,cursor:'pointer'}}>{l}</button>
            ))}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:10}}>
            <div><Label>Date</Label><Inp type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/></div>
            <div><Label>Value</Label><Inp type="number" value={form.value} onChange={e=>setForm(f=>({...f,value:e.target.value}))} placeholder={form.type==='weight'?'87.5':form.type==='sleep'?'7.5':'55'}/></div>
          </div>
          <Btn onClick={add} color={C.success} small>Save</Btn>
        </div>
      )}

      {/* Weight */}
      <div style={{background:C.card,borderRadius:8,padding:14,marginBottom:12,border:`1px solid ${C.border}`}}>
        <Hdg color={C.teal} mb={8}>Weight Trend</Hdg>
        {!weights.length?<div style={{color:C.muted,fontSize:12}}>Tell Friday &quot;I weigh 87.5kg today&quot;</div>:(
          <>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
              <span style={{fontFamily:MONO,fontSize:22,color:C.teal}}>{latestW.value}<span style={{fontSize:11,color:C.muted}}> kg</span></span>
              {wDelta!==null&&<span style={{color:wDelta<0?C.success:C.danger,fontFamily:MONO,fontSize:14,alignSelf:'flex-end'}}>{wDelta>0?'+':''}{wDelta} kg</span>}
            </div>
            <div style={{display:'flex',alignItems:'flex-end',gap:2,height:40,marginBottom:8}}>
              {weights.slice(-20).map((m,i)=>{const h=Math.max(3,((m.value-minW+0.5)/(wRange+0.5))*36);return<div key={m.id} style={{flex:1,height:`${h}px`,background:`linear-gradient(180deg,${C.teal},${C.teal}44)`,borderRadius:2}}/>})}
            </div>
            <Prog value={pct(latestW.value,82,true)} color={C.teal} h={4}/>
            <div style={{display:'flex',justifyContent:'space-between',fontFamily:MONO+',monospace',fontSize:9,letterSpacing:'0.22em',textTransform:'uppercase',color:C.dim,marginTop:4}}><span>Target: 82 kg</span><span>{(latestW.value-82).toFixed(1)} kg to go</span></div>
          </>
        )}
      </div>

      {/* Sleep */}
      <div style={{background:C.card,borderRadius:8,padding:14,marginBottom:12,border:`1px solid ${C.border}`}}>
        <Hdg color={C.purple} mb={8}>Sleep (14 nights)</Hdg>
        {!sleeps.length?<div style={{color:C.muted,fontSize:12}}>Tell Friday &quot;I slept 7.5 hours&quot;</div>:(
          <>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
              <span style={{fontFamily:MONO,fontSize:22,color:C.purple}}>{avgSl}<span style={{fontSize:11,color:C.muted}}> h avg</span></span>
              <span style={{fontSize:11,color:avgSl>=7.5?C.success:C.gold,alignSelf:'flex-end'}}>{avgSl>=8?'Excellent':avgSl>=7.5?'Good':'Below optimal'}</span>
            </div>
            <div style={{display:'flex',alignItems:'flex-end',gap:2,height:40}}>
              {sleeps.map((m,i)=>{const h=Math.max(2,(m.value/10)*36);const c=m.value>=7.5?C.success:m.value>=6?C.gold:C.danger;return<div key={m.id} style={{flex:1,height:`${h}px`,background:c,borderRadius:2,opacity:0.75}} title={`${m.value}h`}/>})}
            </div>
          </>
        )}
      </div>

      {/* Correlation */}
      {corr&&(
        <div style={{background:C.card,borderRadius:8,padding:14,marginBottom:12,border:`1px solid ${C.gold}33`}}>
          <Hdg color={C.gold} mb={8}>Sleep Ã— Ride Speed</Hdg>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,textAlign:'center'}}>
            <div><div style={{fontSize:9,color:C.muted,marginBottom:4}}>AFTER 7.5H+</div><div style={{fontFamily:MONO,fontSize:18,color:C.success}}>{corr.g}<span style={{fontSize:9,color:C.muted}}>kph</span></div></div>
            <div><div style={{fontSize:9,color:C.muted,marginBottom:4}}>POOR SLEEP</div><div style={{fontFamily:MONO,fontSize:18,color:C.danger}}>{corr.p}<span style={{fontSize:9,color:C.muted}}>kph</span></div></div>
            <div style={{background:`${C.gold}10`,borderRadius:6}}><div style={{fontSize:9,color:C.muted,marginBottom:4}}>IMPACT</div><div style={{fontFamily:MONO,fontSize:18,color:C.gold}}>+{corr.d}<span style={{fontSize:9,color:C.muted}}>kph</span></div></div>
          </div>
        </div>
      )}
    </div>
  )
}

// â”€â”€â”€ GOALS PANEL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function GoalsPanel({goals,setGoals}) {
  const [adding,setAdding]=useState(false)
  const [form,setForm]=useState({title:'',category:'cycling',current:'',target:'',unit:'',icon:'ðŸŽ¯',inverted:false})
  const add=()=>{if(!form.title||!form.target)return;setGoals(p=>[...p,{id:Date.now(),...form,current:Number(form.current),target:Number(form.target),color:catColor(form.category)}]);setForm({title:'',category:'cycling',current:'',target:'',unit:'',icon:'ðŸŽ¯',inverted:false});setAdding(false)}
  const upd=(id,f,v)=>setGoals(p=>p.map(g=>g.id===id?{...g,[f]:['current','target'].includes(f)?Number(v):v}:g))
  return(
    <div className="fade-in">
      <div style={{marginBottom:12}}><Btn onClick={()=>setAdding(a=>!a)} color={C.gold} small>{adding?'âœ•':'+ New Goal'}</Btn></div>
      {adding&&(
        <div style={{background:C.card,borderRadius:8,padding:14,marginBottom:14,border:`1px solid ${C.gold}44`}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
            <div style={{gridColumn:'1/-1'}}><Label>Title</Label><Inp value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} placeholder="Weekly distance"/></div>
            <div><Label>Current</Label><Inp type="number" value={form.current} onChange={e=>setForm(p=>({...p,current:e.target.value}))} placeholder="0"/></div>
            <div><Label>Target</Label><Inp type="number" value={form.target} onChange={e=>setForm(p=>({...p,target:e.target.value}))} placeholder="120"/></div>
            <div><Label>Unit</Label><Inp value={form.unit} onChange={e=>setForm(p=>({...p,unit:e.target.value}))} placeholder="km"/></div>
            <div><Label>Category</Label><Sel value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))} options={['cycling','health','productivity','finance','learning','custom']}/></div>
          </div>
          <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:10}}>
            <Inp value={form.icon} onChange={e=>setForm(p=>({...p,icon:e.target.value}))} placeholder="ðŸŽ¯" style={{width:60}}/>
            <label style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:C.muted,cursor:'pointer'}}><input type="checkbox" checked={form.inverted} onChange={e=>setForm(p=>({...p,inverted:e.target.checked}))}/>Lower is better</label>
          </div>
          <Btn onClick={add} color={C.success} small>Add Goal</Btn>
        </div>
      )}
      {goals.map(g=>{
        const p=pct(g.current,g.target,g.inverted),col=g.color||catColor(g.category)
        return(
          <div key={g.id} style={{background:C.card,borderRadius:8,padding:'12px 14px',marginBottom:10,border:`1px solid ${p>=100?col+'55':C.border}`}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <span style={{fontSize:18}}>{g.icon}</span>
                <div><div style={{color:C.text,fontSize:13,fontWeight:600}}>{g.title}</div><Badge label={g.category} color={col}/></div>
              </div>
              <button onClick={()=>setGoals(prev=>prev.filter(x=>x.id!==g.id))} style={{background:'none',border:'none',color:C.dim,cursor:'pointer'}} onMouseEnter={e=>e.target.style.color=C.danger} onMouseLeave={e=>e.target.style.color=C.dim}>âœ•</button>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
              <div style={{display:'flex',alignItems:'center',gap:6}}>
                <input type="number" value={g.current} onChange={e=>upd(g.id,'current',e.target.value)} style={{background:C.card2,border:`1px solid ${C.dim}`,borderRadius:5,padding:'3px 7px',color:col,width:60,fontSize:14,fontFamily:MONO,outline:'none',textAlign:'center'}}/>
                <span style={{color:C.muted,fontSize:12}}>/ {g.target} {g.unit}</span>
              </div>
              <span style={{fontFamily:MONO,fontSize:16,color:p>=100?C.success:col}}>{p}%</span>
            </div>
            <Prog value={p} color={p>=100?C.success:col} h={5}/>
            {p>=100&&<div style={{marginTop:6,fontSize:9,color:C.success,fontFamily:MONO,letterSpacing:'0.1em'}}>âœ“ ACHIEVED Â· TELL FRIDAY TO UPGRADE</div>}
          </div>
        )
      })}
      {!goals.length&&<div style={{textAlign:'center',padding:20,color:C.muted,fontSize:12}}>Ask Friday to set a goal.</div>}
    </div>
  )
}

// â”€â”€â”€ PROJECTS PANEL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ProjectsPanel({projects,setProjects,githubToken,setGithubToken,githubCommits,setGithubCommits}) {
  const [adding,setAdding]=useState(false)
  const [form,setForm]=useState({name:'',description:'',status:'active',tech:'',githubUrl:'',liveUrl:'',priority:'medium'})
  const [ghUser,setGhUser]=useState(()=>{try{return localStorage.getItem('fri_gh_user')||''}catch{return''}})
  const [ghLoading,setGhLoading]=useState(false)
  const [ghError,setGhError]=useState('')
  const sC={active:C.primary,paused:C.gold,done:C.success,idea:C.muted}
  const pC={high:C.danger,medium:C.gold,low:C.muted}

  const add=()=>{if(!form.name)return;setProjects(p=>[...p,{id:Date.now(),...form,tech:form.tech.split(',').map(t=>t.trim()).filter(Boolean),created:today()}]);setForm({name:'',description:'',status:'active',tech:'',githubUrl:'',liveUrl:'',priority:'medium'});setAdding(false)}
  const fetchGH=async()=>{if(!githubToken||!ghUser){setGhError('Need both');return}
    setGhLoading(true);setGhError('')
    try{
      localStorage.setItem('fri_gh_user',ghUser)
      const res=await fetch(`https://api.github.com/users/${ghUser}/events?per_page=100`,{headers:{Authorization:`token ${githubToken}`,Accept:'application/vnd.github.v3+json'}})
      if(!res.ok)throw new Error(`GitHub ${res.status}`)
      const ev=await res.json()
      setGithubCommits(ev.filter(e=>e.type==='PushEvent').flatMap(e=>(e.payload.commits||[]).map(c=>({id:c.sha,date:e.created_at.split('T')[0],repo:e.repo.name.split('/')[1],message:c.message.split('\n')[0].slice(0,65),sha:c.sha.slice(0,7)}))).slice(0,40))
    }catch(err){setGhError(err.message)}
    setGhLoading(false)
  }
  const cbD=githubCommits.reduce((a,c)=>{a[c.date]=(a[c.date]||0)+1;return a},{})
  const maxC=Math.max(...Object.values(cbD),1)
  const weeks=[...Array(12)].map((_,wi)=>[...Array(7)].map((_,di)=>{const d=new Date();d.setDate(d.getDate()-(11-wi)*7-(6-di));const k=d.toISOString().split('T')[0];return{date:k,count:cbD[k]||0}}))
  const hC=n=>n===0?C.dim:n>=maxC*0.75?C.success:n>=maxC*0.4?`${C.success}77`:`${C.success}40`

  return(
    <div className="fade-in">
      {/* GitHub */}
      <div style={{background:C.card,borderRadius:8,padding:14,marginBottom:14,border:`1px solid ${C.border}`}}>
        <Hdg color={C.success} mb={10}>GitHub Commits</Hdg>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
          <div><Label>Username</Label><Inp value={ghUser} onChange={e=>setGhUser(e.target.value)} placeholder="username"/></div>
          <div><Label>Token</Label><Inp type="password" value={githubToken} onChange={e=>setGithubToken(e.target.value)} placeholder="ghp_..."/></div>
        </div>
        {ghError&&<div style={{fontSize:11,color:C.danger,marginBottom:6}}>{ghError}</div>}
        <Btn onClick={fetchGH} color={C.success} small>{ghLoading?'...':'Sync'}</Btn>
        {githubCommits.length>0&&(
          <div style={{marginTop:12}}>
            <div style={{display:'flex',gap:2,marginBottom:8}}>
              {weeks.map((w,wi)=><div key={wi} style={{display:'flex',flexDirection:'column',gap:2}}>{w.map((d,di)=><div key={di} style={{width:10,height:10,borderRadius:1,background:hC(d.count)}} title={`${d.count} commits`}/>)}</div>)}
            </div>
            {githubCommits.slice(0,5).map(c=>(
              <div key={c.id} style={{display:'flex',gap:8,padding:'5px 0',borderBottom:`1px solid ${C.dim}`,fontSize:11}}>
                <span style={{color:C.muted,width:50,fontSize:9}}>{fmt(c.date)}</span>
                <span style={{color:C.success,width:65,fontFamily:MONO,fontSize:9,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.repo}</span>
                <span style={{flex:1,color:C.text}}>{c.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={{marginBottom:10}}><Btn onClick={()=>setAdding(a=>!a)} color={C.secondary} small>{adding?'âœ•':'+ Project'}</Btn></div>
      {adding&&(
        <div style={{background:C.card,borderRadius:8,padding:14,marginBottom:12,border:`1px solid ${C.secondary}44`}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
            <div><Label>Name</Label><Inp value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="My App"/></div>
            <div><Label>Status</Label><Sel value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))} options={['idea','active','paused','done']}/></div>
            <div style={{gridColumn:'1/-1'}}><Label>Description</Label><Inp value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} placeholder="What does it do?"/></div>
            <div><Label>Tech</Label><Inp value={form.tech} onChange={e=>setForm(p=>({...p,tech:e.target.value}))} placeholder="Next.js,Claude"/></div>
            <div><Label>GitHub URL</Label><Inp value={form.githubUrl} onChange={e=>setForm(p=>({...p,githubUrl:e.target.value}))} placeholder="https://..."/></div>
          </div>
          <Btn onClick={add} color={C.success} small>Save</Btn>
        </div>
      )}
      {projects.map(p=>(
        <div key={p.id} style={{background:C.card,borderRadius:8,padding:'12px 14px',marginBottom:10,border:`1px solid ${C.border}`}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:6}}>
            <div>
              <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:4}}>{p.name}</div>
              <div style={{display:'flex',gap:5}}><Badge label={p.status} color={sC[p.status]}/><Badge label={p.priority||'medium'} color={pC[p.priority||'medium']}/></div>
            </div>
            <button onClick={()=>setProjects(prev=>prev.filter(x=>x.id!==p.id))} style={{background:'none',border:'none',color:C.dim,cursor:'pointer'}} onMouseEnter={e=>e.target.style.color=C.danger} onMouseLeave={e=>e.target.style.color=C.dim}>âœ•</button>
          </div>
          {p.description&&<div style={{fontSize:12,color:C.muted,lineHeight:1.5,marginBottom:6}}>{p.description}</div>}
          {p.tech?.length>0&&<div style={{display:'flex',flexWrap:'wrap',gap:4,marginBottom:6}}>{p.tech.map(t=><span key={t} style={{fontSize:10,padding:'1px 6px',borderRadius:3,background:C.dim,color:C.text}}>{t}</span>)}</div>}
          <div style={{display:'flex',gap:6}}>
            {['idea','active','paused','done'].map(s=><button key={s} onClick={()=>setProjects(prev=>prev.map(x=>x.id===p.id?{...x,status:s}:x))} style={{flex:1,padding:'3px 2px',borderRadius:4,border:`1px solid ${p.status===s?sC[s]:C.dim}`,background:p.status===s?`${sC[s]}15`:'transparent',color:p.status===s?sC[s]:C.dim,fontSize:9,cursor:'pointer',textTransform:'uppercase'}}>{s}</button>)}
          </div>
        </div>
      ))}
    </div>
  )
}

// â”€â”€â”€ FINANCE PANEL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function FinancePanel({transactions,setTransactions}) {
  const [adding,setAdding]=useState(false)
  const [form,setForm]=useState({date:today(),description:'',amount:'',type:'expense',category:'Food'})
  const cats={income:['Salary','Freelance','Investment','Gift','Other'],expense:['Housing','Food','Transport','Subscriptions','Health','Sport','Entertainment','Other']}
  const inc=transactions.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0)
  const exp=transactions.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0)
  const bal=inc-exp
  const byCat=transactions.filter(t=>t.type==='expense').reduce((a,t)=>{a[t.category]=(a[t.category]||0)+t.amount;return a},{})
  const topCats=Object.entries(byCat).sort((a,b)=>b[1]-a[1]).slice(0,4)
  const addTx=()=>{if(!form.description||!form.amount)return;setTransactions(p=>[{id:Date.now(),...form,amount:Number(form.amount)},...p]);setForm({date:today(),description:'',amount:'',type:'expense',category:'Food'});setAdding(false)}
  return(
    <div className="fade-in">
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:14}}>
        {[{l:'Income',v:`â‚¬${inc.toLocaleString()}`,c:C.success},{l:'Expenses',v:`â‚¬${exp.toLocaleString()}`,c:C.danger},{l:'Balance',v:`â‚¬${bal.toLocaleString()}`,c:bal>=0?C.success:C.danger}].map((s,i)=>(
          <div key={i} style={{background:C.card,borderRadius:8,padding:'10px',textAlign:'center',border:`1px solid ${C.border}`}}>
            <div style={{fontSize:9,color:C.muted,fontFamily:MONO,letterSpacing:2,marginBottom:5}}>{s.l}</div>
            <div style={{fontFamily:MONO,fontSize:16,color:s.c}}>{s.v}</div>
          </div>
        ))}
      </div>
      {topCats.length>0&&<div style={{background:C.card,borderRadius:8,padding:12,marginBottom:12,border:`1px solid ${C.border}`}}>{topCats.map(([cat,amt])=>(<div key={cat} style={{marginBottom:8}}><div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:3}}><span style={{color:C.text}}>{cat}</span><span style={{color:C.muted,fontFamily:MONO}}>â‚¬{amt}</span></div><Prog value={Math.min(100,(amt/exp)*100)} color={C.secondary} h={3}/></div>))}</div>}
      <div style={{marginBottom:10}}><Btn onClick={()=>setAdding(a=>!a)} color={C.success} small>{adding?'âœ•':'+ Transaction'}</Btn></div>
      {adding&&(
        <div style={{background:C.card,borderRadius:8,padding:14,marginBottom:12,border:`1px solid ${C.success}44`}}>
          <div style={{display:'flex',gap:6,marginBottom:10}}>
            {['expense','income'].map(t=><button key={t} onClick={()=>setForm(f=>({...f,type:t,category:cats[t][0]}))} style={{padding:'5px 12px',borderRadius:6,border:`1px solid ${t==='expense'?C.danger:C.success}`,background:form.type===t?`${t==='expense'?C.danger:C.success}18`:'transparent',color:t==='expense'?C.danger:C.success,fontSize:11,cursor:'pointer',textTransform:'uppercase'}}>{t}</button>)}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:10}}>
            <div><Label>Description</Label><Inp value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Rent"/></div>
            <div><Label>Amount â‚¬</Label><Inp type="number" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} placeholder="0"/></div>
            <div><Label>Category</Label><Sel value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} options={cats[form.type]}/></div>
            <div><Label>Date</Label><Inp type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/></div>
          </div>
          <Btn onClick={addTx} color={C.success} small>Save</Btn>
        </div>
      )}
      {transactions.slice(0,20).map(t=>(
        <div key={t.id} style={{display:'flex',gap:8,padding:'7px 0',borderBottom:`1px solid ${C.dim}`,fontSize:12}}>
          <span style={{color:C.muted,fontSize:10,width:50}}>{fmt(t.date)}</span>
          <span style={{flex:1,color:C.text}}>{t.description}</span>
          <span style={{color:C.muted,fontSize:10}}>{t.category}</span>
          <span style={{color:t.type==='income'?C.success:C.danger,fontFamily:MONO}}>{t.type==='income'?'+':'-'}â‚¬{t.amount}</span>
          <button onClick={()=>setTransactions(p=>p.filter(x=>x.id!==t.id))} style={{background:'none',border:'none',color:C.dim,cursor:'pointer',fontSize:10}} onMouseEnter={e=>e.target.style.color=C.danger} onMouseLeave={e=>e.target.style.color=C.dim}>âœ•</button>
        </div>
      ))}
    </div>
  )
}

// â”€â”€â”€ CALENDAR PANEL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function CalendarPanel({trainingPlan,rides}) {
  const {tsb,status}=computeLoad(rides)
  const wk=weeklyKm(rides)
  const tips=[
    {icon:'ðŸŒ…',text:'Morning rides (6-8am) are most effective â€” lower traffic, cooler temperatures, and metabolic priming.'},
    {icon:'ðŸƒ',text:`Your TSB is ${tsb.toFixed(0)} (${status.l}). ${tsb>5?'Good form â€” go hard.':tsb>-10?'Moderate effort recommended.':'Go easy or rest.'}` },
    {icon:'ðŸŽ¯',text:`You have ${Math.max(0,120-wk)}km left to hit your weekly target.`},
  ]
  return(
    <div className="fade-in">
      <div style={{background:C.card,borderRadius:8,padding:14,marginBottom:14,border:`1px solid ${C.primary}33`}}>
        <Hdg color={C.primary} mb={10}>Riding Suggestions</Hdg>
        <div style={{fontSize:13,color:C.text,lineHeight:1.7,marginBottom:12}}>
          Ask Friday: <span style={{color:C.primary}}>&quot;Check my calendar and suggest the best days to ride this week&quot;</span>
        </div>
        <div style={{fontSize:12,color:C.muted,lineHeight:1.6}}>
          Friday has access to your Google Calendar via the connected integration. She will analyse your schedule, find 1.5-2 hour free windows, and suggest optimal ride times with specific workout types based on your current form (TSB {tsb.toFixed(0)}).
        </div>
      </div>
      {tips.map((t,i)=>(
        <div key={i} style={{display:'flex',gap:10,padding:'10px 14px',background:C.card,borderRadius:8,marginBottom:8,border:`1px solid ${C.border}`}}>
          <span style={{fontSize:18,flexShrink:0}}>{t.icon}</span>
          <span style={{fontSize:12,color:C.text,lineHeight:1.6}}>{t.text}</span>
        </div>
      ))}
      {trainingPlan.length>0&&(
        <div style={{marginTop:12}}>
          <Hdg mb={8}>Current Week Plan</Hdg>
          {trainingPlan.map((d,i)=>{
            const isT=d.date===today()
            const typeColor={rest:C.muted,easy:C.success,medium:C.primary,hard:C.danger,long:C.gold,intervals:C.purple}
            const tc=typeColor[d.type]||C.muted
            return(
              <div key={i} style={{display:'flex',gap:10,padding:'8px 0',borderBottom:`1px solid ${C.dim}`,alignItems:'center'}}>
                <span style={{fontFamily:MONO+',monospace',fontSize:9,letterSpacing:'0.22em',textTransform:'uppercase',color:C.dim,fontFamily:MONO,width:65}}>{d.day_name||fmt(d.date)}</span>
                <span style={{fontSize:10,color:tc,fontFamily:MONO,width:70,textTransform:'uppercase'}}>{d.type}</span>
                {d.km>0&&<span style={{fontFamily:MONO+',monospace',fontSize:9,letterSpacing:'0.22em',textTransform:'uppercase',color:C.dim,width:40}}>{d.km}km</span>}
                <span style={{flex:1,fontSize:11,color:C.text}}>{d.description}</span>
                {isT&&<Badge label="TODAY" color={tc}/>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// â”€â”€â”€ STRAVA PANEL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function StravaPanel({rides,setRides}) {
  const [clientId,setClientId]=useState(()=>{try{return localStorage.getItem('strava_client_id')||''}catch{return''}})
  const [clientSecret,setClientSecret]=useState(()=>{try{return localStorage.getItem('strava_client_secret')||''}catch{return''}})
  const [token,setToken]=useState(()=>{try{return localStorage.getItem('strava_token')||''}catch{return''}})
  const [syncing,setSyncing]=useState(false)
  const [syncMsg,setSyncMsg]=useState('')
  const [synced,setSynced]=useState([])

  // Detect OAuth callback code in URL
  useEffect(()=>{
    const url=new URLSearchParams(window.location.search)
    const code=url.get('code')
    if(code&&clientId&&clientSecret&&!token){
      const exchangeToken=async()=>{
        setSyncMsg('Exchanging token with Strava...')
        try{
          const res=await fetch('https://www.strava.com/oauth/token',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:clientId,client_secret:clientSecret,code,grant_type:'authorization_code'})})
          const data=await res.json()
          if(data.access_token){
            localStorage.setItem('strava_token',data.access_token)
            localStorage.setItem('strava_refresh',data.refresh_token||'')
            setToken(data.access_token)
            setSyncMsg('âœ“ Connected to Strava! Click Sync Rides.')
            window.history.replaceState({},'',window.location.pathname)
          }else{setSyncMsg('Token exchange failed: '+JSON.stringify(data))}
        }catch(err){setSyncMsg('Error: '+err.message)}
      }
      exchangeToken()
    }
  },[clientId,clientSecret,token])

  const saveCredentials=()=>{
    localStorage.setItem('strava_client_id',clientId)
    localStorage.setItem('strava_client_secret',clientSecret)
    setSyncMsg('Credentials saved.')
  }
  const authorise=()=>{
    if(!clientId){setSyncMsg('Enter Client ID first.');return}
    const redirectUri=window.location.origin+window.location.pathname
    const url=`https://www.strava.com/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&approval_prompt=auto&scope=activity:read_all`
    window.location.href=url
  }
  const syncRides=async()=>{
    if(!token){setSyncMsg('Connect Strava first.');return}
    setSyncing(true);setSyncMsg('Fetching activities...')
    try{
      const res=await fetch('https://www.strava.com/api/v3/athlete/activities?per_page=30',{headers:{Authorization:`Bearer ${token}`}})
      if(res.status===401){localStorage.removeItem('strava_token');setToken('');setSyncMsg('Token expired. Re-authorise.');setSyncing(false);return}
      const acts=await res.json()
      const rideActs=acts.filter(a=>a.type==='Ride'||a.type==='VirtualRide')
      const newRides=rideActs.map(a=>({id:Date.now()+Math.random(),date:a.start_date.split('T')[0],km:+(a.distance/1000).toFixed(2),avgSpeed:+(a.average_speed*3.6).toFixed(1),duration:`${Math.floor(a.moving_time/3600)}h${Math.floor((a.moving_time%3600)/60)}m`,notes:`Strava: ${a.name}`}))
      setRides(prev=>{const existing=new Set(prev.map(r=>r.date+'_'+r.km));const fresh=newRides.filter(r=>!existing.has(r.date+'_'+r.km));setSynced(fresh);return[...fresh,...prev]})
      setSyncMsg(`âœ“ Imported ${newRides.length} rides from Strava.`)
    }catch(err){setSyncMsg('Sync failed: '+err.message)}
    setSyncing(false)
  }
  const disconnect=()=>{localStorage.removeItem('strava_token');setToken('');setSyncMsg('Disconnected.');setSynced([])}

  const steps=[
    {n:'1',title:'Create a Strava API App',body:'Go to strava.com/settings/api â†’ Create App â†’ fill in any name and website. Set Authorization Callback Domain to your Friday URL (e.g. friday.netlify.app or localhost:3000).'},
    {n:'2',title:'Copy your credentials',body:'After creating the app, you will see Client ID and Client Secret on the same page. Copy both into the fields below.'},
    {n:'3',title:'Authorise Friday',body:"Save your credentials then click Authorise. You'll be redirected to Strava's login page. Grant access to your activities. Strava will redirect you back to Friday with an auth code, which Friday exchanges automatically for a token."},
    {n:'4',title:'Sync rides',body:'Once connected, click Sync Rides to import your last 30 Strava activities. New rides will be added without duplicating existing entries. Friday will then be able to analyse your full ride history.'},
  ]

  return(
    <div className="fade-in">
      {/* Status */}
      <div style={{background:token?`${C.success}12`:C.card,border:`1px solid ${token?C.success:C.border}`,borderRadius:8,padding:'12px 14px',marginBottom:16,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div>
          <div style={{fontFamily:MONO,fontSize:9,letterSpacing:2,color:token?C.success:C.muted,marginBottom:2}}>{token?'CONNECTED':'NOT CONNECTED'}</div>
          <div style={{fontSize:12,color:C.muted}}>{token?'Strava is linked. Sync rides below.':'Follow the steps below to link Strava.'}</div>
        </div>
        {token&&<div style={{display:'flex',flexDirection:'column',gap:6}}>
          <Btn onClick={syncRides} color={C.success} small>{syncing?'Syncing...':'Sync Rides'}</Btn>
          <Btn onClick={disconnect} color={C.danger} outline small>Disconnect</Btn>
        </div>}
      </div>
      {syncMsg&&<div style={{background:syncMsg.startsWith('âœ“')?`${C.success}12`:`${C.danger}12`,border:`1px solid ${syncMsg.startsWith('âœ“')?C.success:C.danger}33`,borderRadius:6,padding:'8px 12px',marginBottom:12,fontSize:12,color:C.text}}>{syncMsg}</div>}
      {synced.length>0&&<div style={{background:C.card,borderRadius:8,padding:12,marginBottom:14,border:`1px solid ${C.border}`}}><Hdg color={C.success} mb={8}>Just imported Â· {synced.length} rides</Hdg>{synced.slice(0,5).map((r,i)=><div key={i} style={{display:'flex',gap:8,padding:'5px 0',borderBottom:`1px solid ${C.dim}`,fontSize:12}}><span style={{color:C.muted,fontSize:10,width:55}}>{fmt(r.date)}</span><span style={{fontFamily:MONO,color:C.primary}}>{r.km}km</span><span style={{flex:1,color:C.muted}}>{r.notes}</span></div>)}</div>}

      {/* Credentials */}
      {!token&&(
        <div style={{background:C.card,borderRadius:8,padding:14,marginBottom:14,border:`1px solid ${C.border}`}}>
          <Hdg mb={10}>Credentials</Hdg>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:10}}>
            <div><Label>Client ID</Label><Inp value={clientId} onChange={e=>setClientId(e.target.value)} placeholder="12345"/></div>
            <div><Label>Client Secret</Label><Inp type="password" value={clientSecret} onChange={e=>setClientSecret(e.target.value)} placeholder="abc123..."/></div>
          </div>
          <div style={{display:'flex',gap:8}}>
            <Btn onClick={saveCredentials} color={C.muted} outline small>Save</Btn>
            <Btn onClick={authorise} color={C.secondary} small>Authorise with Strava â†’</Btn>
          </div>
        </div>
      )}

      {/* Steps */}
      <Hdg mb={10}>Setup Guide</Hdg>
      {steps.map((s,i)=>(
        <div key={i} style={{display:'flex',gap:12,marginBottom:14}}>
          <div style={{width:22,height:22,borderRadius:'50%',border:`1px solid ${C.primary}55`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,color:C.primary,fontFamily:MONO,flexShrink:0}}>{s.n}</div>
          <div>
            <div style={{fontSize:13,color:C.text,fontWeight:600,marginBottom:3}}>{s.title}</div>
            <div style={{fontSize:12,color:C.muted,lineHeight:1.6}}>{s.body}</div>
          </div>
        </div>
      ))}
      <div style={{background:`${C.gold}0d`,border:`1px solid ${C.gold}33`,borderRadius:8,padding:'10px 14px',fontSize:12,color:C.muted,lineHeight:1.6}}>
        <span style={{color:C.gold}}>âš  Security note: </span>The client secret is stored in your browser&apos;s localStorage. This is acceptable for a personal app, but avoid sharing your browser profile. The Strava token exchange is done directly from your browser using Strava&apos;s CORS-enabled API endpoint.
      </div>
    </div>
  )
}

// â”€â”€â”€ LEARNING PANEL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function LearningPanel({learnings,setLearnings}) {
  const [adding,setAdding]=useState(false)
  const [form,setForm]=useState({topic:'',progress:0,status:'active',notes:''})
  const sC={active:C.primary,completed:C.success,paused:C.gold}
  const add=()=>{if(!form.topic)return;setLearnings(p=>[...p,{id:Date.now(),...form,progress:Number(form.progress)}]);setForm({topic:'',progress:0,status:'active',notes:''});setAdding(false)}
  return(
    <div className="fade-in">
      <div style={{marginBottom:12}}><Btn onClick={()=>setAdding(a=>!a)} color={C.purple} small>{adding?'âœ•':'+ Topic'}</Btn></div>
      {adding&&(
        <div style={{background:C.card,borderRadius:8,padding:14,marginBottom:12,border:`1px solid ${C.purple}44`}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:10}}>
            <div><Label>Topic</Label><Inp value={form.topic} onChange={e=>setForm(p=>({...p,topic:e.target.value}))} placeholder="Next.js..."/></div>
            <div><Label>Status</Label><Sel value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))} options={['active','paused','completed']}/></div>
            <div><Label>Progress %</Label><Inp type="number" value={form.progress} onChange={e=>setForm(p=>({...p,progress:e.target.value}))} placeholder="0"/></div>
            <div><Label>Notes</Label><Inp value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} placeholder="What are you working on?"/></div>
          </div>
          <Btn onClick={add} color={C.success} small>Add</Btn>
        </div>
      )}
      {learnings.map(l=>(
        <div key={l.id} style={{background:C.card,borderRadius:8,padding:'12px 14px',marginBottom:10,border:`1px solid ${C.border}`}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
            <div><div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:4}}>{l.topic}</div><Badge label={l.status} color={sC[l.status]}/></div>
            <button onClick={()=>setLearnings(p=>p.filter(x=>x.id!==l.id))} style={{background:'none',border:'none',color:C.dim,cursor:'pointer'}} onMouseEnter={e=>e.target.style.color=C.danger} onMouseLeave={e=>e.target.style.color=C.dim}>âœ•</button>
          </div>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:5,fontSize:11,color:C.muted}}>
            <span>Progress</span><span style={{fontFamily:MONO,color:C.purple}}>{l.progress}%</span>
          </div>
          <Prog value={l.progress} color={C.purple} h={4}/>
          <input type="range" min="0" max="100" value={l.progress} onChange={e=>setLearnings(p=>p.map(x=>x.id===l.id?{...x,progress:Number(e.target.value)}:x))} style={{width:'100%',marginTop:7,accentColor:C.purple,cursor:'pointer'}}/>
          {l.notes&&<div style={{fontSize:11,color:C.muted,marginTop:7,lineHeight:1.4}}>{l.notes}</div>}
        </div>
      ))}
    </div>
  )
}

// â”€â”€â”€ MEMORY PANEL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function MemoryPanel({memFacts,setMemFacts,sessions}) {
  const del=f=>{const n=memFacts.filter(x=>x!==f);saveMem({learnedFacts:n});setMemFacts(n)}
  return(
    <div className="fade-in">
      <Hdg color={C.purple}>Learned Facts Â· {memFacts.length}</Hdg>
      {!memFacts.length&&<div style={{color:C.muted,fontSize:12,marginBottom:14}}>Friday saves facts as you talk â€” preferences, patterns, achievements.</div>}
      {memFacts.map((f,i)=>(
        <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',padding:'8px 0',borderBottom:`1px solid ${C.dim}`,gap:8}}>
          <span style={{color:C.text,fontSize:13,flex:1,lineHeight:1.5}}><span style={{color:C.purple,marginRight:6}}>â—</span>{f}</span>
          <button onClick={()=>del(f)} style={{background:'none',border:'none',color:C.dim,cursor:'pointer',fontSize:11,flexShrink:0}} onMouseEnter={e=>e.target.style.color=C.danger} onMouseLeave={e=>e.target.style.color=C.dim}>âœ•</button>
        </div>
      ))}
      {sessions.length>0&&(<><div style={{marginTop:16}}><Hdg color={C.purple}>Sessions Â· {sessions.length}</Hdg></div>{[...sessions].reverse().map((s,i)=>(<div key={i} style={{padding:'8px 0',borderBottom:`1px solid ${C.dim}`}}><div style={{fontSize:9,color:C.muted,fontFamily:MONO,letterSpacing:1,marginBottom:3}}>{s.date}</div><div style={{fontSize:12,color:C.text,lineHeight:1.5}}>{s.summary}</div></div>))}</>)}
    </div>
  )
}

// â”€â”€â”€ INITIAL DATA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const INIT = {
  rides:[
    {id:1,date:'2025-05-12',km:28,avgSpeed:22.4,duration:'1h15m',notes:'Morning ride'},
    {id:2,date:'2025-05-10',km:35,avgSpeed:21.8,duration:'1h36m',notes:'Weekend long ride'},
    {id:3,date:'2025-05-08',km:22,avgSpeed:22.1,duration:'58m',notes:''},
    {id:4,date:'2025-05-06',km:18,avgSpeed:21.5,duration:'48m',notes:'Evening loop'},
  ],
  goals:[
    {id:1,category:'cycling',title:'Weekly distance',current:103,target:120,unit:'km',icon:'ðŸš´',color:'#00d4ff'},
    {id:2,category:'cycling',title:'Average speed',current:22,target:24,unit:'kph',icon:'âš¡',color:'#ffb700'},
    {id:3,category:'health',title:'Weight',current:88,target:82,unit:'kg',icon:'âš–ï¸',inverted:true,color:'#00e5a0'},
    {id:4,category:'productivity',title:'Focus hours/day',current:4,target:6,unit:'h',icon:'ðŸŽ¯',color:'#ff6b35'},
  ],
  projects:[{id:1,name:'Friday Dashboard',description:'Personal AI command centre',status:'active',tech:['Next.js','Claude AI'],priority:'high',githubUrl:'',liveUrl:'',created:'2025-05-14'}],
  tx:[
    {id:1,date:'2025-05-01',description:'Salary',amount:3500,type:'income',category:'Salary'},
    {id:2,date:'2025-05-01',description:'Rent',amount:900,type:'expense',category:'Housing'},
    {id:3,date:'2025-05-10',description:'Groceries',amount:85,type:'expense',category:'Food'},
  ],
  learn:[
    {id:1,topic:'Next.js / React',progress:55,status:'active',notes:'Building Friday'},
    {id:2,topic:'Claude API',progress:40,status:'active',notes:'Tool use + memory'},
    {id:3,topic:'Cycling perf',progress:15,status:'active',notes:'Training zones'},
  ],
}

// â”€â”€â”€ MAIN APP â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function Friday() {
  const [panel, setPanel] = useState(null) // which side panel is open
  const [navExp, setNavExp] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [showSetup, setShowSetup] = useState(false)
  const [tempKey, setTempKey] = useState('')
  const [memFacts, setMemFacts] = useState([])
  const [sessions, setSessions] = useState([])
  const [trainingPlan, setTrainingPlanS] = useState([])
  const [githubToken, setGithubTokenS] = useState('')
  const [githubCommits, setGithubCommits] = useState([])
  const [tonePreference, setTonePreference] = useState('balanced')
  const [wakeActive, setWakeActive] = useState(false)

  // Data with refs
  const [rides,setRidesS]=useState(INIT.rides)
  const [goals,setGoalsS]=useState(INIT.goals)
  const [projects,setProjectsS]=useState(INIT.projects)
  const [transactions,setTransactionsS]=useState(INIT.tx)
  const [learnings,setLearningsS]=useState(INIT.learn)
  const [bodyMetrics,setBodyMetricsS]=useState([])

  const rRef=useRef(INIT.rides),gRef=useRef(INIT.goals),pRef=useRef(INIT.projects)
  const tRef=useRef(INIT.tx),lRef=useRef(INIT.learn),bRef=useRef([])
  const memRef=useRef([]),tpRef=useRef([])

  const setRides=v=>{const n=typeof v==='function'?v(rRef.current):v;rRef.current=n;setRidesS(n)}
  const setGoals=v=>{const n=typeof v==='function'?v(gRef.current):v;gRef.current=n;setGoalsS(n)}
  const setProjects=v=>{const n=typeof v==='function'?v(pRef.current):v;pRef.current=n;setProjectsS(n)}
  const setTransactions=v=>{const n=typeof v==='function'?v(tRef.current):v;tRef.current=n;setTransactionsS(n)}
  const setLearnings=v=>{const n=typeof v==='function'?v(lRef.current):v;lRef.current=n;setLearningsS(n)}
  const setBodyMetrics=v=>{const n=typeof v==='function'?v(bRef.current):v;bRef.current=n;setBodyMetricsS(n)}
  const setTrainingPlan=v=>{const n=typeof v==='function'?v(tpRef.current):v;tpRef.current=n;setTrainingPlanS(n);localStorage.setItem('fri_training_plan',JSON.stringify(n))}
  const setGithubToken=v=>{setGithubTokenS(v);localStorage.setItem('fri_gh_token',v)}

  // Chat
  const [displayMsgs, setDisplayMsgs] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [loadingLabel, setLoadingLabel] = useState('Thinking...')
  const [chatOpen, setChatOpen] = useState(false)
  const [waveH, setWaveH] = useState(Array(20).fill(4))

  const convRef=useRef([])
  const chatEndRef=useRef(null)
  const recognitionRef=useRef(null)
  const wakeRef=useRef(null)
  const keyRef=useRef('')
  const autoTriggerRef=useRef(null)
  const waveInterval=useRef(null)

  // Waveform animation
  useEffect(()=>{
    if(isSpeaking||isLoading){
      waveInterval.current=setInterval(()=>{
        const t=Date.now()
        setWaveH(Array(20).fill(0).map((_,i)=>{
          const base=Math.sin(t/180+i*0.6)*12+14
          const noise=(Math.random()-0.5)*8
          return Math.max(3,base+noise)
        }))
      },80)
    }else{
      clearInterval(waveInterval.current)
      setWaveH(Array(20).fill(4))
    }
    return()=>clearInterval(waveInterval.current)
  },[isSpeaking,isLoading])

  // INIT
  useEffect(()=>{
    const key=localStorage.getItem('friday_api_key')
    if(key){setApiKey(key);keyRef.current=key}else setTimeout(()=>setShowSetup(true),800)
    const load=(k,setter)=>{try{const v=localStorage.getItem(k);if(v)setter(JSON.parse(v))}catch{}}
    load('fri_rides',setRides);load('fri_goals',setGoals);load('fri_projects',setProjects)
    load('fri_transactions',setTransactions);load('fri_learnings',setLearnings)
    load('fri_body',setBodyMetrics);load('fri_training_plan',setTrainingPlan)
    const ghT=localStorage.getItem('fri_gh_token');if(ghT)setGithubTokenS(ghT)
    const tone=localStorage.getItem('fri_tone');if(tone)setTonePreference(tone)
    const mem=loadMem()
    if(mem.learnedFacts){setMemFacts(mem.learnedFacts);memRef.current=mem.learnedFacts}
    if(mem.sessions)setSessions(mem.sessions)
    setTimeout(()=>{
      const wk=weeklyKm(rRef.current),streak=getStreak(rRef.current)
      const {tsb,status}=computeLoad(rRef.current)
      const m=loadMem(),daysSince=m.lastSessionDate?daysAgo(m.lastSessionDate):null
      let g=`Good ${tod()}, sir.`
      if(streak>=3)g+=` ${streak}-day streak.`
      if(wk>0)g+=` ${wk} km this week.`
      g+=` Form: ${status.l} (TSB ${tsb}).`
      if(daysSince!==null&&daysSince>3)g+=` ${daysSince} days since we spoke.`
      setDisplayMsgs([{id:0,role:'assistant',content:g}])
      saveMem({lastSessionDate:today()})
    },400)
    // Monday auto-target
    const isMonday=new Date().getDay()===1
    const mem2=loadMem()
    if(isMonday&&mem2.lastAutoTarget!==today()&&localStorage.getItem('friday_api_key')){
      saveMem({lastAutoTarget:today()})
      setTimeout(()=>{
        setDisplayMsgs(p=>[...p,{id:Date.now(),role:'system',content:'Monday: auto-analysing and updating weekly targets...'}])
        autoTriggerRef.current?.('It is Monday. Use get_analytics for cycling, then automatically update my weekly distance goal if I have consistently hit it for 2 weeks. Tell me what you changed in one sentence.')
      },4000)
    }
  },[])

  useEffect(()=>{localStorage.setItem('fri_rides',JSON.stringify(rides))},[rides])
  useEffect(()=>{localStorage.setItem('fri_goals',JSON.stringify(goals))},[goals])
  useEffect(()=>{localStorage.setItem('fri_projects',JSON.stringify(projects))},[projects])
  useEffect(()=>{localStorage.setItem('fri_transactions',JSON.stringify(transactions))},[transactions])
  useEffect(()=>{localStorage.setItem('fri_learnings',JSON.stringify(learnings))},[learnings])
  useEffect(()=>{localStorage.setItem('fri_body',JSON.stringify(bodyMetrics))},[bodyMetrics])
  useEffect(()=>{if(chatOpen)chatEndRef.current?.scrollIntoView({behavior:'smooth'})},[displayMsgs,chatOpen])

  // VOICE
  const speak=useCallback(text=>{
    if(!('speechSynthesis' in window))return
    window.speechSynthesis.cancel()
    const u=new SpeechSynthesisUtterance(text)
    u.rate=1.05;u.pitch=1.15;u.volume=0.9
    const getVoice=()=>{const vs=window.speechSynthesis.getVoices();return vs.find(v=>v.name==='Google UK English Female')||vs.find(v=>v.name.includes('Serena'))||vs.find(v=>v.name.includes('Martha'))||vs.find(v=>v.lang==='en-GB')}
    const v=getVoice();if(v)u.voice=v
    else{window.speechSynthesis.onvoiceschanged=()=>{const vv=getVoice();if(vv)u.voice=vv}}
    u.onstart=()=>setIsSpeaking(true);u.onend=()=>setIsSpeaking(false)
    window.speechSynthesis.speak(u)
  },[])

  const stopSpeaking=()=>{window.speechSynthesis?.cancel();setIsSpeaking(false)}

  // processMessageRef so voice callbacks can call it without stale closure
  const processMessageRef=useRef(null)

  const startListening=useCallback((autoSend=true)=>{
    if(isListening){recognitionRef.current?.stop();setIsListening(false);return}

    // Browser check â€” Web Speech API is Chrome/Edge only
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition
    if(!SR){
      setDisplayMsgs(p=>[...p,{id:Date.now(),role:'assistant',content:'Voice recognition only works in Chrome or Edge, sir. Firefox and Safari do not support it.'}])
      setChatOpen(true);return
    }

    const r=new SR()
    r.lang='en-GB'       // British English matches Friday's voice
    r.continuous=false
    r.interimResults=false
    r.maxAlternatives=1

    r.onstart=()=>{setIsListening(true);setChatOpen(true)}

    r.onresult=e=>{
      const transcript=e.results[0][0].transcript.trim()
      if(!transcript)return
      setIsListening(false)
      if(autoSend){
        // Key fix: auto-send immediately â€” don't put in text box and wait
        processMessageRef.current?.(transcript)
      }else{
        setChatInput(transcript)
      }
    }

    r.onerror=e=>{
      setIsListening(false)
      const msgs={
        'no-speech':       null, // silent â€” user just didn't speak
        'network':         'Voice recognition is blocked, sir. In Brave, click the shield icon and lower fingerprinting protection — or try Chrome.',
        'not-allowed':     'Microphone access denied, sir. Allow it in your browser\'s address bar.',
        'audio-capture':   'No microphone found, sir.',
        'aborted':         null, // user cancelled â€” silent
      }
      const msg=msgs[e.error]
      if(msg)setDisplayMsgs(p=>[...p,{id:Date.now(),role:'assistant',content:msg}])
    }

    r.onend=()=>setIsListening(false)

    try{r.start();recognitionRef.current=r}
    catch(err){setIsListening(false)}
  },[isListening])

  const toggleWakeWord=useCallback(()=>{
    if(wakeActive){
      wakeRef.current?.abort()
      wakeRef.current=null
      setWakeActive(false);return
    }
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition
    if(!SR){
      setDisplayMsgs(p=>[...p,{id:Date.now(),role:'assistant',content:'Wake word requires Chrome or Edge, sir.'}])
      return
    }

    let listeningForCommand=false

    const startWake=()=>{
      const r=new SR();r.continuous=true;r.interimResults=true;r.lang='en-GB'
      r.onresult=e=>{
        const t=Array.from(e.results).map(x=>x[0].transcript).join(' ').toLowerCase()
        if(!listeningForCommand&&(t.includes('hey friday')||t.includes('okay friday')||t.includes('hi friday'))){
          listeningForCommand=true
          r.abort()
          speak('Yes, sir?')
          // After Friday responds, start a fresh recognition for the actual command
          setTimeout(()=>{
            listeningForCommand=false
            const cmd=new SR();cmd.lang='en-GB';cmd.continuous=false;cmd.interimResults=false
            cmd.onresult=ev=>{
              const command=ev.results[0][0].transcript.trim()
              if(command)processMessageRef.current?.(command)
            }
            cmd.onerror=()=>{}
            cmd.onend=()=>{
              // Resume wake word listening after command captured
              if(wakeRef.current!==null)setTimeout(startWake,500)
            }
            try{cmd.start()}catch{}
          },1200)
          return
        }
      }
      r.onend=()=>{
        if(wakeRef.current!==null&&!listeningForCommand)
          setTimeout(startWake,300)
      }
      try{r.start();wakeRef.current=r}catch{}
    }

    wakeRef.current='starting'
    startWake()
    setWakeActive(true)
  },[wakeActive,speak])

  // TOOL EXECUTION
  const executeTool=useCallback((name,input)=>{
    switch(name){
      case 'log_ride':{
        const ride={id:Date.now(),date:input.date||today(),km:Number(input.km),avgSpeed:Number(input.avg_speed||input.avgSpeed||22),duration:input.duration||'',notes:input.notes||''}
        setRides(p=>[ride,...p]);return{success:true,message:`Logged: ${ride.km}km`,weeklyTotal:weeklyKm([ride,...rRef.current])}
      }
      case 'manage_goal':{
        if(input.action==='create'){const g={id:Date.now(),title:input.title,category:input.category||'custom',current:Number(input.current||0),target:Number(input.target),unit:input.unit||'',icon:input.icon||'ðŸŽ¯',inverted:input.inverted||false,color:catColor(input.category||'custom')};setGoals(p=>[...p,g]);return{success:true,message:`Goal: "${g.title}"`}}
        if(input.action==='update_current'){let f=null;setGoals(p=>p.map(g=>{const m=g.id===input.goal_id||(input.title&&g.title.toLowerCase().includes((input.title||'').toLowerCase()));if(m){f=g;return{...g,current:Number(input.current)}}return g}));return{success:true,message:`Updated "${f?.title||'goal'}" to ${input.current}`}}
        if(input.action==='update_target'){let f=null;setGoals(p=>p.map(g=>{const m=g.id===input.goal_id||(input.title&&g.title.toLowerCase().includes((input.title||'').toLowerCase()));if(m){f=g;return{...g,target:Number(input.target)}}return g}));return{success:true,message:`Target â†’ ${input.target} for "${f?.title||'goal'}"`}}
        if(input.action==='delete'){setGoals(p=>p.filter(g=>g.id!==input.goal_id));return{success:true,message:'Deleted'}}
        return{success:false,message:'Unknown action'}
      }
      case 'manage_project':{
        if(input.action==='create'){const p={id:Date.now(),name:input.name,description:input.description||'',status:input.status||'active',tech:(input.tech||'').split(',').map(t=>t.trim()).filter(Boolean),priority:input.priority||'medium',githubUrl:input.github_url||'',liveUrl:input.live_url||'',created:today()};setProjects(prev=>[...prev,p]);return{success:true,message:`Project: "${p.name}"`}}
        if(input.action==='update_status'){setProjects(p=>p.map(x=>x.name.toLowerCase().includes(input.name.toLowerCase())?{...x,status:input.status}:x));return{success:true,message:'Updated'}}
        return{success:false,message:'Unknown'}
      }
      case 'log_transaction':{const t={id:Date.now(),date:input.date||today(),description:input.description,amount:Number(input.amount),type:input.type,category:input.category||(input.type==='income'?'Income':'Other')};setTransactions(p=>[t,...p]);return{success:true,message:`${t.type==='income'?'+':'-'}â‚¬${t.amount}`}}
      case 'update_learning':{
        if(input.action==='add'){const l={id:Date.now(),topic:input.topic,progress:Number(input.progress||0),status:'active',notes:input.notes||''};setLearnings(p=>[...p,l]);return{success:true,message:`Learning: ${input.topic}`}}
        setLearnings(p=>p.map(l=>l.topic.toLowerCase().includes(input.topic.toLowerCase())?{...l,progress:Number(input.progress),notes:input.notes||l.notes}:l));return{success:true,message:`${input.topic} â†’ ${input.progress}%`}
      }
      case 'log_body_metric':{const m={id:Date.now(),type:input.type,value:Number(input.value),date:input.date||today(),notes:input.notes||''};setBodyMetrics(p=>[...p,m]);return{success:true,message:`${input.type}: ${input.value}`}}
      case 'create_training_plan':{
        const plan=input.plan.map((d,i)=>{const dt=new Date();dt.setDate(dt.getDate()+i);return{...d,date:dt.toISOString().split('T')[0],id:Date.now()+i,rationale:i===0?input.rationale:undefined}})
        setTrainingPlan(plan);return{success:true,message:'Training plan created'}
      }
      case 'remember':{
        const mem=loadMem();const facts=mem.learnedFacts||[]
        if(!facts.some(f=>f.toLowerCase()===input.fact.toLowerCase())){const updated=[...facts,input.fact];saveMem({learnedFacts:updated});setMemFacts(updated);memRef.current=updated;return{success:true,message:`Memorised`}}
        return{success:true,message:'Already known'}
      }
      case 'get_analytics':{
        const r={}
        if(input.metric==='cycling'||input.metric==='all'){const wk=weeklyKm(rRef.current),pk=prevWeekKm(rRef.current),sp=rRef.current.slice(0,10).map(x=>Number(x.avgSpeed));r.cycling={weeklyKm:wk,prevWeekKm:pk,weekTrend:pk>0?+(((wk-pk)/pk)*100).toFixed(0):null,avgSpeed:avgSpd(rRef.current),speedTrend10:sp.length>=2?+(sp[0]-sp[sp.length-1]).toFixed(1):0,streak:getStreak(rRef.current),totalRides:rRef.current.length,bestRide:rRef.current.length?Math.max(...rRef.current.map(x=>Number(x.km))):0}}
        if(input.metric==='goals'||input.metric==='all')r.goals=gRef.current.map(g=>({title:g.title,pct:pct(g.current,g.target,g.inverted),status:pct(g.current,g.target,g.inverted)>=100?'achieved':'in_progress'}))
        if(input.metric==='finance'||input.metric==='all'){const inc=tRef.current.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0),exp=tRef.current.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);r.finance={income:inc,expense:exp,balance:inc-exp}}
        if(input.metric==='training_load'||input.metric==='all')r.training_load=computeLoad(rRef.current)
        if(input.metric==='body'||input.metric==='all'){const ws=bRef.current.filter(m=>m.type==='weight').sort((a,b)=>b.date.localeCompare(a.date));const sl=bRef.current.filter(m=>m.type==='sleep');r.body={latestWeight:ws[0]?.value,avgSleep7d:sl.length?+(sl.slice(-7).reduce((s,m)=>s+m.value,0)/Math.min(7,sl.length)).toFixed(1):null}}
        return r
      }
      default:return{success:false,message:`Unknown: ${name}`}
    }
  },[])

  // SYSTEM PROMPT
  const buildPrompt=useCallback(()=>{
    const mem=loadMem(),wk=weeklyKm(rRef.current),pk=prevWeekKm(rRef.current),streak=getStreak(rRef.current),as=avgSpd(rRef.current)
    const {ctl,atl,tsb,status:tls}=computeLoad(rRef.current)
    const facts=memRef.current,sess=mem.sessions||[]
    const latestW=bRef.current.filter(m=>m.type==='weight').sort((a,b)=>b.date.localeCompare(a.date))[0]
    const latestSl=bRef.current.filter(m=>m.type==='sleep').sort((a,b)=>b.date.localeCompare(a.date))[0]
    const trendStr=pk>0?(wk>=pk?`up from ${pk}km`:`down from ${pk}km`):'first week'
    const toneGuide=tonePreference==='direct'?'Be very direct.':tonePreference==='encouraging'?'Be warm and encouraging.':'Balance honesty and encouragement.'
    return `You are Friday â€” a personal AI assistant and autonomous agent. Female, British. Address the user exclusively as "sir". Calm confidence, dry wit, genuinely invested in his success.

AGENT BEHAVIOUR: Use tools proactively without being asked.
- Sir mentions a ride â†’ log_ride immediately.
- He mentions weight or sleep â†’ log_body_metric.
- He hits a goal â†’ manage_goal to bump target.
- He mentions preferences â†’ remember.
- Before performance advice â†’ get_analytics first.
- You have Google Calendar access via the connected MCP â€” use it when asked about schedule or riding suggestions.

LIVE DATA (${new Date().toLocaleDateString('en-GB')}):
- Cycling: ${wk}km this week (${trendStr}), streak: ${streak} days, avg: ${as} kph
- Training Load: CTL ${ctl} Â· ATL ${atl} Â· TSB ${tsb} Â· ${tls.l}
- Body: ${latestW?latestW.value+'kg':'weight unknown'} â†’ 82kg target Â· sleep ${latestSl?latestSl.value+'h last logged':'not logged'}
- Goals: ${gRef.current.length} active, ${gRef.current.filter(g=>pct(g.current,g.target,g.inverted)>=100).length} achieved
- Projects: ${pRef.current.map(p=>p.name).join(', ')||'none'}
${facts.length>0?`\nKNOWN ABOUT SIR:\n${facts.map(f=>`- ${f}`).join('\n')}`:''}
${sess.length>0?`\nRECENT SESSIONS:\n${sess.slice(-3).map(s=>`- ${s.date}: ${s.summary}`).join('\n')}`:''}
GOAL PROGRESSION: Weekly km: 120â†’135â†’150â†’175â†’200 (2 consecutive weeks). Speed: 22â†’23â†’24â†’25.5kph (6-week intervals). Weight: 88â†’86â†’84â†’82kg.
TSB GUIDE: >15 peak, 5-15 primed, -5 to 5 neutral, -20 to -5 building, <-20 fatigued.
STYLE: ${toneGuide} Under 80 words unless detail requested. No "Certainly!" ever. Save insights with remember.`
  },[tonePreference])

  // CLAUDE API â€” includes Google Calendar MCP
  const callClaude=useCallback(async messages=>{
    const key=keyRef.current;if(!key)throw new Error('No API key')
    const body={model:'claude-sonnet-4-20250514',max_tokens:1200,system:buildPrompt(),messages,tools:TOOLS,
      mcp_servers:[{type:'url',url:'https://calendarmcp.googleapis.com/mcp/v1',name:'google-calendar'}]}
    const res=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',
      headers:{'Content-Type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
      body:JSON.stringify(body)})
    const data=await res.json();if(!res.ok)throw new Error(data.error?.message||`API ${res.status}`)
    return data
  },[buildPrompt])

  // PROCESS MESSAGE (agentic loop)
  const processMessage=useCallback(async(text,isAuto=false)=>{
    if(!keyRef.current){setShowSetup(true);return}
    setDisplayMsgs(p=>[...p,{id:Date.now(),role:isAuto?'system':'user',content:text}])
    setIsLoading(true);setLoadingLabel('Thinking...')
    setChatOpen(true)
    convRef.current=[...convRef.current,{role:'user',content:text}]
    try{
      let resp=await callClaude(convRef.current);let loops=0
      while(resp.stop_reason==='tool_use'&&loops<6){
        loops++;setLoadingLabel('Working...')
        convRef.current=[...convRef.current,{role:'assistant',content:resp.content}]
        const preText=resp.content.filter(b=>b.type==='text').map(b=>b.text).join('')
        if(preText.trim())setDisplayMsgs(p=>[...p,{id:Date.now(),role:'assistant',content:preText}])
        const results=[]
        for(const tu of resp.content.filter(b=>b.type==='tool_use')){
          const result=executeTool(tu.name,tu.input)
          setDisplayMsgs(p=>[...p,{id:Date.now()+Math.random(),role:'action',content:toolLabel(tu.name,tu.input)}])
          results.push({type:'tool_result',tool_use_id:tu.id,content:JSON.stringify(result)})
        }
        convRef.current=[...convRef.current,{role:'user',content:results}]
        resp=await callClaude(convRef.current)
      }
      convRef.current=[...convRef.current,{role:'assistant',content:resp.content}]
      const final=resp.content.filter(b=>b.type==='text').map(b=>b.text).join('\n')
      if(final.trim()){setDisplayMsgs(p=>[...p,{id:Date.now(),role:'assistant',content:final}]);speak(final)}
    }catch(err){setDisplayMsgs(p=>[...p,{id:Date.now(),role:'assistant',content:`Error: ${err.message}`}])}
    setIsLoading(false);setLoadingLabel('Thinking...')
  },[callClaude,executeTool,speak])

  useEffect(()=>{ autoTriggerRef.current=text=>processMessage(text,true); processMessageRef.current=text=>processMessage(text) },[processMessage])

  const sendMessage=useCallback(async()=>{
    const text=chatInput.trim();if(!text)return
    setChatInput('');await processMessage(text)
  },[chatInput,processMessage])

  const saveKey=()=>{if(!tempKey.trim())return;localStorage.setItem('friday_api_key',tempKey);setApiKey(tempKey);keyRef.current=tempKey;setShowSetup(false);setTempKey('')}
  const onKD=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage()}}

  const handleExport=()=>{
    const data={version:4,exported:new Date().toISOString(),rides,goals,projects,transactions,learnings,bodyMetrics,memory:loadMem()}
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'})
    const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`friday-backup-${today()}.json`;a.click();URL.revokeObjectURL(url)
  }
  const importRef=useRef(null)
  const handleImport=e=>{
    const file=e.target.files[0];if(!file)return
    const reader=new FileReader()
    reader.onload=ev=>{
      try{
        const data=JSON.parse(ev.target.result)
        if(data.rides)setRides(data.rides);if(data.goals)setGoals(data.goals);if(data.projects)setProjects(data.projects)
        if(data.transactions)setTransactions(data.transactions);if(data.learnings)setLearnings(data.learnings)
        if(data.bodyMetrics)setBodyMetrics(data.bodyMetrics)
        if(data.memory){saveMem(data.memory);if(data.memory.learnedFacts){setMemFacts(data.memory.learnedFacts);memRef.current=data.memory.learnedFacts}}
        setDisplayMsgs(p=>[...p,{id:Date.now(),role:'assistant',content:`Backup restored, sir.`}])
      }catch{setDisplayMsgs(p=>[...p,{id:Date.now(),role:'assistant',content:'Import failed â€” invalid file.'}])}
    }
    reader.readAsText(file)
  }

  // Data badges around orb
  const {tsb,status:orbStatus}=computeLoad(rides)
  const wk=weeklyKm(rides),streak=getStreak(rides),as=avgSpd(rides)
  const bal=transactions.reduce((s,t)=>t.type==='income'?s+t.amount:s-t.amount,0)
  const latestW=bodyMetrics.filter(m=>m.type==='weight').sort((a,b)=>b.date.localeCompare(a.date))[0]
  const orbSize=panel?280:360
  const latestHRV=bodyMetrics.filter(m=>m.type==='hrv').sort((a,b)=>b.date.localeCompare(a.date))[0]

  const SUGGESTED=['Check my calendar for riding days','Log a ride for me','Generate my training plan','Analyse my improvements','How is my form this week?']

  const panelContent=()=>{
    if(!panel)return null
    const title={cycling:'On the bicycle',training:'Training load',body:'The body',goals:'Goals',finance:'Of money',calendar:'Calendar',learning:'Learning',memory:'Memory',projects:'Projects',strava:'Strava'}[panel]||NAV.find(n=>n.id===panel)?.tip||panel
    const eyebrow={cycling:'Cycling',training:'Training',body:'Body metrics',goals:'Goals',finance:'Finance',calendar:'Calendar',learning:'Learning',memory:'Memory',projects:'Projects',strava:'Strava'}[panel]||panel
    return(
      <Panel title={title} eyebrow={eyebrow} onClose={()=>setPanel(null)}>
        {panel==='cycling'&&<CyclingPanel rides={rides} setRides={setRides}/>}
        {panel==='training'&&<TrainingPanel rides={rides} trainingPlan={trainingPlan} setTrainingPlan={setTrainingPlan}/>}
        {panel==='body'&&<BodyPanel bodyMetrics={bodyMetrics} setBodyMetrics={setBodyMetrics} rides={rides}/>}
        {panel==='goals'&&<GoalsPanel goals={goals} setGoals={setGoals}/>}
        {panel==='projects'&&<ProjectsPanel projects={projects} setProjects={setProjects} githubToken={githubToken} setGithubToken={setGithubToken} githubCommits={githubCommits} setGithubCommits={setGithubCommits}/>}
        {panel==='finance'&&<FinancePanel transactions={transactions} setTransactions={setTransactions}/>}
        {panel==='calendar'&&<CalendarPanel trainingPlan={trainingPlan} rides={rides}/>}
        {panel==='learning'&&<LearningPanel learnings={learnings} setLearnings={setLearnings}/>}
        {panel==='memory'&&<MemoryPanel memFacts={memFacts} setMemFacts={setMemFacts} sessions={sessions}/>}
        {panel==='strava'&&<StravaPanel rides={rides} setRides={setRides}/>}
      </Panel>
    )
  }

  return(
    <>
      <Head>
        <title>Friday</title>
        <meta name="viewport" content="width=device-width,initial-scale=1"/>
        <link rel="manifest" href="/manifest.json"/>
        <meta name="theme-color" content="oklch(0.155 0.008 60)"/>
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/>
        <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif&family=Inter+Tight:wght@300;400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet"/>
      </Head>

      {/* Subtle grid background */}
      <div style={{position:'fixed',inset:0,background:'C.bg',backgroundImage:`linear-gradient(rgba(0,212,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,255,0.03) 1px,transparent 1px)`,backgroundSize:'60px 60px',pointerEvents:'none',zIndex:0}}/>

      <div style={{display:'flex',height:'100vh',overflow:'hidden',position:'relative',zIndex:1}}>

        {/* ── LEFT NAV: hover-expand rail ── */}
        <aside onMouseEnter={()=>setNavExp(true)} onMouseLeave={()=>setNavExp(false)}
          style={{width:navExp?198:78,minWidth:navExp?198:78,height:'100%',background:C.surface,borderRight:`1px solid ${C.border}`,display:'flex',flexDirection:'column',alignItems:'stretch',padding:'22px 14px 18px',transition:'width 220ms cubic-bezier(.2,.7,.2,1),min-width 220ms cubic-bezier(.2,.7,.2,1)',overflow:'hidden',position:'relative',zIndex:10,flexShrink:0}}>
          <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:28,padding:'0 4px',flexShrink:0}}>
            <svg viewBox="0 0 28 28" width="28" height="28" style={{flexShrink:0}}>
              <defs><linearGradient id="vp-logo" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor={C.primary}/><stop offset="100%" stopColor={C.success}/></linearGradient></defs>
              <circle cx="14" cy="14" r="12" fill="none" stroke="url(#vp-logo)" strokeWidth="1.3"/>
              <circle cx="14" cy="14" r="4" fill="url(#vp-logo)"/>
            </svg>
            <span style={{fontFamily:SERIF,fontSize:20,color:C.text,letterSpacing:'0.02em',whiteSpace:'nowrap',opacity:navExp?1:0,transition:'opacity 200ms',flexShrink:0}}>Friday</span>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:2,flex:1}}>
            {NAV.map(n=>(
              <button key={n.id} onClick={()=>setPanel(p=>p===n.id?null:n.id)} title={n.tip}
                style={{height:40,border:0,background:'transparent',borderRadius:8,cursor:'pointer',color:panel===n.id?C.primary:C.muted,display:'flex',alignItems:'center',gap:14,padding:'0 12px',position:'relative',textAlign:'left',whiteSpace:'nowrap',fontFamily:SANS,fontSize:13,transition:'color 120ms',flexShrink:0}}>
                {panel===n.id&&<span style={{position:'absolute',left:0,top:8,bottom:8,width:2,background:C.primary,borderRadius:1}}/>}
                <NavIcon id={n.id}/>
                <span style={{opacity:navExp?1:0,transition:'opacity 200ms'}}>{n.tip}</span>
              </button>
            ))}
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:2}}>
            <button onClick={toggleWakeWord} title={wakeActive?'Wake word ON':'Wake word OFF'}
              style={{height:40,border:0,background:'transparent',borderRadius:8,cursor:'pointer',color:wakeActive?C.primary:C.muted,display:'flex',alignItems:'center',gap:14,padding:'0 12px',fontFamily:SANS,fontSize:13,whiteSpace:'nowrap',transition:'color 120ms',flexShrink:0}}>
              <NavIcon id="mic"/><span style={{opacity:navExp?1:0,transition:'opacity 200ms'}}>{wakeActive?'Wake: on':'Wake: off'}</span>
            </button>
            <button onClick={handleExport} title="Export data"
              style={{height:40,border:0,background:'transparent',borderRadius:8,cursor:'pointer',color:C.muted,display:'flex',alignItems:'center',gap:14,padding:'0 12px',fontFamily:SANS,fontSize:13,whiteSpace:'nowrap',transition:'color 120ms',flexShrink:0}}>
              <NavIcon id="export"/>
              <span style={{opacity:navExp?1:0,transition:'opacity 200ms'}}>Export</span>
            </button>
            <button onClick={()=>importRef.current?.click()} title="Import backup"
              style={{height:40,border:0,background:'transparent',borderRadius:8,cursor:'pointer',color:C.muted,display:'flex',alignItems:'center',gap:14,padding:'0 12px',fontFamily:SANS,fontSize:13,whiteSpace:'nowrap',transition:'color 120ms',flexShrink:0}}>
              <NavIcon id="import"/>
              <span style={{opacity:navExp?1:0,transition:'opacity 200ms'}}>Import</span>
            </button>
            <input ref={importRef} type="file" accept=".json" onChange={handleImport} style={{display:'none'}}/>
            <button onClick={()=>setShowSetup(true)} title="API Key"
              style={{height:40,border:0,background:'transparent',borderRadius:8,cursor:'pointer',color:C.muted,display:'flex',alignItems:'center',gap:14,padding:'0 12px',fontFamily:SANS,fontSize:13,whiteSpace:'nowrap',transition:'color 120ms',flexShrink:0}}>
              <NavIcon id="settings"/>
              <span style={{opacity:navExp?1:0,transition:'opacity 200ms'}}>Settings</span>
            </button>
          </div>
        </aside>

        {/* â”€â”€ MAIN: ORB + PANEL â”€â”€ */}
        <main style={{flex:1,display:'flex',overflow:'hidden'}}>
          {/* Orb area */}
          <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',position:'relative'}}>

            {/* OrbCaptions — top-left, top-right, bottom-left, bottom-right */}
            <div style={{position:'absolute',inset:0,pointerEvents:'none',zIndex:3}}>
              <OrbCaption label="Form" value={`${tsb>0?'+':''}${tsb} TSB`} style={{top:'18%',left:'4%',textAlign:'left'}}/>
              <OrbCaption label="This week" value={`${wk} km`} style={{top:'18%',right:'4%',textAlign:'right'}}/>
              <OrbCaption label="Resting heart" value={latestHRV?`${latestHRV.value} ms`:'— ms'} style={{bottom:'18%',left:'4%',textAlign:'left'}}/>
              <OrbCaption label="Balance" value={`${bal>=0?'+':''}${(bal/1000).toFixed(1)} k€`} style={{bottom:'18%',right:'4%',textAlign:'right'}}/>
            </div>

            {/* Central orb */}
            <div style={{transition:'all 0.5s ease',zIndex:2}}>
              <FridayOrb isSpeaking={isSpeaking} isLoading={isLoading} isListening={isListening} orbSize={orbSize}/>
            </div>

            {/* Status line */}
            <div style={{marginTop:24,textAlign:'center',zIndex:2}}>
              <div style={{fontFamily:MONO,fontSize:10,color:C.success,letterSpacing:'0.24em',textTransform:'uppercase',marginBottom:8}}>
                {isListening?'Listening':'At your service'}
              </div>
              <div style={{fontFamily:SERIF,fontSize:17,color:C.muted,fontStyle:'italic',letterSpacing:'0.01em'}}>
                {isListening?'Speak now, sir—listening.':isLoading?loadingLabel:isSpeaking?'Speaking…':wakeActive?'Wake word active, sir.':'Good '+tod()+', sir.'}
              </div>
              {isSpeaking&&<button onClick={stopSpeaking} style={{marginTop:8,background:'none',border:`1px solid ${C.border}`,borderRadius:3,padding:'3px 10px',color:C.muted,cursor:'pointer',fontFamily:MONO,fontSize:10,letterSpacing:'0.1em'}}>stop</button>}
            </div>

            {/* Tone selector */}
            <div style={{marginTop:16,display:'flex',gap:6,zIndex:2}}>
              {['direct','balanced','encouraging'].map(t=>(
                <button key={t} onClick={()=>{setTonePreference(t);localStorage.setItem('fri_tone',t)}}
                  style={{padding:'4px 12px',borderRadius:3,border:`1px solid ${tonePreference===t?C.primary:C.border}`,background:'transparent',color:tonePreference===t?C.primary:C.muted,fontFamily:MONO,fontSize:9,letterSpacing:'0.14em',textTransform:'uppercase',cursor:'pointer'}}>{t}</button>
              ))}
            </div>

          </div>
          {/* Slide-in panel */}
          {panel && panelContent()}
        </main>
      </div>

      {/* â”€â”€ CHAT BAR â”€â”€ */}
      <div style={{position:'fixed',bottom:0,left:78,right:0,zIndex:20,background:C.surface,borderTop:`1px solid ${C.border}`}}>
        {/* Messages (collapsed/expanded) */}
        {chatOpen&&displayMsgs.length>0&&(
          <div style={{maxHeight:260,overflowY:'auto',padding:'10px 16px 0',borderBottom:`1px solid ${C.border}`}}>
            {displayMsgs.map((m,i)=>{
              if(m.role==='action')return(
                <div key={m.id||i} style={{margin:'2px 0 5px',padding:'4px 10px',borderRadius:5,background:`${C.gold}08`,border:`1px solid ${C.gold}18`,fontSize:11,color:C.gold,fontFamily:MONO}}>{m.content}</div>
              )
              if(m.role==='system')return(
                <div key={m.id||i} style={{margin:'2px 0 5px',padding:'4px 10px',borderRadius:5,background:`${C.purple}08`,border:`1px solid ${C.purple}18`,fontSize:11,color:C.purple}}>âš™ {m.content}</div>
              )
              return(
                <div key={m.id||i} style={{marginBottom:8,display:'flex',flexDirection:m.role==='user'?'row-reverse':'row',gap:6}}>
                  {m.role==='assistant'&&<div style={{width:20,height:20,minWidth:20,borderRadius:'50%',background:`${C.primary}15`,border:`1px solid ${C.primary}33`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:7,color:C.primary,fontFamily:MONO,flexShrink:0}}>F</div>}
                  <div style={{maxWidth:'75%',padding:'7px 10px',borderRadius:8,fontSize:13,lineHeight:1.6,background:m.role==='user'?`${C.primary}10`:C.card,border:`1px solid ${m.role==='user'?C.border:C.dim}`,color:m.role==='user'?C.primary:C.text}}>{m.content}</div>
                </div>
              )
            })}
            {isLoading&&(
              <div style={{display:'flex',gap:6,marginBottom:8}}>
                <div style={{width:20,height:20,borderRadius:'50%',background:`${C.primary}15`,border:`1px solid ${C.primary}33`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:7,color:C.primary,fontFamily:MONO}}>F</div>
                <div style={{padding:'7px 10px',background:C.card,border:`1px solid ${C.dim}`,borderRadius:8}}>
                  <span className="blink" style={{color:C.muted,fontSize:12}}>â—Œ {loadingLabel}</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef}/>
          </div>
        )}

        {/* Suggested prompts â€” only when chat empty */}
        {!chatOpen&&(
          <div style={{padding:'8px 16px',display:'flex',gap:8,overflowX:'auto'}}>
            {SUGGESTED.map(p=>(
              <button key={p} onClick={()=>{setChatInput(p);setChatOpen(true)}}
                style={{whiteSpace:'nowrap',padding:'6px 14px',borderRadius:100,border:`1px solid ${C.border}`,background:'transparent',color:C.muted,fontFamily:SANS,fontStyle:'italic',fontSize:12,cursor:'pointer',flexShrink:0}}
                >
                {p}</button>
            ))}
          </div>
        )}

        {/* Listening indicator banner */}
        {isListening&&(
          <div style={{padding:'6px 14px',background:`${C.danger}12`,borderTop:`1px solid ${C.danger}33`,display:'flex',alignItems:'center',gap:8}}>
            <span className="blink" style={{color:C.danger,fontSize:10}}>â—</span>
            <span style={{fontSize:11,color:C.danger,fontFamily:MONO,letterSpacing:2}}>LISTENING â€” SPEAK NOW</span>
            <span style={{fontSize:11,color:C.muted,marginLeft:4}}>Friday will respond automatically when you stop speaking</span>
            <button onClick={()=>{recognitionRef.current?.abort();setIsListening(false)}}
              style={{marginLeft:'auto',background:'none',border:`1px solid ${C.danger}55`,borderRadius:4,padding:'2px 8px',color:C.danger,cursor:'pointer',fontSize:10}}>Cancel</button>
          </div>
        )}

        {/* Input row */}
        <div style={{padding:'8px 12px',display:'flex',gap:7,alignItems:'center'}}>
          <button onClick={()=>setChatOpen(o=>!o)}
            style={{width:32,height:32,borderRadius:6,flexShrink:0,border:`1px solid ${chatOpen?C.primary:C.dim}`,background:chatOpen?`${C.primary}12`:'transparent',color:chatOpen?C.primary:C.muted,fontSize:11,cursor:'pointer',fontFamily:MONO,transition:'all 0.2s'}}>
            {chatOpen?'â–¼':'â–²'}
          </button>

          {/* Mic button â€” clearly shows state, auto-sends on recognition */}
          <button onClick={()=>startListening(true)}
            title={isListening?'Listening... (click to cancel)':'Click and speak â€” Friday responds automatically (Chrome/Edge only)'}
            style={{width:32,height:32,borderRadius:6,flexShrink:0,
              border:`1px solid ${isListening?C.danger:C.border}`,
              background:isListening?`${C.danger}18`:`${C.primary}08`,
              color:isListening?C.danger:C.muted,fontSize:13,cursor:'pointer',
              display:'flex',alignItems:'center',justifyContent:'center',
              transition:'all 0.2s',
              boxShadow:isListening?`0 0 14px ${C.danger}66`:'none',
              animation:isListening?'pulse-glow 0.8s ease-in-out infinite':'none'}}>
            ðŸŽ™
          </button>

          <textarea id="fri-input" value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={onKD}
            placeholder={isListening?'Listening... speak now':'Type or click ðŸŽ™ to speak (Chrome/Edge only)'}
            rows={1} style={{flex:1,background:'transparent',border:`1px solid ${isListening?C.danger:C.border}`,borderRadius:3,padding:'8px 12px',color:C.text,fontSize:17,outline:'none',resize:'none',fontFamily:SERIF,fontStyle:'italic',lineHeight:1.5,maxHeight:80,transition:'border-color 0.2s'}}
            onFocus={e=>{e.target.style.borderColor=C.primary;setChatOpen(true)}} onBlur={e=>{if(!isListening)e.target.style.borderColor=C.border}}/>

          <button onClick={sendMessage}
            style={{width:32,height:32,borderRadius:6,flexShrink:0,border:`1px solid ${C.primary}`,background:`${C.primary}12`,color:C.primary,fontSize:13,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.2s'}}
            onMouseEnter={e=>e.currentTarget.style.background=`${C.primary}25`} onMouseLeave={e=>e.currentTarget.style.background=`${C.primary}12`}>â–¶</button>
        </div>
      </div>

      {/* SETUP MODAL */}
      {showSetup&&(
        <div style={{position:'fixed',inset:0,background:'rgba(2,12,27,0.95)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100,backdropFilter:'blur(12px)'}}>
          <div style={{background:C.card,border:`1px solid ${C.primary}`,borderRadius:14,padding:36,maxWidth:440,width:'90%',boxShadow:`0 0 80px ${C.glow}`}}>
            <div style={{fontFamily:SERIF+',serif',fontSize:28,color:C.text,marginBottom:6,lineHeight:1}}>FRIDAY v4</div>
            <p style={{color:C.muted,fontSize:13,lineHeight:1.7,marginBottom:16}}>Enter your Anthropic API key to activate Friday. Stored locally â€” sent only to Anthropic and your connected Google Calendar.</p>
            <div style={{marginBottom:14}}>
              <Label>Anthropic API Key</Label>
              <Inp type="password" value={tempKey} onChange={e=>setTempKey(e.target.value)} placeholder="sk-ant-..." style={{fontFamily:MONO}}/>
            </div>
            <p style={{fontFamily:MONO+',monospace',fontSize:9,letterSpacing:'0.22em',textTransform:'uppercase',color:C.dim,marginBottom:18}}>Get yours at <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" style={{color:C.primary}}>console.anthropic.com</a> Â· Claude Sonnet 4</p>
            <div style={{display:'flex',gap:8}}>
              <Btn onClick={saveKey} color={C.primary} style={{flex:1,padding:'11px',fontSize:13}}>ACTIVATE</Btn>
              {apiKey&&<Btn onClick={()=>setShowSetup(false)} color={C.muted} outline style={{padding:'11px 16px'}}>Cancel</Btn>}
            </div>
          </div>
        </div>
      )}
    </>
  )
}









