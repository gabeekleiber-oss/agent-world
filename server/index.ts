import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { addEvent, listAudits, listEvents, saveWorld } from './db.js';
import { getPublicWorld, getWorld, resetWorld, setPaused, setSpeed, stepWorld, syncTimer } from './simulation.js';
import { isConfigured, modelName } from './llm.js';

const app=express();
app.disable('x-powered-by');
app.use(cors({origin:['http://127.0.0.1:5173','http://localhost:5173','http://127.0.0.1:4174']}));
app.use(express.json({limit:'256kb'}));
app.get('/api/health',(_req,res)=>res.json({ok:true,configured:isConfigured(),model:modelName(),status:getWorld().status}));
app.get('/api/state',(_req,res)=>res.json({world:getPublicWorld(),configured:isConfigured(),model:modelName(),events:listEvents(80)}));
app.get('/api/events', (req,res)=>res.json({events:listEvents(Number(req.query.limit)||100,req.query.before?Number(req.query.before):undefined)}));
app.get('/api/audit',(_req,res)=>res.json({calls:listAudits(100)}));
app.post('/api/control', async (req,res)=>{
  const action=req.body?.action;
  try{
    if(action==='pause')setPaused(true);
    else if(action==='resume'){
      if(!isConfigured())return res.status(400).json({error:'Add NVIDIA_API_KEY to .env and restart the server before resuming.'});
      setPaused(false);
    } else if(action==='step'){
      if(!isConfigured())return res.status(400).json({error:'NVIDIA_API_KEY is not configured.'});
      await stepWorld(true);
    } else if(action==='reset')resetWorld();
    else if(action==='speed')setSpeed(Number(req.body?.value)||1);
    else return res.status(400).json({error:'Unknown control action.'});
    syncTimer();res.json({world:getPublicWorld()});
  }catch(e){res.status(409).json({error:e instanceof Error?e.message:String(e)});}
});
app.get('/api/export',(_req,res)=>{
  const payload={exportedAt:new Date().toISOString(),world:getPublicWorld(),events:listEvents(500),modelCalls:listAudits(300)};
  res.setHeader('Content-Disposition','attachment; filename="ai-world-export.json"');
  res.type('application/json').send(JSON.stringify(payload,null,2));
});
app.get('/api/settings',(_req,res)=>res.json({model:modelName(),configured:isConfigured(),beatIntervalMs:Number(process.env.BEAT_INTERVAL_MS||6000),databasePath:path.resolve(process.env.DATABASE_PATH||'./data/ai-world.sqlite')}));
const port=Number(process.env.PORT||4174);
app.listen(port,'127.0.0.1',()=>{console.log(`AI World API listening at http://127.0.0.1:${port}`);});
process.on('SIGINT',()=>{saveWorld(getWorld());process.exit(0);});
process.on('SIGTERM',()=>{saveWorld(getWorld());process.exit(0);});
