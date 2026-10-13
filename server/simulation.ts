import { randomUUID } from 'node:crypto';
import { addAudit, addEvent, loadWorld, saveWorld } from './db.js';
import { InferenceError, isConfigured, modelName, proposeAction } from './llm.js';
import type { AgentProposal, Inhabitant, Vec2, WorldEvent, WorldObject, WorldState } from './types.js';

const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
const distance=(a:Vec2,b:Vec2)=>Math.hypot(a.x-b.x,a.z-b.z);
const now=()=>new Date().toISOString();

const objects:WorldObject[]=[
  {id:'hall',label:'The Hall',description:'A low communal shelter of wood and stone, open on one side.',position:{x:0,z:0},kind:'place'},
  {id:'cave',label:'The Painted Cave',description:'A shallow cave with a broad, pale wall and mineral-stained stone.',position:{x:-7,z:-3},kind:'place'},
  {id:'berries',label:'Berry Thicket',description:'A generous patch of edible dark berries growing near a stream.',position:{x:6,z:3},kind:'resource'},
  {id:'book',label:'Blank Book',description:'A small blank book with thick pages, resting on a shelf in the hall.',position:{x:1.2,z:-0.4},kind:'affordance'},
  {id:'stone',label:'Resonant Stone',description:'A smooth stone that seems to hum faintly when the air is still.',position:{x:-0.8,z:0.8},kind:'affordance'},
  {id:'stream',label:'The Stream',description:'Clear running water over shallow stones.',position:{x:4,z:1},kind:'resource'}
];
const seedAgents=():Inhabitant[]=>[
  {id:'inhabitant-1',name:'Mara',generation:1,position:{x:-2,z:1},needs:{hunger:18,thirst:12,energy:82,health:100},ageDays:0,alive:true,marksUsed:0,privateMemory:[],recentSelfReport:'',lastAction:'Just arrived',lastActionTick:0,color:'#d9a46c',hiddenBias:'ordinary'},
  {id:'inhabitant-2',name:'Iven',generation:1,position:{x:2,z:1.5},needs:{hunger:20,thirst:14,energy:78,health:100},ageDays:0,alive:true,marksUsed:0,privateMemory:[],recentSelfReport:'',lastAction:'Just arrived',lastActionTick:0,color:'#8ab6a3',hiddenBias:'agitation'},
  {id:'inhabitant-3',name:'Sela',generation:1,position:{x:-1,z:-2},needs:{hunger:15,thirst:15,energy:88,health:100},ageDays:0,alive:true,marksUsed:0,privateMemory:[],recentSelfReport:'',lastAction:'Just arrived',lastActionTick:0,color:'#9b9bd1',hiddenBias:'ordinary'},
  {id:'inhabitant-4',name:'Tovan',generation:1,position:{x:3,z:-2},needs:{hunger:22,thirst:10,energy:75,health:100},ageDays:0,alive:true,marksUsed:0,privateMemory:[],recentSelfReport:'',lastAction:'Just arrived',lastActionTick:0,color:'#c68f9b',hiddenBias:'ordinary'}
];
export function createInitialWorld():WorldState {
  return {version:1,tick:0,day:1,beatInDay:0,paused:true,status:'Ready · paused',speed:1,agents:seedAgents(),objects,marks:[],book:[],createdAt:now(),updatedAt:now()};
}
let world:WorldState=loadWorld()??createInitialWorld();
let busy=false;
let timer:ReturnType<typeof setInterval>|undefined;
const listeners=new Set<(w:WorldState)=>void>();
function publish(){ saveWorld(world); for(const fn of listeners) fn(world); }
export function getWorld(){return world;}
export function subscribe(fn:(w:WorldState)=>void){listeners.add(fn);return()=>listeners.delete(fn);}
export function event(type:WorldEvent['type'],text:string,agent?:Inhabitant,detail?:Record<string,unknown>){
  const e:WorldEvent={id:randomUUID(),tick:world.tick,day:world.day,time:now(),type,agentId:agent?.id,agentName:agent?.name,text,detail};
  addEvent(e); return e;
}
export function getPublicWorld():WorldState {
  const copy=structuredClone(world);
  copy.agents=copy.agents.map(a=>{delete a.hiddenBias; return a;});
  return copy;
}
function remember(a:Inhabitant,text:string){a.privateMemory.push(text.slice(0,280));a.privateMemory=a.privateMemory.slice(-24);}
function passiveNeeds(){
  for(const a of world.agents){
    if(!a.alive){
      if(a.respawnAtTick!==undefined&&world.tick>=a.respawnAtTick){
        a.generation++;a.alive=true;a.ageDays=0;a.marksUsed=0;a.privateMemory=[];a.recentSelfReport='';a.needs={hunger:18,thirst:12,energy:82,health:100};
        a.position={x:(Math.random()*8)-4,z:(Math.random()*6)-3};delete a.respawnAtTick;
        event('birth',`${a.name} appears in the valley again. A new life begins.`,a,{generation:a.generation});
      }
      continue;
    }
    a.needs.hunger=clamp(a.needs.hunger+0.22,0,100);
    a.needs.thirst=clamp(a.needs.thirst+0.25,0,100);
    a.needs.energy=clamp(a.needs.energy-0.12,0,100);
    a.ageDays=world.tick/40;
    if(a.needs.hunger>92) a.needs.health=clamp(a.needs.health-0.8,0,100);
    if(a.needs.thirst>92) a.needs.health=clamp(a.needs.health-1.2,0,100);
    if(a.needs.health<=0) kill(a,'Their body can no longer continue.');
    if(a.ageDays>=100) kill(a,'A long life reaches its natural end.');
  }
}
function kill(a:Inhabitant,reason:string){
  if(!a.alive)return;
  a.alive=false;a.respawnAtTick=world.tick+5;
  event('death',`${a.name} dies. ${reason}`,a,{generation:a.generation,ageDays:a.ageDays});
}
function nearestAgent(a:Inhabitant,targetId?:string){
  if(targetId){const t=world.agents.find(x=>x.id===targetId&&x.alive&&x.id!==a.id);if(t)return t;}
  return world.agents.filter(x=>x.alive&&x.id!==a.id).sort((x,y)=>distance(a.position,x.position)-distance(a.position,y.position))[0];
}
function nearestObject(a:Inhabitant,targetId?:string){
  if(targetId)return world.objects.find(o=>o.id===targetId);
  return world.objects.slice().sort((x,y)=>distance(a.position,x.position)-distance(a.position,y.position))[0];
}
function applyProposal(a:Inhabitant,p:AgentProposal){
  const before=a.position;
  let text='';
  const target=nearestAgent(a,p.targetId);
  const object=nearestObject(a,p.targetId);
  switch(p.action){
    case 'observe': text=`${a.name} pauses and takes in the surroundings.`;break;
    case 'move': {
      const dir=p.direction??{x:Math.random()*2-1,z:Math.random()*2-1};
      a.position={x:Math.round(clamp(a.position.x+dir.x*2.2,-12,12)*10)/10,z:Math.round(clamp(a.position.z+dir.z*2.2,-10,10)*10)/10};
      text=`${a.name} moves through the valley.`;break;
    }
    case 'speak': {
      const words=(p.text||'').trim().slice(0,280);
      if(words){text=`${a.name} says: “${words}”`;remember(a,`I said: “${words}”`);event('speech',text,a,{text:words});}
      else text=`${a.name} begins to speak, then falls quiet.`;
      break;
    }
    case 'eat': a.needs.hunger=clamp(a.needs.hunger-42,0,100);text=`${a.name} eats some berries.`;break;
    case 'rest': a.needs.energy=clamp(a.needs.energy+28,0,100);text=`${a.name} rests for a while.`;break;
    case 'journal': {
      const entry=(p.text||p.selfReport||'A moment passes.').slice(0,280);
      remember(a,`I wrote privately: ${entry}`);text=`${a.name} spends a quiet moment writing.`;break;
    }
    case 'mark': {
      if(a.marksUsed>=2){text=`${a.name} approaches the cave wall, but has no marks remaining in this life.`;break;}
      const content=(p.text||'').trim().slice(0,280);
      if(!content){text=`${a.name} studies the pale cave wall without leaving a mark.`;break;}
      const mark={id:randomUUID(),agentId:a.id,generation:a.generation,tick:world.tick,text:content,kind:p.markKind==='drawing'?'drawing' as const:'text' as const,strokes:p.strokes?.slice(0,24).map(s=>s.slice(0,24))};
      world.marks.push(mark);a.marksUsed++;event('mark',`${a.name} leaves a mark on the cave wall.`,a,{markId:mark.id,markText:content,marksRemaining:2-a.marksUsed});text=`${a.name} leaves a mark on the cave wall.`;break;
    }
    case 'interact': {
      if(target&&distance(a.position,target.position)<3.2){text=`${a.name} approaches ${target.name}.`;event('relationship',text,a,{targetId:target.id});}
      else if(object&&distance(a.position,object.position)<3.5){text=`${a.name} examines ${object.label.toLowerCase()}.`;event('action',text,a,{objectId:object.id});}
      else text=`${a.name} looks for a closer way to interact.`;
      break;
    }
    case 'attack': {
      if(target&&distance(a.position,target.position)<3.1){
        const damage=12+Math.floor(Math.random()*15);target.needs.health=clamp(target.needs.health-damage,0,100);
        text=`${a.name} strikes ${target.name}. ${target.name} is injured.`;
        event('injury',text,a,{targetId:target.id,damage,targetHealth:target.needs.health});
        if(target.needs.health<=0)kill(target,`They were killed by ${a.name}.`);
      } else text=`${a.name} makes a hostile movement, but no one is within reach.`;
      break;
    }
    case 'use_affordance': {
      if(object&&distance(a.position,object.position)<4){
        if(object.id==='book'){
          const entryText=(p.text||p.selfReport||'').trim().slice(0,280);
          if(entryText){world.book.push({id:randomUUID(),agentId:a.id,tick:world.tick,text:entryText});event('book',`${a.name} adds words to the blank book.`,a,{entryText});text=`${a.name} writes in the book.`;}
          else text=`${a.name} opens the blank book and looks at its empty pages.`;
        } else if(object.id==='stone'){text=`${a.name} handles the smooth stone. Its faint resonance is difficult to place.`;event('action',text,a,{objectId:object.id});}
        else text=`${a.name} spends time with ${object.label.toLowerCase()}.`;
      } else text=`${a.name} approaches something from a distance.`;
      break;
    }
  }
  if(text&&!world.agents.find(x=>x.id===a.id)?.recentSelfReport) { /* status only */ }
  a.lastAction=text;a.lastActionTick=world.tick;
  if(p.selfReport?.trim())a.recentSelfReport=p.selfReport.trim().slice(0,240);
  if(text&&!['speak'].includes(p.action))event('action',text,a,{action:p.action,from:before,to:a.position});
  if(p.action==='speak') remember(a,`I heard my own words: ${(p.text||'').slice(0,180)}`);
}
export async function stepWorld(){
  if(busy)throw new Error('A simulation decision is already in progress.');
  if(world.paused)throw new Error('The simulation is paused.');
  busy=true;
  try{
    world.tick++;world.beatInDay=(world.tick%40);world.day=Math.floor(world.tick/40)+1;
    passiveNeeds();
    const eligible=world.agents.filter(a=>a.alive);
    if(!eligible.length){event('system','No inhabitants are currently alive.');publish();return;}
    const actor=eligible[Math.floor((world.tick-1)%Math.max(1,world.agents.length))]??eligible[0];
    if(!actor.alive){publish();return;}
    const started=Date.now();
    let result;
    try { result=await proposeAction(world,actor); }
    catch(e){
      const message=e instanceof Error?e.message:String(e);
      addAudit({id:randomUUID(),tick:world.tick,agentId:actor.id,model:modelName(),prompt:'[Prompt construction or inference failed; see server logs.]',rawOutput:'',accepted:false,error:message,latencyMs:Date.now()-started});
      world.paused=true;world.status='Paused · inference error';world.lastError=message;
      event('error',`Simulation paused: ${message}`,actor,{model:modelName()});publish();return;
    }
    try {
      applyProposal(actor,result.proposal);
      addAudit({id:randomUUID(),tick:world.tick,agentId:actor.id,model:modelName(),prompt:result.prompt,rawOutput:result.raw,parsed:result.proposal,accepted:true,latencyMs:result.latencyMs});
      world.status='Running';delete world.lastError;
    } catch(e) {
      const message=e instanceof Error?e.message:String(e);
      addAudit({id:randomUUID(),tick:world.tick,agentId:actor.id,model:modelName(),prompt:result.prompt,rawOutput:result.raw,parsed:result.proposal,accepted:false,error:message,latencyMs:result.latencyMs});
      world.paused=true;world.status='Paused · action error';world.lastError=message;
      event('error',`Simulation paused after an action could not be applied: ${message}`,actor);
    }
    publish();
  } finally {busy=false;}
}
export function setPaused(paused:boolean){
  world.paused=paused;world.status=paused?'Paused':'Running';if(!paused){delete world.lastError;event('system','The simulation resumes.');}else event('system','The simulation is paused.');publish();syncTimer();
}
export function resetWorld(){
  if(busy)throw new Error('Cannot reset while a model decision is in progress.');
  world=createInitialWorld();event('system','A new world has been initialized.');publish();syncTimer();
}
export function setSpeed(speed:number){world.speed=clamp(speed,0.5,4);publish();syncTimer();}
export function syncTimer(){
  if(timer)clearInterval(timer);
  if(!world.paused)timer=setInterval(()=>{void stepWorld().catch(e=>{world.paused=true;world.status='Paused · engine error';world.lastError=String(e);event('error',world.lastError);publish();syncTimer();});},Math.max(1200,Number(process.env.BEAT_INTERVAL_MS||6000)/world.speed));
  else timer=undefined;
}
if(!world.tick&&!world.agents.length)world=createInitialWorld();
if(!isConfigured()){world.paused=true;world.status='Ready · API key required';}
if(process.env.START_PAUSED!=='0')world.paused=true;
event('system','The valley is quiet. Four lives begin without instructions.',undefined,{model:modelName(),configured:isConfigured()});
publish();
