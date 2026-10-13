export interface Needs { hunger:number; thirst:number; energy:number; health:number }
export interface Inhabitant {
  id:string; name:string; generation:number; position:{x:number;z:number}; needs:Needs; ageDays:number; alive:boolean;
  marksUsed:number; recentSelfReport:string; lastAction:string; lastActionTick:number; color:string;
}
export interface WorldObject {id:string;label:string;description:string;position:{x:number;z:number};kind:'place'|'resource'|'affordance'}
export interface WorldEvent {id:string;tick:number;day:number;time:string;type:string;agentId?:string;agentName?:string;text:string;detail?:Record<string,unknown>}
export interface WorldState {
  version:number;runId:string;tick:number;day:number;beatInDay:number;paused:boolean;status:string;speed:number;agents:Inhabitant[];
  objects:WorldObject[];marks:Array<{id:string;agentId:string;generation:number;tick:number;text:string;kind:'text'|'drawing';strokes?:Array<{x:number;y:number}>[]}>;
  book:Array<{id:string;agentId:string;tick:number;text:string}>;lastError?:string;createdAt:string;updatedAt:string;
}
export interface Snapshot {world:WorldState;configured:boolean;model:string;events:WorldEvent[]}
