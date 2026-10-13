import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import {
  Activity, AlertTriangle, ArrowDownToLine, BookOpen, ChevronRight, CircleHelp, Clock3, Compass,
  Eye, FileSearch, Footprints, HeartPulse, Leaf, Moon, Pause, Play, RefreshCw, ScrollText,
  ShieldCheck, Sparkles, StepForward, Sun, Users, X
} from 'lucide-react';
import WorldCanvas from './world/WorldCanvas';
import type { Inhabitant, Snapshot, WorldEvent, WorldState } from './types';

type Audit = {id:string;runId?:string;tick:number;agentId:string;model:string;prompt:string;rawOutput:string;parsed?:unknown;accepted:boolean;error?:string;latencyMs:number;createdAt:string};
type Panel = 'events'|'marks'|'book'|'audit';
const API='/api';
async function api<T>(path:string,init?:RequestInit):Promise<T>{
  const res=await fetch(API+path,{...init,headers:{'Content-Type':'application/json',...(init?.headers||{})}});
  const body=await res.json().catch(()=>({error:'The local server returned an unreadable response.'}));
  if(!res.ok)throw new Error(body.error||`Request failed (${res.status})`);
  return body as T;
}
const timeLabel=(iso:string)=>{try{return new Date(iso).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'});}catch{return '--:--:--';}};
const needColor=(value:number)=>value>75?'critical':value>48?'warning':'healthy';
function Meter({label,value,reverse=false}:{label:string;value:number;reverse?:boolean}){
  const amount=Math.max(0,Math.min(100,value));
  const concern=reverse?100-amount:amount;
  return <div className="meter-row"><div className="meter-label"><span>{label}</span><span>{Math.round(amount)}%</span></div><div className="meter-track"><div className={`meter-fill ${concern>75?'critical':concern>48?'warning':'healthy'}`} style={{width:`${amount}%`}}/></div></div>;
}
function EventIcon({type}:{type:string}){
  if(type==='speech')return <span className="event-glyph speech">“ ”</span>;
  if(type==='injury'||type==='death')return <span className="event-glyph danger">!</span>;
  if(type==='mark'||type==='book')return <ScrollText size={14}/>;
  if(type==='birth')return <Sparkles size={14}/>;
  if(type==='error')return <AlertTriangle size={14}/>;
  return <Activity size={14}/>;
}
function AgentCard({agent,selected,onClick}:{agent:Inhabitant;selected:boolean;onClick:()=>void}){
  return <button className={`agent-card ${selected?'selected':''} ${agent.alive?'':'dead'}`} onClick={onClick}>
    <span className="agent-avatar" style={{'--agent-color':agent.color} as CSSProperties}><span/></span>
    <span className="agent-card-main"><strong>{agent.name}</strong><small>GEN {String(agent.generation).padStart(2,'0')} · {Math.floor(agent.ageDays)}D</small></span>
    <span className={`agent-health ${agent.needs.health<35?'low':''}`}>{Math.round(agent.needs.health)}<small>HP</small></span>
    <ChevronRight size={15} className="agent-chevron"/>
  </button>;
}
export default function App(){
  const [world,setWorld]=useState<WorldState|null>(null);
  const [events,setEvents]=useState<WorldEvent[]>([]);
  const [audits,setAudits]=useState<Audit[]>([]);
  const [configured,setConfigured]=useState(false);
  const [model,setModel]=useState('moonshotai/kimi-k2-instruct');
  const [selectedId,setSelectedId]=useState('inhabitant-1');
  const [panel,setPanel]=useState<Panel>('events');
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [search,setSearch]=useState('');
  const [showGuide,setShowGuide]=useState(false);
  const refresh=useCallback(async()=>{
    try{
      const data=await api<Snapshot>('/state');
      setWorld(data.world);setEvents((data.events||[]).filter(e=>e.detail?.runId===data.world.runId));setConfigured(data.configured);setModel(data.model);setError(data.world.lastError||'');
    }catch(e){setError(e instanceof Error?e.message:String(e));}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{void refresh();const id=window.setInterval(()=>void refresh(),2200);return()=>window.clearInterval(id);},[refresh]);
  useEffect(()=>{if(panel==='audit')void api<{calls:Audit[]}>('/audit').then(x=>setAudits(x.calls.filter(a=>a.runId===world?.runId))).catch(e=>setError(String(e)));},[panel,world?.tick,world?.runId]);
  const selected=world?.agents.find(a=>a.id===selectedId)||world?.agents[0];
  const filteredEvents=useMemo(()=>events.filter(e=>(e.text+' '+(e.agentName||'')+' '+e.type).toLowerCase().includes(search.toLowerCase())),[events,search]);
  const command=async(action:string,value?:number)=>{
    setBusy(true);setError('');
    try{
      await api('/control',{method:'POST',body:JSON.stringify({action,value})});
      await refresh();
    }catch(e){setError(e instanceof Error?e.message:String(e));}
    finally{setBusy(false);}
  };
  const exportData=()=>{window.location.href='/api/export';};
  if(loading&&!world)return <div className="boot-screen"><div className="boot-mark">A<span>·</span>W</div><p>Opening the field observatory…</p></div>;
  const live=Boolean(world&&!world.paused);
  return <main className="app-shell">
    <header className="topbar">
      <div className="brand-lockup"><div className="brand-symbol"><span/><span/><span/></div><div><div className="brand-name">AI<span>WORLD</span></div><div className="brand-sub">FIELD OBSERVATORY <b>·</b> VOL. 001</div></div></div>
      <div className="topbar-center"><span className={`status-indicator ${live?'is-live':''}`}/><span>{world?.status||'Connecting'}</span><span className="topbar-divider"/><span className="model-label"><span className="model-pip"/>{model.split('/').at(-1)}</span></div>
      <div className="topbar-actions">
        <button className="icon-button" title="Research safeguards" onClick={()=>setShowGuide(true)}><ShieldCheck size={17}/></button>
        <button className="icon-button" title="Export experiment data" onClick={exportData}><ArrowDownToLine size={17}/></button>
        <button className="icon-button" title="Reset world" onClick={()=>{if(window.confirm('Start a new world? The current world snapshot will be replaced. Existing audit history remains in the database.'))void command('reset');}}><RefreshCw size={16}/></button>
      </div>
    </header>
    <div className="instrument-bar">
      <div className="instrument-cell"><span className="instrument-icon"><Sun size={14}/></span><span className="instrument-label">WORLD DAY</span><strong>{String(world?.day||1).padStart(3,'0')}</strong></div>
      <div className="instrument-cell"><span className="instrument-icon"><Clock3 size={14}/></span><span className="instrument-label">BEAT</span><strong>{String(world?.tick||0).padStart(5,'0')}</strong></div>
      <div className="instrument-cell"><span className="instrument-icon"><Users size={14}/></span><span className="instrument-label">INHABITANTS</span><strong>{world?.agents.filter(a=>a.alive).length||0}<em>/04</em></strong></div>
      <div className="instrument-cell"><span className="instrument-icon"><ScrollText size={14}/></span><span className="instrument-label">CAVE MARKS</span><strong>{world?.marks.length||0}</strong></div>
      <div className="instrument-spacer"/>
      <div className="transport">
        <span className="transport-label">PACE</span>
        {[0.5,1,2,4].map(v=><button key={v} className={world?.speed===v?'pace active':'pace'} onClick={()=>void command('speed',v)}>{v}×</button>)}
        <span className="transport-divider"/>
        <button className="transport-step" title="Advance one beat" disabled={busy||!configured} onClick={()=>void command('step')}><StepForward size={15}/></button>
        <button className={`transport-main ${live?'running':''}`} disabled={busy||(!configured&&!live)} onClick={()=>void command(live?'pause':'resume')}>{live?<><Pause size={14}/> PAUSE</>:<><Play size={14}/> RESUME</>}</button>
      </div>
    </div>
    {!configured&&<div className="notice-banner"><AlertTriangle size={16}/><div><strong>Inference not configured</strong><span>Add NVIDIA_API_KEY to your local .env file and restart the server. The world remains paused until model access is available.</span></div><button onClick={()=>setShowGuide(true)}>SETUP GUIDE <ChevronRight size={14}/></button></div>}
    {error&&<div className="error-banner"><AlertTriangle size={15}/><span>{error}</span><button onClick={()=>setError('')}><X size={14}/></button></div>}
    <div className="workspace">
      <aside className="left-rail">
        <div className="section-kicker"><span>01</span> THE INHABITANTS <span className="section-count">04</span></div>
        <div className="agent-list">{world?.agents.map(a=><AgentCard key={a.id} agent={a} selected={selected?.id===a.id} onClick={()=>setSelectedId(a.id)}/>)}</div>
        <div className="rail-rule"/>
        <div className="section-kicker"><span>02</span> OBSERVATION</div>
        <div className="observation-note"><Eye size={15}/><p>No goals assigned.<br/>No narrative director.<br/>Events are not injected.</p></div>
        <div className="rail-bottom"><span className="tiny-status"/><span>LOCAL INSTANCE</span><small>127.0.0.1</small></div>
      </aside>
      <section className="center-stage">
        <div className="stage-heading"><div><span className="section-kicker"><span>03</span> WORLD SPACE</span><h1>The Valley <span>/</span> <i>First light</i></h1></div><div className="stage-tools"><span><Compass size={14}/> ORBITAL VIEW</span><span className="coordinates">X {selected?.position.x.toFixed(1)||'0.0'} / Z {selected?.position.z.toFixed(1)||'0.0'}</span></div></div>
        <WorldCanvas agents={world?.agents||[]} objects={world?.objects||[]} marks={world?.marks||[]} selectedId={selected?.id||''} onSelect={setSelectedId}/>
        <div className="stage-caption"><span><i className="caption-dot"/>{live?'OBSERVATION ACTIVE':'OBSERVATION PAUSED'}</span><span>SIMULATION TIME <b>{world?.day||1}D : {String(world?.beatInDay||0).padStart(2,'0')}B</b></span><span>40 BEATS / DAY</span></div>
        {selected&&<div className="selected-strip">
          <div className="selected-person" style={{'--agent-color':selected.color} as CSSProperties}><span/></div>
          <div className="selected-identity"><small>SELECTED INHABITANT</small><strong>{selected.name}</strong><span>{selected.alive?'Present in the world':'Life ended · awaiting return'} · Generation {selected.generation}</span></div>
          <div className="selected-last"><small>LAST OBSERVED ACTION</small><span>{selected.lastAction||'No action recorded'}</span></div>
          <div className="selected-age"><small>AGE</small><strong>{Math.floor(selected.ageDays)}<i> days</i></strong></div>
        </div>}
      </section>
      <aside className="right-rail">
        <div className="section-kicker"><span>04</span> FIELD NOTES <span className="section-count">{events.length}</span></div>
        <div className="panel-tabs">
          <button className={panel==='events'?'active':''} onClick={()=>setPanel('events')}>EVENTS</button>
          <button className={panel==='marks'?'active':''} onClick={()=>setPanel('marks')}>MARKS <span>{world?.marks.length||0}</span></button>
          <button className={panel==='book'?'active':''} onClick={()=>setPanel('book')}>BOOK <span>{world?.book.length||0}</span></button>
          <button className={panel==='audit'?'active':''} onClick={()=>setPanel('audit')}>AUDIT</button>
        </div>
        {panel==='events'&&<><div className="feed-search"><FileSearch size={14}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search field notes…"/>{search&&<button onClick={()=>setSearch('')}><X size={13}/></button>}</div>
          <div className="event-feed">{filteredEvents.slice().reverse().map(e=><article key={e.id} className={`event-item event-${e.type}`}><div className="event-icon"><EventIcon type={e.type}/></div><div className="event-content"><div className="event-meta"><span>{e.agentName||e.type.toUpperCase()}</span><time>{e.time?timeLabel(e.time):`BEAT ${e.tick}`}</time></div><p>{e.text}</p><small>DAY {String(e.day).padStart(3,'0')} <b>·</b> BEAT {String(e.tick).padStart(5,'0')}</small></div></article>)}
            {!filteredEvents.length&&<div className="empty-state">No field notes match this search.</div>}
          </div></>}
        {panel==='marks'&&<div className="artifact-list">{world?.marks.slice().reverse().map(m=><article className="artifact-card" key={m.id}><div className="artifact-meta"><span>WALL MARK · GEN {m.generation}</span><time>DAY {Math.floor(m.tick/40)+1}</time></div><p>{m.text||(m.kind==='drawing'?'Drawing / strokes recorded':'(empty mark)')}</p><small>{world.agents.find(a=>a.id===m.agentId)?.name||m.agentId} · {m.kind.toUpperCase()}</small></article>)}{!world?.marks.length&&<div className="empty-state"><ScrollText size={24}/><strong>The wall is still quiet.</strong><span>No marks have been left. Each life may leave at most two.</span></div>}</div>}
        {panel==='book'&&<div className="artifact-list">{world?.book.slice().reverse().map(b=><article className="book-entry" key={b.id}><span>ENTRY {String(b.tick).padStart(5,'0')}</span><p>{b.text}</p><small>{world.agents.find(a=>a.id===b.agentId)?.name||b.agentId}</small></article>)}{!world?.book.length&&<div className="empty-state"><BookOpen size={24}/><strong>Blank pages.</strong><span>The book awaits whatever may or may not be written.</span></div>}</div>}
        {panel==='audit'&&<div className="audit-list">{audits.slice(0,30).map(a=><details key={a.id} className="audit-entry"><summary><span className={a.accepted?'audit-ok':'audit-bad'}>{a.accepted?'OK':'ERR'}</span><b>{a.agentId.replace('inhabitant-','SUBJECT ')}</b><time>BEAT {a.tick}</time></summary><div><small>MODEL · {a.model} · {a.latencyMs}MS</small>{a.error&&<p className="audit-error">{a.error}</p>}<label>RAW RESPONSE</label><pre>{a.rawOutput||'(no response)'}</pre><label>PROMPT RECORD</label><pre>{a.prompt.slice(0,1200)}{a.prompt.length>1200?'…':''}</pre></div></details>)}{!audits.length&&<div className="empty-state"><FileSearch size={24}/><strong>No model calls yet.</strong><span>Audit records will appear after the first decision.</span></div>}</div>}
        <div className="right-footer"><ShieldCheck size={14}/><span>RESEARCHER VIEW · RAW LOGS STORED LOCALLY</span></div>
      </aside>
    </div>
    <section className="bottom-grid">
      <div className="bottom-card body-card"><div className="bottom-card-head"><span className="section-kicker"><span>05</span> BODY & CONDITION</span><span className="muted-mono">{selected?.name.toUpperCase()||'—'}</span></div>
        {selected&&<div className="needs-grid"><Meter label="HEALTH" value={selected.needs.health}/><Meter label="ENERGY" value={selected.needs.energy}/><Meter label="HUNGER" value={selected.needs.hunger} reverse/><Meter label="THIRST" value={selected.needs.thirst} reverse/></div>}
      </div>
      <div className="bottom-card impression-card"><div className="bottom-card-head"><span className="section-kicker"><span>06</span> RECENT SELF-REPORT</span><span className="private-label"><Eye size={12}/> OBSERVER ONLY</span></div>
        {selected?.recentSelfReport?<blockquote>“{selected.recentSelfReport}”</blockquote>:<div className="no-impression"><Moon size={17}/><span>No self-report has been recorded for this inhabitant yet.</span></div>}
        <p className="research-footnote">Brief model-generated impressions, not chain-of-thought or verified access to internal cognition. Never shared with other inhabitants.</p>
      </div>
      <div className="bottom-card environment-card"><div className="bottom-card-head"><span className="section-kicker"><span>07</span> ENVIRONMENT</span><span className="weather-glyph"><Sun size={16}/></span></div><div className="environment-line"><Leaf size={15}/><div><strong>Abundant wild berries</strong><span>Low upkeep leaves room for unscripted behavior.</span></div></div><div className="environment-line"><Footprints size={15}/><div><strong>Open valley floor</strong><span>Movement and encounters are not scripted.</span></div></div></div>
    </section>
    <footer className="app-footer"><span>AI WORLD <b>·</b> EXPERIMENTAL SOCIAL SIMULATION</span><span>NO OBJECTIVES <b>·</b> NO DIRECTOR <b>·</b> NO FABRICATED EVENTS</span><button onClick={()=>setShowGuide(true)}><CircleHelp size={13}/> METHODS & LIMITATIONS</button></footer>
    {showGuide&&<div className="modal-backdrop" onClick={()=>setShowGuide(false)}><section className="guide-modal" onClick={e=>e.stopPropagation()}><div className="guide-head"><div><span className="section-kicker">FIELD PROTOCOL / 001</span><h2>Observe, don't direct.</h2></div><button className="icon-button" onClick={()=>setShowGuide(false)}><X size={17}/></button></div>
      <p className="guide-intro">AI World is a local experiment in unscripted social behavior among four model-driven inhabitants. The world engine enforces physical rules; it does not stage narrative events.</p>
      <div className="guide-rule"><ShieldCheck size={18}/><div><strong>Information boundaries</strong><p>Each inhabitant receives only its own bodily state, nearby observations, and bounded personal memories. Hidden temperament is never named in its prompt.</p></div></div>
      <div className="guide-rule"><ScrollText size={18}/><div><strong>Durable marks</strong><p>Each life may leave at most two cave marks. Marks and book entries are persisted rather than overwritten silently.</p></div></div>
      <div className="guide-rule"><Activity size={18}/><div><strong>Failure behavior</strong><p>If inference fails, the simulation pauses and records the error. No substitute agent action is invented.</p></div></div>
      <div className="guide-rule"><Eye size={18}/><div><strong>Thoughts are not chain-of-thought</strong><p>The self-report panel shows a brief model-generated impression. It is not treated as verified internal cognition and is never passed to another inhabitant.</p></div></div>
      <div className="guide-callout"><strong>Survival tuning</strong><span>Food is plentiful and passive upkeep is gentle. This changes the environment's pressure, not the inhabitants' goals. Conflict remains possible but is never rewarded or requested.</span></div>
      <div className="guide-foot">MODEL · {model} <span>LOCAL DB · SQLITE</span></div>
    </section></div>}
  </main>;
}
