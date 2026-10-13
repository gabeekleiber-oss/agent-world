import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import type { WorldEvent, WorldState, ModelAudit } from './types.js';

const dbPath = path.resolve(process.env.DATABASE_PATH || './data/ai-world.sqlite');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(`
  CREATE TABLE IF NOT EXISTS world_snapshot (id INTEGER PRIMARY KEY CHECK(id=1), json TEXT NOT NULL, updated_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, tick INTEGER NOT NULL, day INTEGER NOT NULL, time TEXT NOT NULL, type TEXT NOT NULL, agent_id TEXT, agent_name TEXT, text TEXT NOT NULL, detail_json TEXT);
  CREATE INDEX IF NOT EXISTS events_tick_idx ON events(tick DESC);
  CREATE TABLE IF NOT EXISTS model_calls (id TEXT PRIMARY KEY, tick INTEGER NOT NULL, agent_id TEXT NOT NULL, model TEXT NOT NULL, prompt TEXT NOT NULL, raw_output TEXT NOT NULL, parsed_json TEXT, accepted INTEGER NOT NULL, error TEXT, latency_ms INTEGER NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
  CREATE INDEX IF NOT EXISTS model_calls_tick_idx ON model_calls(tick DESC);
  CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
`);

export function saveWorld(world: WorldState) {
  world.updatedAt = new Date().toISOString();
  db.prepare('INSERT INTO world_snapshot(id,json,updated_at) VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET json=excluded.json, updated_at=excluded.updated_at')
    .run(JSON.stringify(world), world.updatedAt);
}
export function loadWorld(): WorldState | null {
  const row = db.prepare('SELECT json FROM world_snapshot WHERE id=1').get() as {json:string}|undefined;
  if (!row) return null;
  try { return JSON.parse(row.json) as WorldState; } catch { return null; }
}
export function addEvent(event: WorldEvent) {
  db.prepare('INSERT INTO events(id,tick,day,time,type,agent_id,agent_name,text,detail_json) VALUES(?,?,?,?,?,?,?,?,?)')
    .run(event.id,event.tick,event.day,event.time,event.type,event.agentId ?? null,event.agentName ?? null,event.text,event.detail ? JSON.stringify(event.detail) : null);
}
export function listEvents(limit = 100, beforeTick?: number) {
  const safeLimit = Math.max(1, Math.min(500, Math.floor(limit)));
  const rows = beforeTick === undefined
    ? db.prepare('SELECT * FROM events ORDER BY tick DESC,rowid DESC LIMIT ?').all(safeLimit)
    : db.prepare('SELECT * FROM events WHERE tick < ? ORDER BY tick DESC,rowid DESC LIMIT ?').all(beforeTick,safeLimit);
  return rows.map((r:any)=>({id:r.id,tick:r.tick,day:r.day,time:r.time,type:r.type,agentId:r.agent_id ?? undefined,agentName:r.agent_name ?? undefined,text:r.text,detail:r.detail_json ? JSON.parse(r.detail_json) : undefined})).reverse();
}
export function addAudit(a: ModelAudit) {
  db.prepare('INSERT INTO model_calls(id,tick,agent_id,model,prompt,raw_output,parsed_json,accepted,error,latency_ms) VALUES(?,?,?,?,?,?,?,?,?,?)')
    .run(a.id,a.tick,a.agentId,a.model,a.prompt,a.rawOutput,a.parsed === undefined ? null : JSON.stringify(a.parsed),a.accepted?1:0,a.error ?? null,a.latencyMs);
}
export function listAudits(limit=100) {
  return (db.prepare('SELECT id,tick,agent_id,model,prompt,raw_output,parsed_json,accepted,error,latency_ms,created_at FROM model_calls ORDER BY rowid DESC LIMIT ?').all(Math.max(1,Math.min(300,limit))) as any[])
    .map(r=>({id:r.id,tick:r.tick,agentId:r.agent_id,model:r.model,prompt:r.prompt,rawOutput:r.raw_output,parsed:r.parsed_json?JSON.parse(r.parsed_json):undefined,accepted:Boolean(r.accepted),error:r.error??undefined,latencyMs:r.latency_ms,createdAt:r.created_at}));
}
export function getSetting(key:string, fallback:string) {
  const row = db.prepare('SELECT value FROM settings WHERE key=?').get(key) as {value:string}|undefined;
  return row?.value ?? fallback;
}
export function setSetting(key:string,value:string) {
  db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(key,value);
}
