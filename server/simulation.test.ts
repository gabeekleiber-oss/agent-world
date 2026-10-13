import test from 'node:test';
import assert from 'node:assert/strict';
import { getPublicWorld } from './simulation.js';

test('public world contains four inhabitants and hides latent temperament',()=>{
  const world=getPublicWorld();
  assert.equal(world.agents.length,4);
  assert.ok(world.agents.every(a=>!('hiddenBias' in a)));
});
test('every inhabitant starts with a two-mark lifetime limit',()=>{
  const world=getPublicWorld();
  assert.ok(world.agents.every(a=>a.marksUsed===0));
  assert.equal(world.marks.length,0);
});
test('survival values are bounded',()=>{
  const world=getPublicWorld();
  for(const a of world.agents){
    for(const n of Object.values(a.needs))assert.ok(n>=0&&n<=100);
  }
});
