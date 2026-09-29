import React,{useEffect,useState}from'react';
import{AreaChart,Area,XAxis,YAxis,CartesianGrid,Tooltip,ResponsiveContainer}from'recharts';

const now=()=>new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'});
const fresh=t=>!!t&&(Date.now()-new Date(t).getTime()<10000);

function Gauge({value,max=100,unit,label,accent='cyan',available=true}){if(!available||value==null||!Number.isFinite(Number(value)))return <div className={'gauge '+accent+' unavailable'}><div className="gauge-ring"><div><b>--</b><small>{unit}</small></div></div><strong>NO DATA</strong><div className="gauge-scale"><span>0{unit==='°C'?'°':''}</span><span>100{unit==='%'?'%':''}</span></div></div>;const n=Number(value),p=Math.max(0,Math.min(100,n/max*100));return <div className={'gauge '+accent}><div className="gauge-ring" style={{'--p':p+'%'}}><div><b>{Number.isInteger(n)?n:n.toFixed(1)}</b><small>{unit}</small></div></div><strong>{label}</strong><div className="gauge-scale"><span>0{unit==='°C'?'°':''}</span><span>{max}{unit==='%'?'%':''}</span></div></div>}

function StatusDot({ok}){return <span className={'status-dot '+(ok?'on':'off')}/>}

export default function App(){
 const[latest,setLatest]=useState({temperature:null,humidity:null,mq3:null,mq7:null,pir:null,ir:null,buzzer:null,fan:null,lastDeviceUpdate:null});
 const[connected,setConnected]=useState(false),[history,setHistory]=useState([]),[alerts,setAlerts]=useState([]),[events,setEvents]=useState([]),[threshold,setThreshold]=useState(35),[autoFan,setAutoFan]=useState(true),[tab,setTab]=useState('overview'),[apiMs,setApiMs]=useState(null);
 const poll=async()=>{const s0=performance.now();try{const r=await fetch('/api/status',{cache:'no-store'});if(!r.ok)throw Error();const s=await r.json();setApiMs(Math.round(performance.now()-s0));setLatest(s);const on=fresh(s.lastDeviceUpdate);setConnected(on);if(on&&s.temperature!=null)setHistory(h=>[...h.slice(-59),{time:now(),temp:Number(s.temperature),hum:Number(s.humidity||0)}]);}catch{setConnected(false)}};
 useEffect(()=>{poll();const id=setInterval(poll,2000);return()=>clearInterval(id)},[]);
 const t=Number(latest.temperature),high=connected&&t>=threshold,gas=connected&&Number(latest.mq3)>=50,co=connected&&Number(latest.mq7)>=50;
 const warning=high||latest.pir===true||latest.ir===true,critical=gas||co,status=!connected?'OFFLINE':critical?'CRITICAL':warning?'WARNING':'SAFE';
 const score=!connected?null:Math.max(0,100-(gas?35:0)-(co?35:0)-(high?15:0)-(latest.pir?10:0)-(latest.ir?5:0));
 const add=(event,value,level='NORMAL')=>{setEvents(e=>[{time:now(),event,value,level},...e].slice(0,30));setAlerts(a=>[{time:now(),text:event+' '+value,type:level},...a].slice(0,30))};
 const test=async(field)=>{const v=!latest[field];await fetch('/api/status',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({[field]:v,source:'dashboard-test'})});add(field.toUpperCase(),'TEST '+(v?'TRIGGERED':'CLEARED'),v?'WARNING':'NORMAL');poll()};
 const command=async(value)=>{await fetch('/api/status',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({fan:value,source:'dashboard-command'})});add('FAN',value?'ON':'OFF','NORMAL');poll()};
 useEffect(()=>{if(connected&&latest.pir)add('PIR','MOTION','WARNING')},[latest.pir,connected]);
 useEffect(()=>{if(connected&&latest.ir)add('IR','OBJECT','WARNING')},[latest.ir,connected]);
 useEffect(()=>{if(gas)add('MQ-3','GAS DETECTED','CRITICAL')},[gas]);
 useEffect(()=>{if(co)add('MQ-7','CO DETECTED','CRITICAL')},[co]);

 return <div className="app">
  <aside className="sidebar">
   <div className="side-brand"><span className="side-logo">⬡</span><div><b>SMART CABIN</b><strong>SAFETY</strong></div></div>
   <nav>
    <button className={tab==='overview'?'active':''} onClick={()=>setTab('overview')}>⌂ <span>Live Monitoring</span></button>
    <button className={tab==='events'?'active':''} onClick={()=>setTab('events')}>◉ <span>Alerts</span>{alerts.length>0&&<em>{Math.min(alerts.length,9)}</em>}</button>
    <button className="nav-disabled">◷ <span>History</span></button>
    <button className={tab==='events'?'active':''} onClick={()=>setTab('events')}>▤ <span>Logs</span></button>
    <button className={tab==='tests'?'active':''} onClick={()=>setTab('tests')}>⚗ <span>Hardware Test</span></button>
    <button className="nav-disabled">⚙ <span>Settings</span></button>
   </nav>
   <div className="side-bottom"><b>SMART CABIN SAFETY v2.0</b><span>Advanced IoT Safety Monitoring System</span></div>
  </aside>

  <div className="workspace">
   <header className="topbar">
    <div className="mobile-title">Smart Cabin Safety</div>
    <div className="top-device"><StatusDot ok={connected}/><div><b>ESP8266</b><small>{connected?'Online':'Offline'}</small></div></div>
    <div className="top-device"><span className="cloud">☁</span><div><b>Cloud</b><small>{connected?'Connected':'Waiting'}</small></div></div>
    <div className="top-time"><b>{new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}</b><span>{now()}</span></div>
   </header>

   <main>
    <div className="hero-heading"><div><h1>Smart Cabin Safety</h1><p>Safer Rides <i>+</i> Smarter Monitoring <i>+</i> Real-Time Protection</p></div><div className="hero-live"><StatusDot ok={connected}/>{connected?'LIVE MONITORING':'WAITING FOR DEVICE'}</div></div>

    {tab==='overview'&&<>
     <section className="dashboard-top">
      <div className="panel temp-panel"><div className="panel-title"><span>🌡 Temperature</span><small>°C</small></div><Gauge value={latest.temperature} max={50} unit="°C" label={high?'HIGH':'NORMAL'} accent="cyan" available={connected}/><div className="gauge-note"><span>-10°</span><b>{connected&&latest.temperature!=null?Number(latest.temperature).toFixed(1)+'°C':'--'}</b><span>50°</span></div></div>

      <div className="panel cabin-panel">
       <div className="cabin-status"><div><small>CABIN SAFETY STATUS</small><h2 className={status.toLowerCase()}>{status}</h2><span>{status==='SAFE'?'All monitored conditions are normal':status==='OFFLINE'?'Connect NodeMCU V3 to start live monitoring':critical?'Immediate attention required':'Safety condition detected'}</span></div><div className="score-badge"><b>{score==null?'--':score}</b><small>Safety Score</small></div></div>
       <div className="cabin-map">
        <div className="car-body"><div className="windshield"/><div className="car-dashboard"/><div className="seat left"/><div className="seat right"/><div className="console"/><div className="steering"/></div>
        <div className="map-point p1"><i>✓</i><span>IR Sensor</span><b>{connected?(latest.ir?'Object Detected':'No Object'):'No Data'}</b></div>
        <div className="map-point p2"><i>✓</i><span>PIR Sensor</span><b>{connected?(latest.pir?'Motion Detected':'No Motion'):'No Data'}</b></div>
        <div className="map-point p3"><i>✓</i><span>MQ-3 Sensor</span><b>{connected?(gas?'Gas Detected':'No Gas Detected'):'No Data'}</b></div>
       </div>
       <div className="normal-caption">{connected?(high?'High Temperature':'Normal Cabin Temperature'):'Waiting for telemetry'} <b>{connected&&Number.isFinite(t)?t.toFixed(1)+'°C':'--'}</b></div>
      </div>

      <div className="right-stack">
       <div className="panel mq-panel"><div className="panel-title"><span>🧪 MQ-3 (Alcohol/Gas)</span><small>DO</small></div><Gauge value={latest.mq3} max={100} unit="DO" label={gas?'ALERT':'NORMAL'} accent="purple" available={connected}/><p>{gas?'Gas detected':'No Gas Detected'}</p></div>
       <div className="panel mq-panel"><div className="panel-title"><span>☁ MQ-7 (CO)</span><small>ADC</small></div><Gauge value={latest.mq7} max={100} unit="ADC" label={co?'ALERT':'NO DATA'} accent="violet" available={connected&&latest.mq7!=null}/><p>{latest.mq7==null?'ADS1115 required':'CO monitoring active'}</p></div>
      </div>
     </section>

     <section className="mid-grid">
      <div className="panel humidity-panel"><div className="panel-title"><span>💧 Humidity</span><small>%</small></div><Gauge value={latest.humidity} max={100} unit="%" label="NORMAL" accent="cyan" available={connected}/><div className="gauge-note"><span>0%</span><b>{connected&&latest.humidity!=null?Math.round(latest.humidity)+'%':'--'}</b><span>100%</span></div></div>
      <div className="panel esp-panel"><div className="panel-title"><span>▣ ESP8266 Status</span><small>{connected?'LIVE':'OFFLINE'}</small></div><div className="esp-online"><StatusDot ok={connected}/><b>{connected?'Online':'Offline'}</b></div><div className="esp-info"><div><span>IP Address</span><b>192.168.1.104</b></div><div><span>Uptime</span><b>--</b></div><div><span>Last Heartbeat</span><b>{latest.lastDeviceUpdate?new Date(latest.lastDeviceUpdate).toLocaleTimeString():'--'}</b></div><div><span>API Latency</span><b>{apiMs==null?'--':apiMs+' ms'}</b></div><div><span>Wi-Fi Signal</span><b>-- dBm</b></div></div></div>
      <div className="panel score-panel"><div className="panel-title"><span>◈ Cabin Safety Score</span><small>LIVE</small></div><div className="big-score">{score==null?'--':score+'%'}<small>{status==='SAFE'?'Safe':status}</small></div><p>All Systems Normal</p></div>
     </section>

     <section className="status-grid">
      <div className="panel"><div className="section-title"><h3>◉ Sensors Status</h3><small>{connected?'LIVE':'NO DATA'}</small></div><div className="sensor-cards">{[['PIR',latest.pir?'Motion':'No Motion',latest.pir],['IR',latest.ir?'Object':'No Object',latest.ir],['MQ-3',gas?'Alert':'Normal',gas],['MQ-7',co?'Alert':'No Data',co],['DHT11',connected?((latest.temperature??'--')+'°C / '+(latest.humidity??'--')+'%'):'No Data',false]].map((x,i)=><div className="mini-sensor" key={i}><span className={x[2]?'warn-icon':'ok-icon'}>{x[2]?'!':'✓'}</span><b>{x[0]}</b><small>{connected?x[1]:'No Data'}</small></div>)}</div></div>
      <div className="panel"><div className="section-title"><h3>⚙ Actuators Status</h3><small>OUTPUTS</small></div><div className="actuator-cards"><div><span>🔊</span><b>Buzzer</b><strong>{connected?(latest.buzzer?'ON':'OFF'):'--'}</strong></div><div><span>🌀</span><b>Fan</b><strong>{connected?(latest.fan?'ON':'OFF'):'--'}</strong></div></div></div>
      <div className="panel"><div className="section-title"><h3>♨ Automatic Fan Control</h3><small>{autoFan?'AUTO':'MANUAL'}</small></div><div className="fan-control"><div><span>Temp Threshold</span><b>{threshold}°C</b></div><input type="range" min="25" max="45" value={threshold} onChange={e=>setThreshold(+e.target.value)}/><label><input type="checkbox" checked={autoFan} onChange={e=>setAutoFan(e.target.checked)}/><i/>{autoFan?'Auto Mode':'Manual Mode'}</label></div></div>
     </section>

     <section className="analytics-grid">
      <div className="panel history-panel"><div className="section-title"><h3>▥ Live Sensor History</h3><div className="periods"><button>6h</button><button>12h</button><button>24h</button><button>7d</button></div></div>{history.length?<ResponsiveContainer width="100%" height={265}><AreaChart data={history}><defs><linearGradient id="tFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#31dcff" stopOpacity=".25"/><stop offset="100%" stopColor="#31dcff" stopOpacity="0"/></linearGradient></defs><CartesianGrid stroke="#21345c" strokeDasharray="3 3" opacity=".35"/><XAxis dataKey="time" tick={{fill:'#7183a8',fontSize:9}}/><YAxis tick={{fill:'#7183a8',fontSize:9}}/><Tooltip contentStyle={{background:'#09152e',border:'1px solid #31599c',borderRadius:8}}/><Area type="monotone" dataKey="temp" stroke="#31dcff" fill="url(#tFill)" strokeWidth={2} name="Temperature (°C)"/><Area type="monotone" dataKey="hum" stroke="#9b72ff" fill="none" strokeWidth={2} name="Humidity (%)"/></AreaChart></ResponsiveContainer>:<div className="chart-empty">Waiting for live sensor data…</div>}</div>
      <div className="panel alert-panel"><div className="section-title"><h3>♧ Alert History</h3><button onClick={()=>setAlerts([])}>View All</button></div>{alerts.slice(0,5).map((a,i)=><div className="alert-row" key={i}><span className={'alert-icon '+a.type.toLowerCase()}>{a.type==='NORMAL'?'✓':'!'}</span><div><b>{a.text}</b><small>{a.time}</small></div></div>)}{!alerts.length&&<div className="chart-empty">No alerts recorded</div>}</div>
      <div className="panel event-panel"><div className="section-title"><h3>▤ Event Log</h3><button onClick={()=>setEvents([])}>View All</button></div>{events.slice(0,6).map((e,i)=><div className="event-row" key={i}><span>{e.time}</span><b>{e.event}</b><strong className={e.level==='CRITICAL'?'bad':e.level==='WARNING'?'warn':'ok'}>{e.value}</strong></div>)}{!events.length&&<div className="chart-empty">No events yet</div>}</div>
     </section>
    </>}

    {tab==='events'&&<section className="full-tab panel"><div className="section-title"><h2>Alert History & Event Log</h2><button onClick={()=>{setAlerts([]);setEvents([])}}>Clear All</button></div>{[...alerts.map(a=>({time:a.time,event:a.text,value:a.type})),...events].map((e,i)=><div className="event-big" key={i}><span>{e.time}</span><b>{e.event||e.text}</b><strong>{e.value||e.type}</strong></div>)}</section>}
    {tab==='tests'&&<section className="full-tab panel"><h2>Hardware Test</h2><p>Run local dashboard tests against the API. ESP8266 telemetry can overwrite temporary test values.</p><div className="test-buttons">{['pir','ir','mq3','mq7','buzzer'].map(x=><button key={x} disabled={!connected} onClick={()=>test(x)}>TEST {x.toUpperCase()}</button>)}<button disabled={!connected} onClick={()=>command(true)}>FAN ON</button><button disabled={!connected} onClick={()=>command(false)}>FAN OFF</button></div></section>}
   </main>
   <footer><span>◈ Real-time Monitoring</span><span>♧ AI-Powered Alerts</span><span>☁ Cloud Sync</span><span>▣ Mobile Responsive</span><span>⌾ Secure & Encrypted</span><b>⚗ Hardware Test</b></footer>
  </div>
 </div>
}