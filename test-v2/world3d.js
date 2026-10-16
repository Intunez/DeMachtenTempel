import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js';
const THREE_COLORS=['#ffb563','#8cd9ff','#e4a5ff','#9ff2bf','#ffd68b','#f4a2cb','#d0ed87','#b3aaff'];
const routePoints=Array.from({length:8},(_,i)=>{const angle=i*Math.PI/4;return Array.from({length:7},(_,j)=>{const radius=25-j*3.55;return new THREE.Vector3(Math.cos(angle)*radius,1.5+j*.32,Math.sin(angle)*radius);});});
const scene=new THREE.Scene();scene.background=new THREE.Color(0x92b3bb);scene.fog=new THREE.FogExp2(0x91b1b6,.009);
const world=new THREE.Group();scene.add(world);
scene.add(new THREE.HemisphereLight(0xeaf8ff,0x29423a,2.7));
const sun=new THREE.DirectionalLight(0xffe9c3,3.1);sun.position.set(-22,40,24);scene.add(sun);
const accent=new THREE.PointLight(0x64f9ef,85,35);accent.position.set(0,11,0);scene.add(accent);
const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.88,...extra});
const rock=mat(0x58645f),moss=mat(0x496b4e),stone=mat(0x9c9582),gold=mat(0xc9a76e),dark=mat(0x334744),water=mat(0x55d6e9,{metalness:.1,roughness:.3,transparent:true,opacity:.76}),crystal=mat(0x77eaff,{emissive:0x2dbbc5,emissiveIntensity:1.5,metalness:.25,roughness:.15});
const cylinder=(r1,r2,h,m,x,y,z,n=8)=>{const o=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,n),m);o.position.set(x,y,z);o.castShadow=true;world.add(o);return o;};
const box=(w,h,d,m,x,y,z)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);world.add(o);return o;};
const cone=(r,h,m,x,y,z,n=7)=>{const o=new THREE.Mesh(new THREE.ConeGeometry(r,h,n),m);o.position.set(x,y,z);world.add(o);return o;};
const rand=(i)=>{const v=Math.sin(i*78.233+42.5)*43758.5453;return v-Math.floor(v);};
function build(){
 cylinder(31,33,3.6,rock,0,-2.7,0,12);cylinder(29.8,31,1.2,moss,0,-.25,0,12);
 for(let i=0;i<26;i++){const a=i*2.399,r=14+rand(i+4)*15,x=Math.cos(a)*r,z=Math.sin(a)*r;
  cylinder(2+rand(i+8)*2,3.8+rand(i+9)*2,4+rand(i+12)*7,rock,x,-5,z,6);
  if(i%3===0){const fall=box(.8,8,.3,water,x,-5.7,z);fall.rotation.y=a;}
 }
 for(let i=0;i<75;i++){const a=rand(i+24)*Math.PI*2,r=7+rand(i+47)*22,x=Math.cos(a)*r,z=Math.sin(a)*r;
  cylinder(.2,.35,1.2,mat(0x4b4035),x,.7,z,5);
  cone(.65+rand(i+70)*.9,2+rand(i+55)*2,mat(i%2?0x255f4c:0x326a53),x,2.1,z,6);
 }
 for(let i=0;i<24;i++){const a=i*2.399,r=8+rand(i+90)*20,x=Math.cos(a)*r,z=Math.sin(a)*r;
  const c=cone(.6,2.1,crystal,x,1.3,z,5);c.rotation.z=rand(i+2)*.3;
 }
 // Ancient temple, grand staircase, magical gateway and monumental guardian.
 cylinder(9,10,2.8,stone,0,2,0,12);
 for(let k=0;k<6;k++)box(5.5, .5, 2,stone,0,1.1+k*.45,10-k*1.6);
 for(let i=0;i<10;i++){const a=i*Math.PI*2/10,x=Math.cos(a)*7,z=Math.sin(a)*7;
  cylinder(.65,.85,7,stone,x,6.7,z,10);cylinder(.95,.95,.6,gold,x,10.4,z,10);}
 cylinder(8.6,8.6,1.1,gold,0,11,0,12);
 cone(9.2,5.8,stone,0,14.2,0,8);
 box(4.2,7.5,1.5,dark,0,6,8);
 box(5.4,.65,2,gold,0,10.2,8);
 for(const x of [-2.7,2.7])cylinder(.48,.6,8,stone,x,5.8,8.5);
 const portal=box(2.3,4.5,.15,crystal,0,5.8,8.9);
 const guardian=new THREE.Group();guardian.position.set(0,12,-4);
 const cloak=new THREE.Mesh(new THREE.ConeGeometry(2.1,5.7,9),mat(0x293d48));cloak.position.y=0;guardian.add(cloak);
 const head=new THREE.Mesh(new THREE.IcosahedronGeometry(1.2,1),mat(0x627d83,{metalness:.55}));head.position.y=3.25;guardian.add(head);
 const gem=new THREE.Mesh(new THREE.OctahedronGeometry(.85),crystal);gem.position.set(0,5.7,0);guardian.add(gem);guardian.userData.gem=gem;world.add(guardian);world.userData.guardian=guardian;
 // Paths are genuine 3D stone bridges, not 2D lines.
 for(let i=0;i<8;i++){const path=routePoints[i];
  for(let j=0;j<path.length-1;j++){const a=path[j],b=path[j+1],mid=a.clone().add(b).multiplyScalar(.5),length=a.distanceTo(b);
   const bridge=box(2.1,.35,length+.4,stone,mid.x,mid.y-.8,mid.z);
   bridge.rotation.y=Math.atan2(b.x-a.x,b.z-a.z);
   if(j%2===0){for(const side of [-1,1]){const offset=new THREE.Vector3(side*1.05,0,0).applyAxisAngle(new THREE.Vector3(0,1,0),bridge.rotation.y);cylinder(.17,.2,1.3,gold,mid.x+offset.x,mid.y,mid.z+offset.z,6);}}
  }
 }
}
build();
const camera=new THREE.PerspectiveCamera(43,1,.1,200);
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.7));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
const avatars=new Map();
function avatar(id,index){let o=avatars.get(id);if(o)return o;const g=new THREE.Group();const c=mat(THREE_COLORS[index%8]);
 const body=new THREE.Mesh(new THREE.CapsuleGeometry(.52,.8,4,8),c);body.position.y=.8;g.add(body);
 const face=new THREE.Mesh(new THREE.SphereGeometry(.5,12,10),mat(0xffd9af));face.position.y=1.9;g.add(face);
 const hood=new THREE.Mesh(new THREE.ConeGeometry(.66,.9,7),c);hood.position.y=2.65;g.add(hood);
 for(const x of [-.18,.18]){const eye=new THREE.Mesh(new THREE.SphereGeometry(.065,7,6),mat(0x1c2734));eye.position.set(x,1.95,.46);g.add(eye);}
 scene.add(g);avatars.set(id,g);return g;}
const lerp=(a,b,t)=>a.clone().lerp(b,Math.max(0,Math.min(1,t)));
function position(team,phase){const path=routePoints[team.route%8]||routePoints[0];
 if(phase==='final'||phase==='ended'){const p=Math.min(1,(team.finalPos||0)/16);return lerp(path[5],new THREE.Vector3(0,3.5,7),p);}
 const p=Math.max(0,Math.min(path.length-1,team.step||0)),i=Math.floor(p);return lerp(path[i],path[Math.min(i+1,6)],p-i);}
let lastCanvas=null,frame=0;
export function draw3D(canvas,state,view,teamId,time){
 if(!canvas)return false;
 try{
 if(lastCanvas!==canvas){const parent=canvas.parentElement;if(!parent)return false;renderer.domElement.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0';parent.style.position='relative';parent.insertBefore(renderer.domElement,canvas);canvas.style.visibility='hidden';lastCanvas=canvas;}
 const width=Math.max(1,canvas.clientWidth||canvas.width),height=Math.max(1,canvas.clientHeight||canvas.height);
 renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();
 const teams=Object.values(state?.teams||{});const ids=new Set(teams.map(t=>t.id));
 for(const [id,g] of avatars)if(!ids.has(id)){scene.remove(g);avatars.delete(id);}
 for(const t of teams){const g=avatar(t.id,t.route);const p=position(t,state?.phase);g.position.lerp(p,.07);g.position.y+=Math.sin(time*.002+t.route)*.004;g.rotation.y=Math.atan2(-g.position.x,-g.position.z);}
 if(view==='student'&&state?.teams?.[teamId]){const target=position(state.teams[teamId],state.phase);const direction=target.clone().normalize();if(direction.length()<.1)direction.set(0,0,1);const desired=target.clone().add(direction.multiplyScalar(8)).add(new THREE.Vector3(0,6,0));camera.position.lerp(desired,.045);camera.lookAt(target.x, target.y+2.3,target.z);}
 else{camera.position.lerp(new THREE.Vector3(34,51,57),.035);camera.lookAt(0,2,0);}
 if(world.userData.guardian){world.userData.guardian.userData.gem.rotation.y=time*.0006;world.userData.guardian.userData.gem.position.y=5.7+Math.sin(time*.0015)*.25;}
 renderer.render(scene,camera);frame++;const loading=document.getElementById('previewLoading');if(loading&&view==='welcome')loading.style.display='none';return true;
 }catch(err){if(frame<2)console.warn('3D view unavailable',err);return false;}
}
