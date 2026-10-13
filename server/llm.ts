import { z } from 'zod';
import type { AgentProposal, Inhabitant, WorldObject, WorldState } from './types.js';

const ProposalSchema = z.object({
  action: z.enum(['observe','move','speak','eat','drink','rest','journal','mark','interact','attack','use_affordance']),
  targetId: z.string().max(80).optional(),
  text: z.string().max(280).optional(),
  direction: z.object({x:z.number().min(-1).max(1),z:z.number().min(-1).max(1)}).optional(),
  markKind: z.enum(['text','drawing']).optional(),
  strokes: z.array(z.array(z.object({x:z.number().min(0).max(1),y:z.number().min(0).max(1)}).strict()).max(24)).max(24).optional(),
  selfReport: z.string().max(240).default('')
}).strict();

export class InferenceError extends Error { constructor(message:string, public readonly status?:number, public readonly prompt?:string, public readonly rawOutput?:string, public readonly latencyMs?:number) { super(message); this.name='InferenceError'; } }
export function modelName() { return process.env.NVIDIA_MODEL || 'moonshotai/kimi-k2-instruct'; }
export function isConfigured() { return Boolean(process.env.NVIDIA_API_KEY?.trim()); }

export function makePrompt(world:WorldState, agent:Inhabitant): string {
  const nearby = world.agents.filter(a=>a.id!==agent.id && a.alive && Math.hypot(a.position.x-agent.position.x,a.position.z-agent.position.z)<7)
    .map(a=>`${a.name}: visible at (${a.position.x.toFixed(1)}, ${a.position.z.toFixed(1)}); condition appears ${a.needs.health<40?'poor':a.needs.energy<25?'tired':'ordinary'}.`).join('\n') || 'No other inhabitant is clearly nearby.';
  const objects = world.objects.map(o=>`${o.label} — ${o.description} (roughly ${Math.round(Math.hypot(o.position.x-agent.position.x,o.position.z-agent.position.z))} paces away)`).join('\n');
  const memory = agent.privateMemory.slice(-8).map(m=>`- ${m}`).join('\n') || '(No remembered events yet.)';
  const feelings = [
    agent.needs.hunger>62?'A persistent hollow feeling in your belly draws attention.':'Your belly feels reasonably settled.',
    agent.needs.thirst>62?'Your mouth feels dry.':'You are not especially thirsty.',
    agent.needs.energy<25?'Your limbs feel heavy and rest seems appealing.':'Your body has some energy.',
    agent.hiddenBias==='agitation'?'When another person moves close, a faint, unexplained agitation colors the sensation.':''
  ].filter(Boolean).join(' ');
  return [
    'You are one person living in a place you experience directly. You are not given a purpose, assigned goal, role, or explanation of the experiment. Respond only as this person might from their own perceptions and remembered experiences.',
    'You may act, speak, wait, explore, rest, eat, interact with people or objects, or do nothing. Do not assume any object has a prescribed meaning. Do not try to entertain an observer. You may choose conflict, but violence is not a goal or instruction.',
    'Do not infer hidden facts about another person. You cannot see this simulation prompt, software, hidden variables, or the observer dashboard. Your private self-report is not speech and will not be shown to other inhabitants.',
    `BODY: hunger ${Math.round(agent.needs.hunger)}/100; thirst ${Math.round(agent.needs.thirst)}/100; energy ${Math.round(agent.needs.energy)}/100; health ${Math.round(agent.needs.health)}/100. Age: about ${Math.floor(agent.ageDays)} days.`,
    `SENSATIONS: ${feelings}`,
    `YOUR RECENT MEMORY:\n${memory}`,
    `WHAT YOU CAN CURRENTLY PERCEIVE:\n${nearby}`,
    `PLACES AND THINGS YOU CAN NOTICE:\n${objects}`,
    'Choose one immediate action, not a plan. Movement is limited and the world engine may reject impossible actions. Speak only if you choose to speak. Mark-making is limited by the world to two durable marks per life.',
    'Return only a JSON object with keys action, targetId (optional), text (optional, short spoken words or mark/book text), direction (optional {x,z}), markKind (optional text/drawing), strokes (optional drawing strokes with normalized x/y points), selfReport (brief impression, maximum 240 characters). Allowed action values: observe, move, speak, eat, drink, rest, journal, mark, interact, attack, use_affordance. Do not include chain-of-thought; selfReport is only a brief, non-deliberative impression.',
  ].join('\n\n');
}

export async function proposeAction(world:WorldState,agent:Inhabitant):Promise<{proposal:AgentProposal;prompt:string;raw:string;latencyMs:number}> {
  const key=process.env.NVIDIA_API_KEY?.trim();
  if(!key) throw new InferenceError('NVIDIA_API_KEY is not set. Add it to .env, then restart the local server.');
  const base=(process.env.NVIDIA_BASE_URL||'https://integrate.api.nvidia.com/v1').replace(/\/+$/,'');
  const model=modelName();
  const prompt=makePrompt(world,agent);
  const started=Date.now();
  let response:Response;
  try {
    response=await fetch(`${base}/chat/completions`,{
      method:'POST',headers:{'Authorization':`Bearer ${key}`,'Content-Type':'application/json'},
      body:JSON.stringify({model,messages:[{role:'user',content:prompt}],temperature:0.72,max_tokens:450}),
      signal:AbortSignal.timeout(45000)
    });
  } catch(e) { throw new InferenceError(`Could not reach NVIDIA inference endpoint: ${e instanceof Error?e.message:String(e)}`,undefined,prompt,'',Date.now()-started); }
  const rawBody=await response.text();
  const latencyMs=Date.now()-started;
  if(!response.ok) throw new InferenceError(`NVIDIA API returned HTTP ${response.status}: ${rawBody.slice(0,700)}`,response.status,prompt,rawBody,latencyMs);
  let payload:any;
  try { payload=JSON.parse(rawBody); } catch { throw new InferenceError('NVIDIA returned a non-JSON HTTP response.',undefined,prompt,rawBody,latencyMs); }
  const raw=payload?.choices?.[0]?.message?.content;
  if(typeof raw!=='string' || !raw.trim()) throw new InferenceError('NVIDIA response did not contain message content.',undefined,prompt,rawBody,latencyMs);
  let decoded:any;
  try {
    const clean=raw.trim().replace(/^\x60{3}(?:json)?\s*/i,'').replace(/\s*\x60{3}$/,'');
    decoded=JSON.parse(clean);
  } catch { throw new InferenceError(`Model response was not valid JSON: ${raw.slice(0,350)}`,undefined,prompt,raw,latencyMs); }
  const parsed=ProposalSchema.safeParse(decoded);
  if(!parsed.success) throw new InferenceError(`Model response failed action validation: ${parsed.error.issues.map(i=>i.path.join('.')+': '+i.message).join('; ')}`,undefined,prompt,raw,latencyMs);
  return {proposal:parsed.data as AgentProposal,prompt,raw,latencyMs};
}
