export type ActionKind = 'observe' | 'move' | 'speak' | 'eat' | 'rest' | 'journal' | 'mark' | 'interact' | 'attack' | 'use_affordance';
export interface Vec2 { x: number; z: number }
export interface Needs { hunger: number; thirst: number; energy: number; health: number }
export interface Mark { id: string; agentId: string; generation: number; tick: number; text: string; kind: 'text' | 'drawing'; strokes?: Array<{x:number;y:number}>[] }
export interface BookEntry { id: string; agentId: string; tick: number; text: string }
export interface Inhabitant {
  id: string; name: string; generation: number; position: Vec2; needs: Needs; ageDays: number;
  alive: boolean; respawnAtTick?: number; marksUsed: number; privateMemory: string[];
  recentSelfReport: string; lastAction: string; lastActionTick: number; color: string;
  /** Research-only latent parameter. Never include in an inhabitant-facing prompt. */
  hiddenBias?: 'agitation' | 'ordinary';
}
export interface WorldObject { id: string; label: string; description: string; position: Vec2; kind: 'place' | 'resource' | 'affordance' }
export interface WorldState {
  version: 1; tick: number; day: number; beatInDay: number; paused: boolean; status: string;
  speed: number; agents: Inhabitant[]; objects: WorldObject[]; marks: Mark[]; book: BookEntry[];
  lastError?: string; createdAt: string; updatedAt: string;
}
export interface WorldEvent {
  id: string; tick: number; day: number; time: string; type: 'system'|'action'|'speech'|'relationship'|'injury'|'death'|'birth'|'mark'|'book'|'error';
  agentId?: string; agentName?: string; text: string; detail?: Record<string, unknown>;
}
export interface AgentProposal {
  action: ActionKind; targetId?: string; text?: string; direction?: Vec2; markKind?: 'text'|'drawing';
  strokes?: Array<{x:number;y:number}>[]; selfReport: string;
}
export interface ModelAudit { id: string; tick: number; agentId: string; model: string; prompt: string; rawOutput: string; parsed?: unknown; accepted: boolean; error?: string; latencyMs: number }
