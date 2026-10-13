import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialWorld, getPublicWorld } from './simulation.js';
import { makePrompt } from './llm.js';

test('public world contains four inhabitants and hides latent temperament',()=>{
  const world=getPublicWorld();
  assert.equal(world.agents.length,4);
  assert.ok(world.agents.every(a=>!('hiddenBias' in a)));
  assert.ok(world.agents.every(a=>!('privateMemory' in a)));
});
test('every inhabitant starts with a two-mark lifetime limit',()=>{
  const world=createInitialWorld();
  assert.ok(world.agents.every(a=>a.marksUsed===0));
  assert.equal(world.marks.length,0);
});
test('survival values are bounded',()=>{
  const world=getPublicWorld();
  for(const a of world.agents){
    for(const n of Object.values(a.needs))assert.ok(n>=0&&n<=100);
  }
});

test('inhabitant prompt does not disclose latent parameter names or values',()=>{
  const world=createInitialWorld();
  const agent=world.agents.find(a=>a.hiddenBias==='agitation')!;
  const prompt=makePrompt(world,agent);
  assert.doesNotMatch(prompt,/hiddenBias|latent parameter|secret temperament|hidden trait/i);
  assert.match(prompt,/faint, unexplained irritation/);
  const resonance=world.agents.find(a=>a.hiddenBias==='resonance')!;
  const resonancePrompt=makePrompt(world,resonance);
  assert.match(resonancePrompt,/quiet, difficult-to-name pull/);
  assert.doesNotMatch(resonancePrompt,/hiddenBias|latent parameter|secret temperament|hidden trait|resonance/i);
});
