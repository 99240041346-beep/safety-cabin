const express=require('express');const cors=require('cors');const path=require('path');const app=express();app.use(cors());app.use(express.json());
let state={device:'NodeMCU V3 / ESP8266',online:false,source:'none',temperature:null,humidity:null,mq3:null,mq7:null,pir:null,ir:null,buzzer:null,fan:null,fanThreshold:35,updatedAt:null,lastDeviceUpdate:null};
app.get('/api/status',(req,res)=>res.json(state));
app.post('/api/status',(req,res)=>{const body=req.body||{};const isDevice=body.source==='esp8266'||body.device==='NodeMCU V3 / ESP8266';state={...state,...body,updatedAt:new Date().toISOString()};if(isDevice)state.lastDeviceUpdate=state.updatedAt;state.online=!!state.lastDeviceUpdate&&Date.now()-new Date(state.lastDeviceUpdate).getTime()<10000;res.json(state)});
app.get('/api/health',(req,res)=>res.json({ok:true,service:'smart-cabin-backend',time:new Date().toISOString(),deviceOnline:!!state.lastDeviceUpdate&&Date.now()-new Date(state.lastDeviceUpdate).getTime()<10000}));
setInterval(()=>{if(state.lastDeviceUpdate)state.online=Date.now()-new Date(state.lastDeviceUpdate).getTime()<10000},1000);
const dist=path.join(__dirname,'..','dist');app.use(express.static(dist));app.use((req,res)=>res.sendFile(path.join(dist,'index.html')));
const port=process.env.PORT||3000;app.listen(port,()=>console.log('Smart Cabin backend running on '+port));