import { Canvas } from '@react-three/fiber';
import { Html, OrbitControls, ContactShadows, Line, Text } from '@react-three/drei';
import { useMemo } from 'react';
import type { Inhabitant, WorldObject } from '../types';

function Terrain(){
  const hills=useMemo(()=>Array.from({length:34},(_,i)=>({x:Math.sin(i*17.31)*15,z:Math.cos(i*9.17)*12,s:0.8+((i*7)%10)/10,h:1.3+((i*13)%18)/10})),[]);
  const trees=useMemo(()=>Array.from({length:42},(_,i)=>({x:Math.sin(i*3.7)*10,z:Math.cos(i*2.13)*8,scale:.65+((i*5)%7)/10})).filter(p=>Math.hypot(p.x,p.z)>3.7),[]);
  return <group>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.13,0]} receiveShadow><planeGeometry args={[42,36,1,1]}/><meshStandardMaterial color="#293d32" roughness={1}/></mesh>
    {hills.map((h,i)=><mesh key={i} position={[h.x,-.15,h.z]} scale={[h.s,h.h,h.s]} receiveShadow castShadow><icosahedronGeometry args={[1,1]}/><meshStandardMaterial color={i%3===0?'#334a3a':i%3===1?'#3b503c':'#263b31'} flatShading roughness={1}/></mesh>)}
    <mesh position={[0,-.04,0]} rotation={[-Math.PI/2,0,0]}><circleGeometry args={[5.3,48]}/><meshStandardMaterial color="#3d5140" roughness={1}/></mesh>
    <mesh position={[3.7,-.025,1.4]} rotation={[-Math.PI/2,0,-.3]}><planeGeometry args={[1.5,15]}/><meshStandardMaterial color="#476d6b" transparent opacity={.8} roughness={.25}/></mesh>
    {trees.map((t,i)=><group key={i} position={[t.x,-.08,t.z]} scale={t.scale}>
      <mesh position={[0,.48,0]} castShadow><cylinderGeometry args={[.09,.15,.95,5]}/><meshStandardMaterial color="#5d4936" flatShading/></mesh>
      <mesh position={[0,1.25,0]} castShadow><coneGeometry args={[.62,1.55,6]}/><meshStandardMaterial color={i%3===0?'#506d4c':'#3c6048'} flatShading roughness={1}/></mesh>
      <mesh position={[.1,1.68,.02]} castShadow><coneGeometry args={[.42,1.15,6]}/><meshStandardMaterial color="#617a51" flatShading roughness={1}/></mesh>
    </group>)}
    {Array.from({length:16},(_,i)=><mesh key={'rock'+i} position={[Math.sin(i*5.2)*11,.12,Math.cos(i*4.1)*8]} rotation={[.2*i,.7*i,0]} scale={[.45+(.1*i%0.4),.25,.36]} castShadow><dodecahedronGeometry args={[1,0]}/><meshStandardMaterial color="#677064" flatShading/></mesh>)}
    <group position={[0,0,0]}>
      <mesh position={[0,.7,0]} castShadow><boxGeometry args={[2.6,1.4,1.7]}/><meshStandardMaterial color="#776b55" flatShading/></mesh>
      <mesh position={[0,1.55,0]} rotation={[0,Math.PI/4,0]} castShadow><coneGeometry args={[1.75,.9,4]}/><meshStandardMaterial color="#4b5144" flatShading/></mesh>
      <mesh position={[0,.43,.87]}><planeGeometry args={[.65,.85]}/><meshStandardMaterial color="#171c18"/></mesh>
    </group>
    <group position={[-7,0,-3]}>
      <mesh position={[0,.4,0]} rotation={[0,0,.04]} castShadow><boxGeometry args={[3.5,.9,2.4]}/><meshStandardMaterial color="#555b4d" flatShading/></mesh>
      <mesh position={[0,.95,-.25]} castShadow><coneGeometry args={[2.1,.9,5]}/><meshStandardMaterial color="#343d34" flatShading/></mesh>
      <mesh position={[0,.45,1.08]}><planeGeometry args={[1.25,.6]}/><meshStandardMaterial color="#151a17"/></mesh>
    </group>
    <group position={[6,0,3]}>
      {Array.from({length:11},(_,i)=><mesh key={i} position={[Math.sin(i*2.1)*1.2,.12,Math.cos(i*2.4)*.85]} rotation={[.1,i,.3]}><sphereGeometry args={[.2,7,5]}/><meshStandardMaterial color={i%2?'#9a5b60':'#b77a71'} flatShading/></mesh>)}
    </group>
    <group position={[-.8,.15,.8]}>
      <mesh castShadow><dodecahedronGeometry args={[.28,1]}/><meshStandardMaterial color="#b9b39b" roughness={.3} metalness={.12}/></mesh>
      <pointLight color="#d4cba1" intensity={.25} distance={2.5}/>
    </group>
  </group>;
}
function Person({agent,selected,onSelect}:{agent:Inhabitant;selected:boolean;onSelect:()=>void}){
  return <group position={[agent.position.x,0,agent.position.z]} onClick={e=>{e.stopPropagation();onSelect();}} onPointerOver={e=>{e.stopPropagation();document.body.style.cursor='pointer';}} onPointerOut={()=>{document.body.style.cursor='default';}}>
    {selected&&<mesh position={[0,.03,0]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.55,.62,32]}/><meshBasicMaterial color="#e7c38c" transparent opacity={.9}/></mesh>}
    <mesh position={[0,.55,0]} castShadow><capsuleGeometry args={[.22,.55,4,8]}/><meshStandardMaterial color={agent.color} roughness={.92}/></mesh>
    <mesh position={[0,1.02,.015]} castShadow><sphereGeometry args={[.2,12,10]}/><meshStandardMaterial color="#d0aa87" roughness={.95}/></mesh>
    <mesh position={[0,1.16,-.005]} castShadow><sphereGeometry args={[.205,10,8,0,Math.PI*2,0,Math.PI*.55]}/><meshStandardMaterial color="#3c3b31" flatShading/></mesh>
    <mesh position={[-.1,.26,.01]} castShadow><capsuleGeometry args={[.075,.28,3,6]}/><meshStandardMaterial color="#57483a"/></mesh>
    <mesh position={[.1,.26,.01]} castShadow><capsuleGeometry args={[.075,.28,3,6]}/><meshStandardMaterial color="#57483a"/></mesh>
    {selected&&<Html position={[0,1.55,0]} center distanceFactor={12} style={{pointerEvents:'none'}}><div className="world-nameplate">{agent.name}<small>GEN {agent.generation}</small></div></Html>}
  </group>;
}
function ObjectMarker({object}:{object:WorldObject}){
  if(['berries','stream'].includes(object.id))return null;
  return <group position={[object.position.x,.15,object.position.z]}>
    <mesh rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.34,.39,24]}/><meshBasicMaterial color="#bba27a" transparent opacity={.65}/></mesh>
  </group>;
}
function Markings({marks}:{marks:Array<{id:string;text:string;kind:'text'|'drawing';strokes?:Array<{x:number;y:number}>[]}>}) {
  return <group>{marks.slice(-12).map((mark,i)=>mark.kind==='drawing'&&mark.strokes?.length ? mark.strokes.map((stroke,j)=>stroke.length>1?<Line key={mark.id+'-'+j} points={stroke.map(p=>[-8.35+p.x*2.65,.32+p.y*1.15,-1.79] as [number,number,number])} color="#d8c9a5" lineWidth={1.5}/>:null) : <Text key={mark.id} position={[-7.9+(i%3)*.8,.48+Math.floor(i/3)*.28,-1.79]} fontSize={.15} maxWidth={.78} color="#d8c9a5" anchorX="center" anchorY="middle">{mark.text.slice(0,32)}</Text>)}</group>;
}
export default function WorldCanvas({agents,objects,marks,selectedId,onSelect}:{agents:Inhabitant[];objects:WorldObject[];marks:Array<{id:string;text:string;kind:'text'|'drawing';strokes?:Array<{x:number;y:number}>[]}>;selectedId:string;onSelect:(id:string)=>void}){
  return <div className="world-canvas">
    <Canvas shadows dpr={[1,1.6]} camera={{position:[13,15,16],fov:43}} gl={{antialias:true,alpha:false}}>
      <color attach="background" args={['#1a2622']}/><fog attach="fog" args={['#1a2622',22,43]}/>
      <ambientLight intensity={1.15}/><hemisphereLight args={['#b4c4c1','#344337',1.1]}/>
      <directionalLight position={[-8,14,7]} intensity={2.2} color="#f2d9ae" castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024}/>
      <pointLight position={[0,5,0]} intensity={.4} color="#e1b783" distance={20}/>
      <Terrain/>
      {objects.map(o=><ObjectMarker key={o.id} object={o}/>)}
      <Markings marks={marks}/>
      {agents.filter(a=>a.alive).map(a=><Person key={a.id} agent={a} selected={a.id===selectedId} onSelect={()=>onSelect(a.id)}/>)}
      <ContactShadows position={[0,-.105,0]} opacity={.28} scale={28} blur={2.8} far={9}/>
      <OrbitControls makeDefault minDistance={8} maxDistance={28} maxPolarAngle={Math.PI/2.05} target={[0,0,0]} enableDamping dampingFactor={.08}/>
    </Canvas>
    <div className="world-overlay world-overlay-top"><span className="live-dot"/><span>LIVE WORLD</span><i>VALLEY / OBSERVATION 001</i></div>
    <div className="world-overlay world-overlay-bottom"><span>DRAG TO ORBIT</span><span>SCROLL TO ZOOM</span><span>{agents.filter(a=>a.alive).length} LIVING</span></div>
  </div>;
}
