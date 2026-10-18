import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { RACE, teamPosition } from './world-layout.js';
const THREE_COLORS=['#ffb563','#8cd9ff','#e4a5ff','#9ff2bf','#ffd68b','#f4a2cb','#d0ed87','#b3aaff'];
const routePoints=Array.from({length:8},(_,i)=>{const angle=i*Math.PI/4;return Array.from({length:7},(_,j)=>{const radius=25-j*2.72;return new THREE.Vector3(Math.cos(angle)*radius,3.0,Math.sin(angle)*radius);});});
const scene=new THREE.Scene();scene.background=new THREE.Color(0xa4c4c7);scene.fog=new THREE.FogExp2(0xa4c4c7,.0022);
const world=new THREE.Group();scene.add(world);
scene.add(new THREE.HemisphereLight(0xd5e8ff,0x273e32,1.45));
const sun=new THREE.DirectionalLight(0xffe5b5,3.9);sun.position.set(-22,40,24);scene.add(sun);
const accent=new THREE.PointLight(0x64f9ef,32,35);accent.position.set(0,11,0);scene.add(accent);
const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.88,...extra});
const rock=mat(0x58645f),moss=mat(0x496b4e),stone=mat(0x9c9582),gold=mat(0xc9a76e),dark=mat(0x334744),water=mat(0x55d6e9,{metalness:.1,roughness:.3,transparent:true,opacity:.76}),crystal=mat(0x77eaff,{emissive:0x2dbbc5,emissiveIntensity:1.5,metalness:.25,roughness:.15});
const cylinder=(r1,r2,h,m,x,y,z,n=8)=>{const o=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,n),m);o.position.set(x,y,z);o.castShadow=true;world.add(o);return o;};
const box=(w,h,d,m,x,y,z)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);world.add(o);return o;};
const cone=(r,h,m,x,y,z,n=7)=>{const o=new THREE.Mesh(new THREE.ConeGeometry(r,h,n),m);o.position.set(x,y,z);world.add(o);return o;};
const rand=(i)=>{const v=Math.sin(i*78.233+42.5)*43758.5453;return v-Math.floor(v);};


function stoneTexture(base,seed=1){
 const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');
 x.fillStyle=base;x.fillRect(0,0,256,256);
 for(let i=0;i<9000;i++){
  const px=rand(i*1.97+seed)*256,py=rand(i*2.87+seed)*256,v=Math.floor(rand(i*3.37+seed)*100);
  x.fillStyle=i%3?'rgba(13,19,14,'+(rand(i+seed)*.15)+')':'rgba(239,226,190,'+(rand(i+seed)*.11)+')';
  x.fillRect(px,py,1+rand(i+5)*5,1+rand(i+8)*4);
 }
 for(let i=0;i<26;i++){
  x.strokeStyle='rgba(23,34,27,'+(.07+rand(i+seed)*.16)+')';x.lineWidth=.5+rand(i+seed)*2;
  x.beginPath();const a=rand(i*11+seed)*256,b=rand(i*13+seed)*256;x.moveTo(a,b);x.lineTo(a+rand(i*7+seed)*70-35,b+rand(i*17+seed)*65-32);x.stroke();
 }
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;return t;
}
const stoneTex=stoneTexture('#99958a',21),rockTex=stoneTexture('#737c74',31),mossTex=stoneTexture('#526e50',51);
rock.map=rockTex;rock.color.set(0xffffff);rock.needsUpdate=true;
moss.map=mossTex;moss.color.set(0xffffff);moss.needsUpdate=true;
stone.map=stoneTex;stone.color.set(0xffffff);stone.needsUpdate=true;
// Photographic terrain assets from the public Three.js example library.
// All materials retain local procedural textures when the external files cannot load.
const textureLoader=new THREE.TextureLoader();
textureLoader.setCrossOrigin('anonymous');
function photoTexture(path,repeat,apply){
 textureLoader.load('https://threejs.org/examples/textures/'+path,texture=>{
  texture.colorSpace=THREE.SRGBColorSpace;
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
  texture.repeat.set(repeat,repeat);texture.anisotropy=8;
  apply(texture);
 },undefined,error=>console.warn('Fototextuur niet geladen:',path,error));
}
photoTexture('terrain/grasslight-big.jpg',6,texture=>{
 moss.map=texture;moss.color.set(0xb9c6ac);moss.roughness=1;moss.needsUpdate=true;
});
photoTexture('brick_diffuse.jpg',3,texture=>{
 stone.map=texture;stone.color.set(0xb3aa98);stone.roughness=.96;stone.needsUpdate=true;
});

function cinematicBackdrop(){
 const c=document.createElement('canvas');c.width=1024;c.height=512;const x=c.getContext('2d');
 const gradient=x.createLinearGradient(0,0,0,512);
 gradient.addColorStop(0,'#14273c');gradient.addColorStop(.4,'#657f9a');gradient.addColorStop(.72,'#d7a883');gradient.addColorStop(1,'#a6a8a5');
 x.fillStyle=gradient;x.fillRect(0,0,1024,512);
 const glow=x.createRadialGradient(750,310,3,750,310,230);
 glow.addColorStop(0,'rgba(255,246,212,.85)');glow.addColorStop(.4,'rgba(255,203,145,.26)');glow.addColorStop(1,'rgba(255,180,110,0)');
 x.fillStyle=glow;x.fillRect(0,0,1024,512);
 for(let layer=0;layer<4;layer++){
  const base=345+layer*43;x.beginPath();x.moveTo(0,512);
  for(let px=0;px<=1024;px+=8)x.lineTo(px,base+Math.sin(px*.012+layer*1.8)*27+Math.sin(px*.037+layer*2)*13+Math.sin(px*.083+layer)*7);
  x.lineTo(1024,512);x.closePath();x.fillStyle=['#758590','#607482','#475e6c','#334d5b'][layer];x.fill();
 }
 const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
 const sky=new THREE.Mesh(new THREE.SphereGeometry(230,48,24),new THREE.MeshBasicMaterial({map:tex,side:THREE.BackSide,depthWrite:false,fog:false}));
 sky.rotation.y=.5;scene.add(sky);scene.background=new THREE.Color(0x667c8e);scene.fog=new THREE.FogExp2(0x92a6b0,.006);
}
cinematicBackdrop();

const clouds=[];
function addAtmosphere(){
 const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');
 const g=x.createRadialGradient(64,64,0,64,64,63);g.addColorStop(0,'rgba(237,249,246,.40)');g.addColorStop(.45,'rgba(219,236,239,.17)');g.addColorStop(1,'rgba(219,236,239,0)');x.fillStyle=g;x.fillRect(0,0,128,128);
 const tex=new THREE.CanvasTexture(c);
 for(let i=0;i<38;i++){const a=rand(i+90)*Math.PI*2,r=15+rand(i+111)*55;
  const o=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false,opacity:.58}));
  o.position.set(Math.cos(a)*r,-3+rand(i+120)*17,Math.sin(a)*r);o.scale.set(18+rand(i+130)*24,6+rand(i+140)*11,1);scene.add(o);clouds.push(o);
 }
}
addAtmosphere();

function build(){
 // Floating mountain archipelago: irregular, layered cliffs instead of a flat disk.
 const cliffMaterials=[rock,rock,rock,rock];
 const green=[moss,mat(0x668a5e,{roughness:1}),mat(0x3c674d,{roughness:1})];
 const stoneDetail=[stone,stone,stone];
 const flame=new THREE.MeshStandardMaterial({color:0xffb14b,emissive:0xff6a10,emissiveIntensity:3,roughness:.3});
 const leaf=new THREE.MeshStandardMaterial({color:0x285a42,roughness:1,side:THREE.DoubleSide});
 const groupMesh=(geo,m,x,y,z,parent=world)=>{const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;};
 const boulder=(x,y,z,scale,material=rock)=>{
 const geo=new THREE.IcosahedronGeometry(1,3),pos=geo.attributes.position;
 for(let j=0;j<pos.count;j++){const px=pos.getX(j),py=pos.getY(j),pz=pos.getZ(j);
  const noise=.83+.18*Math.sin(px*8+py*5+pz*9)+.11*Math.sin(px*17-pz*13)+.06*Math.cos(py*31+px*19);
  pos.setXYZ(j,px*noise,py*noise,pz*noise);
 }
 geo.computeVertexNormals();
 const o=groupMesh(geo,material,x,y,z);o.scale.set(scale*(.75+rand(x)*.6),scale*(.65+rand(z)*.6),scale*(.75+rand(x+z)*.5));o.rotation.set(rand(x+1),rand(z+2),rand(y+3));return o;
};
 // Rugged plateau and protruding rock ledges.
 // Rebuilt ground mesh with eight REAL OPEN CUTOUTS. The bridge crosses empty space,
 // not a dark decal on top of solid ground.
 const islandOutline=new THREE.Shape();
 for(let j=0;j<=128;j++){
  const theta=j*Math.PI*2/128;
  const radius=30.1+.38*Math.sin(theta*17)+.27*Math.cos(theta*31);
  const px=Math.cos(theta)*radius,pz=Math.sin(theta)*radius;
  if(j===0)islandOutline.moveTo(px,pz);else islandOutline.lineTo(px,pz);
 }
 for(let route=0;route<8;route++){
  const theta=route*Math.PI/4,dx=Math.cos(theta),dz=Math.sin(theta),nx=-dz,nz=dx;
  const inner=16.8,outer=28.9,halfWidth=3.1;
  const hole=new THREE.Path();
  hole.moveTo(dx*inner+nx*halfWidth,dz*inner+nz*halfWidth);
  hole.lineTo(dx*outer+nx*halfWidth,dz*outer+nz*halfWidth);
  hole.lineTo(dx*outer-nx*halfWidth,dz*outer-nz*halfWidth);
  hole.lineTo(dx*inner-nx*halfWidth,dz*inner-nz*halfWidth);
  hole.closePath();islandOutline.holes.push(hole);
 }
 const islandGeometry=new THREE.ExtrudeGeometry(islandOutline,{depth:5.2,bevelEnabled:false,curveSegments:128,steps:1});
 const islandMesh=new THREE.Mesh(islandGeometry,[moss,rock]);
 islandMesh.rotation.x=Math.PI/2;islandMesh.position.y=2.85;
 islandMesh.castShadow=true;islandMesh.receiveShadow=true;world.add(islandMesh);
 for(let i=0;i<80;i++){const a=i*2.399963,r=24+rand(i+21)*7,x=Math.cos(a)*r,z=Math.sin(a)*r;
  boulder(x,-3.2-rand(i+5)*5,z,2.2+rand(i+18)*3,cliffMaterials[i%4]);
  if(i%4===0)boulder(x*.93,-1.2,z*.93,1.8,green[i%3]);
 }
 for(let i=0;i<22;i++){const a=i*Math.PI*2/22,r=30.5,x=Math.cos(a)*r,z=Math.sin(a)*r;
  boulder(x,-9-rand(i)*3,z,4+rand(i+9)*2,cliffMaterials[i%4]);
 }
 // Natural terraces, waterfalls with spray and plunge pools.

 const waterCanvas=document.createElement('canvas');waterCanvas.width=128;waterCanvas.height=512;
 const waterCtx=waterCanvas.getContext('2d');waterCtx.fillStyle='#7ebecb';waterCtx.fillRect(0,0,128,512);
 for(let streak=0;streak<360;streak++){
  const xx=rand(streak+122)*128,yy=rand(streak+221)*512;
  waterCtx.fillStyle=streak%4===0?'rgba(255,255,255,.70)':'rgba(218,250,255,.25)';
  waterCtx.fillRect(xx,yy,1+rand(streak+13)*4,22+rand(streak+33)*110);
 }
 const waterTexture=new THREE.CanvasTexture(waterCanvas);waterTexture.colorSpace=THREE.SRGBColorSpace;
 waterTexture.wrapS=waterTexture.wrapT=THREE.RepeatWrapping;waterTexture.repeat.set(1,2);
 const waterfallMaterial=new THREE.MeshStandardMaterial({map:waterTexture,color:0xc5f4ff,emissive:0x2a6c81,emissiveIntensity:.24,transparent:true,opacity:.85,side:THREE.DoubleSide,roughness:.17,depthWrite:false});
 world.userData.waterTexture=waterTexture;
 const falls=[];
 for(let i=0;i<9;i++){const a=i*Math.PI*2/9+.21,x=Math.cos(a)*28.8,z=Math.sin(a)*28.8;
  const fall=groupMesh(new THREE.PlaneGeometry(2.2+rand(i)*1.7,12+rand(i+3)*7,8,14),
    waterfallMaterial,x,-7.8,z);
  fall.rotation.y=Math.PI/2-a;
  const p=fall.geometry.attributes.position;for(let k=0;k<p.count;k++){const xx=p.getX(k),yy=p.getY(k);p.setZ(k,.18*Math.sin(yy*2.4+xx*3.8)+.07*Math.sin(yy*8+xx*5));}fall.geometry.computeVertexNormals();
  falls.push(fall);
  for(let k=0;k<6;k++){const spray=groupMesh(new THREE.SphereGeometry(.16+rand(k+i)*.24,7,5),mat(0xd4f7ef,{transparent:true,opacity:.6}),x+Math.cos(a)*(k*.2),-14+rand(k+i+8)*2,z+Math.sin(a)*(k*.2));spray.scale.y=.35;}
 }
 world.userData.falls=falls;

 // Load licensed CC0 GLB vegetation from Kenney via the published asset repository.
 // Procedural vegetation is a fallback ONLY when the actual files fail to load.
 const forestAssetBase='https://cdn.jsdelivr.net/gh/syuhei176/ai-game-assets@v1/models/environment/';
 const forestLoader=new GLTFLoader();
 const treePlacements=[];
 for(let i=0;i<104;i++){
  const angle=rand(i+24)*Math.PI*2,radius=11+rand(i+47)*17.3;
  const nearest=Math.abs(Math.atan2(Math.sin(angle*4),Math.cos(angle*4)))/4;
  if(nearest<.14||i%13===0)continue;
  treePlacements.push({x:Math.cos(angle)*radius,z:Math.sin(angle)*radius,
    pine:i%3!==0,scale:.85+rand(i+55)*.45,angle:rand(i+41)*Math.PI*2});
 }
 const forestFallback=()=>{
   // Pine forest with organic crowns, visible gaps around the eight challenge routes.
   const bark=mat(0x493b31,{roughness:1});
   const needles=[mat(0x183d33),mat(0x295746),mat(0x3b6248)];
   const canopy=[mat(0x395b3e),mat(0x527344),mat(0x65784a)];
   for(let i=0;i<104;i++){
    const a=rand(i+24)*Math.PI*2,r=11+rand(i+47)*17.3,x=Math.cos(a)*r,z=Math.sin(a)*r;
    const nearest=Math.abs(Math.atan2(Math.sin(a*4),Math.cos(a*4)))/4;
    if(nearest<.14||i%13===0)continue;
    const height=3.8+rand(i+55)*5.2,pine=i%3!==0;
    cylinder(.10,.22,height*.72,bark,x,height*.36+2.8,z,9);
    if(pine){
     for(let layer=0;layer<4;layer++){
      const crown=groupMesh(new THREE.ConeGeometry((1.3-layer*.21)*(.8+rand(i+3)*.3),height*.42,11),needles[(i+layer)%3],x,2.8+height*.32+layer*height*.19,z);
      crown.rotation.y=rand(i+layer)*6;
     }
    }else{
     for(let layer=0;layer<5;layer++){
      const angle=layer*2.4;
      const crown=groupMesh(new THREE.IcosahedronGeometry(1,3),canopy[(i+layer)%3],x+Math.sin(angle)*.5,2.8+height*.65+Math.sin(layer)*.5,z+Math.cos(angle)*.5);
      crown.scale.set(.85+rand(i+layer)*.6,1+rand(i+layer+4)*.55,.9+rand(i+layer+6)*.6);
     }
    }
   }
  
 };
 Promise.all([
  forestLoader.loadAsync(forestAssetBase+'tree_pine.glb'),
  forestLoader.loadAsync(forestAssetBase+'tree_oak.glb'),
  forestLoader.loadAsync(forestAssetBase+'rock_large.glb')
 ]).then(([pine,oak,rockAsset])=>{
  const sources=[pine.scene,oak.scene,rockAsset.scene];
  const bounds=sources.map(source=>{const box=new THREE.Box3().setFromObject(source);return Math.max(.01,box.max.y-box.min.y);});
  const bases=sources.map(source=>new THREE.Box3().setFromObject(source).min.y);
  for(const item of treePlacements){
   const kind=item.pine?0:1,tree=sources[kind].clone(true);
   const size=(item.pine?6.4:5.2)*item.scale/bounds[kind];
   tree.scale.setScalar(size);tree.rotation.y=item.angle;
   tree.position.set(item.x,2.88-bases[kind]*size,item.z);
   tree.traverse(obj=>{if(obj.isMesh){obj.castShadow=true;obj.receiveShadow=true;}});
   world.add(tree);
  }
  for(let i=0;i<35;i++){
   const angle=rand(i+777)*Math.PI*2,radius=10+rand(i+909)*17;
   if(Math.abs(Math.atan2(Math.sin(angle*4),Math.cos(angle*4)))/4<.16)continue;
   const stoneModel=sources[2].clone(true),size=(.65+rand(i+330)*1.2)/bounds[2];
   stoneModel.scale.setScalar(size);stoneModel.position.set(Math.cos(angle)*radius,2.85-bases[2]*size,Math.sin(angle)*radius);
   stoneModel.rotation.y=rand(i+55)*6.28;stoneModel.traverse(obj=>{if(obj.isMesh)obj.receiveShadow=true;});
   world.add(stoneModel);
  }
  console.info('De Machtentempel: CC0 GLB-bomen en rotsen geladen.');
 }).catch(err=>{console.warn('CC0 GLB-bos niet beschikbaar; reservevegetatie ingeschakeld',err);forestFallback();});
 // Eight raised stone bridges with individually weathered flagstones, carved balustrades and glowing rune gateways.
 for(let i=0;i<8;i++){
  const a=i*Math.PI/4,radial=new THREE.Vector3(Math.cos(a),0,Math.sin(a));
  const tangent=new THREE.Vector3(-Math.sin(a),0,Math.cos(a));
  for(let j=0;j<38;j++){const r=7.8+j*.49,p=radial.clone().multiplyScalar(r),y=2.4+(25-r)*.012;
   const slab=box(5.0,.4,.53,stoneDetail[(i+j)%3],p.x,y,p.z);slab.rotation.y=a;slab.rotation.z=(rand(i*44+j)-.5)*.025;
   if(j%4===0){for(const side of [-1,1]){const edge=p.clone().addScaledVector(tangent,side*2.62);
    const pedestal=box(.55,.9,.55,stoneDetail[(i+j+1)%3],edge.x,y+.5,edge.z);pedestal.rotation.y=a;
    if(j%8===0){const brazier=groupMesh(new THREE.SphereGeometry(.24,9,7),flame,edge.x,y+1.15,edge.z);if(j===0){const light=new THREE.PointLight(0xffa54d,5,8);light.position.copy(brazier.position);scene.add(light);}}
   }}
  }
  const gateR=26.8,gx=Math.cos(a)*gateR,gz=Math.sin(a)*gateR;
  const gate=new THREE.Group();gate.position.set(gx,2.9,gz);gate.rotation.y=Math.PI/2-a;
  for(const side of [-1,1]){const pillar=groupMesh(new THREE.CylinderGeometry(.54,.68,4.2,10),stoneDetail[i%3],side*1.45,2.1,0,gate);
   const cap=groupMesh(new THREE.BoxGeometry(1.5,.55,1.2),gold,side*1.45,4.4,0,gate);}
  groupMesh(new THREE.BoxGeometry(4.1,.7,1.3),stone,0,4.9,0,gate);
  const glow=groupMesh(new THREE.TorusGeometry(1.14,.12,10,32),mat(THREE_COLORS[i],{emissive:THREE_COLORS[i],emissiveIntensity:2.8}),0,2.5,0,gate);
  glow.scale.y=1.5;world.add(gate);
 }
 // Monumental multi-tiered sanctuary with colonnades, carved stonework and a luminous doorway.
 const templeStart=world.children.length;
 for(let tier=0;tier<5;tier++)cylinder(9.7-tier*.45,10.2-tier*.45,.44,stoneDetail[tier%3],0,1.2+tier*.44,0,24);
 cylinder(7.6,8,7.8,stoneDetail[1],0,7.5,0,20);
 for(let i=0;i<16;i++){const a=i*Math.PI*2/16,x=Math.cos(a)*8.1,z=Math.sin(a)*8.1;
  cylinder(.5,.67,8.4,stoneDetail[i%3],x,7.5,z,12);
  cylinder(.78,.78,.5,gold,x,11.95,z,12);
  cylinder(.76,.76,.4,stone,x,3.1,z,12);
 }
 cylinder(9,9.1,1.1,stone,0,12.5,0,24);
 cylinder(9.5,9.5,.45,gold,0,13.25,0,24);
 for(let i=0;i<4;i++)cylinder(7.8-i*.75,8.2-i*.75,1.15,stoneDetail[i%3],0,14.05+i*.96,0,24);
 cone(5.5,5.7,stoneDetail[0],0,19.6,0,16);
 for(let i=0;i<16;i++){const a=i*Math.PI*2/16;
  const column=box(.4,2.6,.45,gold,Math.cos(a)*7.8,13.8,Math.sin(a)*7.8);column.rotation.y=a;}
 // Portal front oriented toward the student route.
 box(4.5,7.5,.8,dark,0,7.3,8);
 box(5.4,.8,1.1,gold,0,11.2,8);
 const portal=box(3.15,5.8,.15,mat(0xffd17a,{emissive:0xffb12e,emissiveIntensity:2.2}),0,7.2,8.52);
 const portalLight=new THREE.PointLight(0xffb650,22,23);portalLight.position.set(0,8,10);scene.add(portalLight);
 for(let k=0;k<10;k++){const a=k*2.399,r=5.3+rand(k)*3.5;boulder(Math.cos(a)*r,3.8,Math.sin(a)*r,.5,stoneDetail[k%3]);}
 // Hanging ivy on the temple.
 for(let i=0;i<35;i++){const a=rand(i+350)*Math.PI*2,x=Math.cos(a)*8.3,z=Math.sin(a)*8.3;
  const ivy=groupMesh(new THREE.ConeGeometry(.23,1.5+rand(i)*2.5,6),leaf,x,10-rand(i+2)*3,z);ivy.rotation.z=Math.sin(a)*.22;}
 // Scale the whole sanctuary as one coherent landmark so it no longer obscures the island.
 const sanctuary=new THREE.Group();
 const templeParts=world.children.slice(templeStart);
 for(const part of templeParts){world.remove(part);sanctuary.add(part);}
 sanctuary.scale.setScalar(.68);sanctuary.position.y=1.1;world.add(sanctuary);
 const guardian=new THREE.Group();guardian.position.set(0,17,-3);
 const cloak=new THREE.Mesh(new THREE.ConeGeometry(1.1,3.3,12),mat(0x263947));guardian.add(cloak);
 const head=new THREE.Mesh(new THREE.IcosahedronGeometry(.85,2),mat(0x738b91,{metalness:.45}));head.position.y=2;guardian.add(head);
 const gem=new THREE.Mesh(new THREE.OctahedronGeometry(.62),crystal);gem.position.set(0,3.7,0);guardian.add(gem);guardian.userData.gem=gem;world.add(guardian);world.userData.guardian=guardian;
 // The first challenge takes place on a narrow, unstable bridge over a clearly
 // visible abyss. Each of the eight team approaches has its own ravine section.
 const abyssBlack=new THREE.MeshStandardMaterial({color:0x071019,roughness:1,side:THREE.DoubleSide});
 const abyssRock=new THREE.MeshStandardMaterial({color:0x303e40,map:rockTex,roughness:1,side:THREE.DoubleSide});
 const plankWood=new THREE.MeshStandardMaterial({color:0x75513a,roughness:.92});
 const ropeMat=new THREE.MeshStandardMaterial({color:0xd1b48a,roughness:1});
 const ravineGroups=[];
 for(let route=0;route<8;route++){
  const angle=route*Math.PI/4;
  const bridge=new THREE.Group();
  bridge.rotation.y=-angle;
  world.add(bridge);ravineGroups.push(bridge);
  // Local +X is the outward direction: span the outer rim (r=25) to r=19.
  const make=(geo,m,x,y,z)=>{
   const mesh=new THREE.Mesh(geo,m);mesh.position.set(x,y,z);
   mesh.castShadow=true;mesh.receiveShadow=true;bridge.add(mesh);return mesh;
  };
  // Black fissure with steep jagged walls descending well below the island.
  // Leave the top OPEN: a flat black plane used to hide the depth of the ravine.
  const voidFloor=make(new THREE.PlaneGeometry(8.7,9.4),abyssBlack,22.4,-18.0,0);voidFloor.rotation.x=-Math.PI/2;
  for(const edge of [-1,1]){
   const lip=make(new THREE.BoxGeometry(9.4,.7,.75),abyssRock,22.4,2.85,edge*4.5);
   for(let depth=0;depth<5;depth++){
    const ridge=make(new THREE.BoxGeometry(9.1,.5,.85),abyssRock,22.4,1-depth*3.4,edge*(4.4-depth*.22));
    ridge.rotation.x=edge*.11;
   }
  }
  for(const side of [-1,1]){
   const wall=make(new THREE.BoxGeometry(8.7,16,1.05),abyssRock,22.4,-5.0,side*4.35);
   for(let j=0;j<10;j++){
    const shard=make(new THREE.ConeGeometry(.65+rand(route*17+j)*.85,3.8+rand(route*19+j)*5,6),rock,
      18.4+j*.87,-5.8-rand(j+route)*2,side*(3.55+rand(j+route*8)*.65));
    shard.rotation.z=(rand(j*3+route)-.5)*.45;
   }
  }
  // A winding footbridge: uneven individual planks, two ropes and upright posts.
  for(let j=0;j<13;j++){
   const x=18.0+j*.72;
   const plank=make(new THREE.BoxGeometry(.67,.20,2.25),plankWood,x,3.40,.10*Math.sin(j*.85));
   plank.rotation.y=(rand(j+route*31)-.5)*.09;
   plank.rotation.z=(rand(j+route*13)-.5)*.075;
   if(j%3===0){
    for(const side of [-1,1]){
     make(new THREE.CylinderGeometry(.065,.08,1.45,8),plankWood,x,4.1,side*1.12);
    }
   }
  }
  for(const side of [-1,1]){
   const points=[];
   for(let j=0;j<=30;j++){
    const x=18+j*.31;
    points.push(new THREE.Vector3(x,4.7-.24*Math.sin(j/30*Math.PI),side*1.12));
   }
   make(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),44,.045,7,false),ropeMat,0,0,0);
  }
  // Blue depth haze makes the gulf legible from the student's camera.
  const haze=make(new THREE.PlaneGeometry(7.8,8.0),new THREE.MeshBasicMaterial({color:0x28617b,transparent:true,opacity:.12,depthWrite:false,side:THREE.DoubleSide}),22.4,-12.0,0);
  haze.rotation.x=-Math.PI/2;
 }
 world.userData.ravineGroups=ravineGroups;
 // Grand approach: illuminated carved walkway, portals and suspended ruins.
 const approach=new THREE.Group();world.add(approach);
 const buildPart=(geo,material,x,y,z,parent=approach)=>{const o=new THREE.Mesh(geo,material);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;};
 const carved=mat(0x99927e,{map:stoneTex,roughness:.83});
 const gilded=mat(0xd9b26b,{metalness:.64,roughness:.33});
 const magical=[0x5de6e4,0x8e69ff,0x7cffaf,0xffc363];
 // A recognizable front-facing ceremonial road and wide stairway.
 for(let j=0;j<22;j++){
  const z=10.3+j*.83;
  const slab=buildPart(new THREE.BoxGeometry(7.1,.28,.78),carved,0,3.0,z);
  if(j%3===0){
   for(const side of [-1,1]){
    const post=buildPart(new THREE.BoxGeometry(.78,1.55,.78),carved,side*4.15,3.85,z);
    buildPart(new THREE.BoxGeometry(1.04,.20,1.04),gilded,side*4.15,4.7,z);
    const fire=buildPart(new THREE.ConeGeometry(.24,.64,12),mat(0xffb35c,{emissive:0xff791c,emissiveIntensity:2.1,transparent:true,opacity:.9}),side*4.15,5.11,z);
    if(j%9===0){const light=new THREE.PointLight(0xffa750,7,13);light.position.set(side*4.15,5.1,z);scene.add(light);}
   }
  }
  if(j%4===0){
   const rune=buildPart(new THREE.OctahedronGeometry(.18,1),mat(0xffe9b5,{emissive:0xffc66b,emissiveIntensity:2}),0,3.28,z);
   rune.scale.y=.2;
  }
 }
 // Three distinct colored magical doorways on the outer terraces.
 for(let k=0;k<3;k++){
  const a=[.55,2.65,4.10][k],rr=20.7,x=Math.sin(a)*rr,z=Math.cos(a)*rr;
  const gate=new THREE.Group();gate.position.set(x,3.5,z);gate.rotation.y=a;world.add(gate);
  const m=mat(magical[k],{emissive:magical[k],emissiveIntensity:1.6,transparent:true,opacity:.85,side:THREE.DoubleSide});
  const left=buildPart(new THREE.CylinderGeometry(.48,.60,5.5,12),carved,-2,2.7,0,gate);
  buildPart(new THREE.CylinderGeometry(.48,.60,5.5,12),carved,2,2.7,0,gate);
  buildPart(new THREE.BoxGeometry(5.1,.65,1.15),gilded,0,5.6,0,gate);
  const halo=buildPart(new THREE.TorusGeometry(1.9,.16,12,48),m,0,2.9,.25,gate);halo.scale.y=1.35;
  const shimmer=buildPart(new THREE.PlaneGeometry(3.45,4.8),mat(magical[k],{emissive:magical[k],emissiveIntensity:1.1,transparent:true,opacity:.27,side:THREE.DoubleSide}),0,2.9,.20,gate);
 }
 // Satellite islands with ruins and their own long cascading waterfalls.
 for(let k=0;k<6;k++){
  const a=k*Math.PI/3+.35,rr=49+(k%2)*11,x=Math.sin(a)*rr,z=Math.cos(a)*rr,y=8+(k%3)*4;
  const floating=new THREE.Group();floating.position.set(x,y,z);world.add(floating);
  const mass=buildPart(new THREE.IcosahedronGeometry(7.5,3),rock,0,-2,0,floating);mass.scale.set(1.2,.68,1.05);
  buildPart(new THREE.CylinderGeometry(7.6,7.2,1.2,36),moss,0,1.0,0,floating);
  for(let c=0;c<5;c++){
   const angle=c*Math.PI*2/5,px=Math.cos(angle)*4.2,pz=Math.sin(angle)*4.2;
   buildPart(new THREE.CylinderGeometry(.45,.57,3.5,10),carved,px,3.1,pz,floating);
  }
  buildPart(new THREE.TorusGeometry(3.9,.28,12,36),gilded,0,5.0,0,floating).rotation.x=Math.PI/2;
  const fall=buildPart(new THREE.PlaneGeometry(2.4,19),water,4.5,-9.5,0,floating);fall.rotation.y=.3;
  const crystalIsland=buildPart(new THREE.OctahedronGeometry(1.25,1),mat(magical[k%4],{emissive:magical[k%4],emissiveIntensity:1.2}),0,4.4,0,floating);
 }
 // Banners with the infinity mark: mathematical theme integrated into the architecture.
 function bannerMaterial(){
  const c=document.createElement('canvas');c.width=256;c.height=512;
  const x=c.getContext('2d');x.fillStyle='#17335b';x.fillRect(0,0,256,512);
  x.strokeStyle='#d6ac5d';x.lineWidth=14;x.strokeRect(15,12,226,482);
  x.fillStyle='#f3d18b';x.font='bold 160px Georgia';x.textAlign='center';x.fillText('∞',128,300);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({map:t,side:THREE.DoubleSide,roughness:.9});
 }
 const banners=bannerMaterial();
 for(const side of [-1,1]){
  const banner=buildPart(new THREE.PlaneGeometry(2.1,4.6),banners,side*6.2,12.0,6.2);
  banner.rotation.y=side*.20;
 }
 // Layered, irregular mountain silhouettes; no triangular cone mountains.
 const mountainPalette=[0x738a87,0x819895,0x6c8583,0x9da9a3];
 for(let i=0;i<18;i++){
  const a=i*2.399,r=83+rand(i+220)*47,x=Math.cos(a)*r,z=Math.sin(a)*r;
  const height=24+rand(i+60)*28;
  const geo=new THREE.IcosahedronGeometry(1,3),pos=geo.attributes.position;
  for(let k=0;k<pos.count;k++){
   const px=pos.getX(k),py=pos.getY(k),pz=pos.getZ(k);
   const ridge=1+.22*Math.sin(px*13+pz*7)+.13*Math.cos(px*21-pz*17);
   pos.setXYZ(k,px*(12+height*.19)*ridge,py*height*.57,pz*(12+height*.19)*ridge);
  }
  geo.computeVertexNormals();
  const peak=groupMesh(geo,mat(mountainPalette[i%4],{map:rockTex,roughness:1}),x,-11,z);
  peak.rotation.y=rand(i+13)*Math.PI*2;
 }

}

build();

// Visible, animated set pieces for EVERY mathematical adventure stage.
// One set per route, aligned with each team's current checkpoint.
const encounters=[];
const encounterColors=[0x62dbff,0x45cfff,0xff7435,0x9b65ff,0x68f4ef,0xffd079];
const encounterMaterials=encounterColors.map(c=>new THREE.MeshStandardMaterial({color:c,emissive:c,emissiveIntensity:1.2,transparent:true,opacity:.78,side:THREE.DoubleSide}));
const stagePositions=[22.4,19.4,16.7,14.0,11.2,8.5];
function encounterMesh(group,geo,material,x,y,z){
 const mesh=new THREE.Mesh(geo,material);mesh.position.set(x,y,z);mesh.castShadow=true;group.add(mesh);return mesh;
}
for(let route=0;route<8;route++){
 const theta=route*Math.PI/4;
 const lane=new THREE.Group();lane.rotation.y=-theta;world.add(lane);
 const stages=[];
 for(let stage=0;stage<6;stage++){
  const root=new THREE.Group();root.position.set(stagePositions[stage],3.3,0);lane.add(root);stages.push(root);
  const magic=encounterMaterials[stage].clone();
  if(stage===0){
   // Falling bridge planks are independently animated on wrong answers.
   const planks=[];
   for(let j=0;j<7;j++){
    const plank=encounterMesh(root,new THREE.BoxGeometry(.46,.19,5.0),mat(0x6c4a32),j*.50-1.5,.16,0);
    planks.push(plank);
   }
   root.userData.planks=planks;
  }else if(stage===1){
   // Cascading waterfall and a gate that parts to reveal a stairway.
   const falls=[];
   for(const side of [-1,1]){
    const fall=encounterMesh(root,new THREE.PlaneGeometry(2.5,7.8),magic,0,2.2,side*1.2);
    fall.rotation.y=Math.PI/2;falls.push(fall);
   }
   for(let j=0;j<5;j++)encounterMesh(root,new THREE.BoxGeometry(.65,.22,2.4),stone,-j*.65,-.05+j*.35,0);
   root.userData.falls=falls;
  }else if(stage===2){
   // Dragon: wings, long neck, head, horns and an actual cone of fire.
   root.userData.wings=[];
   const body=encounterMesh(root,new THREE.SphereGeometry(1.0,18,12),mat(0x552b32),-1,2.6,0);
   body.scale.set(1.5,.8,.8);
   const neck=encounterMesh(root,new THREE.CylinderGeometry(.36,.68,2.2,12),mat(0x743c3a),-.2,3.6,0);neck.rotation.z=-.48;
   const head=encounterMesh(root,new THREE.ConeGeometry(.66,1.5,12),mat(0x8b4b41),.9,4.15,0);head.rotation.z=-Math.PI/2;root.userData.head=head;
   for(const side of [-1,1]){
    const wing=encounterMesh(root,new THREE.ConeGeometry(1.7,3.6,3),mat(0x68303a,{side:THREE.DoubleSide}),-1.2,3.6,side*1.0);
    wing.rotation.x=side*.6;wing.rotation.z=-.35;root.userData.wings.push(wing);
    encounterMesh(root,new THREE.ConeGeometry(.17,.8,8),gold,.9,4.65,side*.33).rotation.z=.45;
   }
   const flame=encounterMesh(root,new THREE.ConeGeometry(.75,4.0,18),new THREE.MeshBasicMaterial({color:0xff7927,transparent:true,opacity:.85,depthWrite:false}),3.1,4.0,0);
   flame.rotation.z=Math.PI/2;root.userData.flame=flame;
   const shield=encounterMesh(root,new THREE.SphereGeometry(2.1,32,20),new THREE.MeshStandardMaterial({color:0x78dfff,emissive:0x38baff,emissiveIntensity:1.3,transparent:true,opacity:.23,side:THREE.DoubleSide,depthWrite:false}),4.3,2.3,0);
   root.userData.shield=shield;
  }else if(stage===3){
   const ring=encounterMesh(root,new THREE.TorusGeometry(2.3,.29,14,48),magic,0,2.3,0);
   ring.rotation.y=Math.PI/2;root.userData.ring=ring;
   const portal=encounterMesh(root,new THREE.CircleGeometry(2.05,48),new THREE.MeshBasicMaterial({color:0x895cff,transparent:true,opacity:.32,side:THREE.DoubleSide,depthWrite:false}),0,2.3,0);
   portal.rotation.y=Math.PI/2;root.userData.portal=portal;
  }else if(stage===4){
   const crystals=[];
   for(let j=0;j<12;j++){
    const c=encounterMesh(root,new THREE.OctahedronGeometry(.45+(j%3)*.15,1),magic,(j%4-1.5)*1.0,.5+(j%3)*.5,(Math.floor(j/4)-1)*1.3);
    c.rotation.z=j*.47;crystals.push(c);
   }
   root.userData.crystals=crystals;
  }else{
   for(const side of [-1,1])encounterMesh(root,new THREE.CylinderGeometry(.45,.6,6,12),stone,0,2.6,side*2.6);
   encounterMesh(root,new THREE.BoxGeometry(1,1.0,6.4),gold,0,5.7,0);
   const door=encounterMesh(root,new THREE.BoxGeometry(.35,4.5,4.3),mat(0x5c3f29,{metalness:.3}),0,2.4,0);
   root.userData.door=door;
   encounterMesh(root,new THREE.IcosahedronGeometry(.65,2),magic,.5,5.8,0);
  }
 }
 encounters.push(stages);
}

function numberedTileLabel(n){
 const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');
 x.fillStyle='rgba(12,24,30,.84)';x.fillRect(0,0,128,128);
 x.strokeStyle='#d7b875';x.lineWidth=7;x.strokeRect(5,5,118,118);
 x.fillStyle='#fff1c4';x.font='bold 74px Georgia';x.textAlign='center';x.textBaseline='middle';x.fillText(String(n),64,67);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
 const o=new THREE.Mesh(new THREE.PlaneGeometry(1.05,1.05),new THREE.MeshBasicMaterial({map:t,transparent:true,depthWrite:false,side:THREE.DoubleSide}));
 o.rotation.x=-Math.PI/2;return o;
}
// The finale is a vaulted causeway toward a treasure chamber, not a numbered spreadsheet.
const finalCourse=new THREE.Group();scene.add(finalCourse);finalCourse.position.z=RACE.originZ;
const marble=mat(0x8b8576,{map:stoneTex,roughness:.92});
const bronze=mat(0xd2a653,{metalness:.78,roughness:.24});
const jewel=mat(0x79e5f3,{emissive:0x2b9ca7,emissiveIntensity:1.8,roughness:.15});
function finalePart(geometry,material,x,y,z){
 const o=new THREE.Mesh(geometry,material);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;finalCourse.add(o);return o;
}
// Thirty parallel race lanes, each made of sixteen individual stone squares.
const raceStone=new THREE.InstancedMesh(new THREE.BoxGeometry(RACE.laneWidth-.10,.34,RACE.stride-.12),marble,RACE.lanes*RACE.squares);
const tileTransform=new THREE.Object3D();
const raceColors=[new THREE.Color(0x7c807b),new THREE.Color(0x989487)];
const raceLabels=[];
let raceIndex=0;
for(let lane=0;lane<RACE.lanes;lane++){
 for(let step=0;step<16;step++){
  const z=RACE.startZ-step*RACE.stride,x=(lane-(RACE.lanes-1)/2)*RACE.laneWidth;
  tileTransform.position.set(x,3.07,z);tileTransform.updateMatrix();
  raceStone.setMatrixAt(raceIndex,tileTransform.matrix);
  raceStone.setColorAt(raceIndex,raceColors[(lane+step)%2]);
  raceIndex++;
 }
}
for(let step=0;step<RACE.squares;step++){
 const label=numberedTileLabel(step+1);
 const labels=new THREE.InstancedMesh(label.geometry,label.material,RACE.lanes);
 for(let lane=0;lane<RACE.lanes;lane++){
  tileTransform.position.set((lane-(RACE.lanes-1)/2)*RACE.laneWidth-.55,RACE.floorY+.015,RACE.startZ-step*RACE.stride+.7);
  tileTransform.rotation.set(-Math.PI/2,0,0);tileTransform.scale.setScalar(.65);tileTransform.updateMatrix();labels.setMatrixAt(lane,tileTransform.matrix);
 }
 finalCourse.add(labels);raceLabels.push(labels);
}
raceStone.castShadow=true;raceStone.receiveShadow=true;finalCourse.add(raceStone);
for(const side of [-1,1]){
 const edge=side*((RACE.lanes/2)*RACE.laneWidth+.65);
 for(let step=0;step<16;step+=3){
  const z=RACE.startZ-step*RACE.stride;
  finalePart(new THREE.CylinderGeometry(.35,.45,2.8,12),marble,edge,4.7,z);
  finalePart(new THREE.OctahedronGeometry(.3,1),jewel,edge,6.25,z);
 }
}
const vault=new THREE.Group();vault.position.set(0,3.35,RACE.startZ-16*RACE.stride-2);finalCourse.add(vault);
const vaultMesh=(geo,m,x,y,z)=>{const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=true;vault.add(o);return o;};
vaultMesh(new THREE.BoxGeometry(15,1,5),marble,0,0,0);
for(const side of [-1,1]){
 vaultMesh(new THREE.CylinderGeometry(1.15,1.45,11,16),marble,side*5.2,5.6,0);
 vaultMesh(new THREE.BoxGeometry(3.1,.65,3.1),bronze,side*5.2,11.1,0);
}
vaultMesh(new THREE.BoxGeometry(13,2.4,3.1),marble,0,11.5,0);
vaultMesh(new THREE.BoxGeometry(11,.45,3.5),bronze,0,12.9,0);
vaultMesh(new THREE.BoxGeometry(7.1,8,.5),mat(0x202c36,{metalness:.45}),0,4.1,1.55);
const gate=vaultMesh(new THREE.TorusGeometry(3.3,.36,16,64),bronze,0,5.2,1.95);gate.scale.y=1.22;
vaultMesh(new THREE.IcosahedronGeometry(1.1,2),jewel,0,5.4,2.0);
const treasure=new THREE.Group();treasure.position.set(0,1,-2);vault.add(treasure);
const chestBody=new THREE.Mesh(new THREE.BoxGeometry(3,1.5,2),mat(0x79502a,{metalness:.2,roughness:.55}));treasure.add(chestBody);
const chestLid=new THREE.Group();chestLid.position.set(0,.75,-1);treasure.add(chestLid);
const lid=new THREE.Mesh(new THREE.BoxGeometry(3.15,.35,2.15),bronze);lid.position.z=1;chestLid.add(lid);
const coinGeo=new THREE.CylinderGeometry(.18,.18,.07,12),coinMesh=new THREE.InstancedMesh(coinGeo,bronze,120),coinTransform=new THREE.Object3D();
for(let i=0;i<120;i++){coinTransform.position.set((rand(i+1200)-.5)*2.4,.8+rand(i+1300)*.5,(rand(i+1400)-.5)*1.5);coinTransform.rotation.set(rand(i)*.6,rand(i+1)*6,rand(i+2)*.5);coinTransform.updateMatrix();coinMesh.setMatrixAt(i,coinTransform.matrix);}treasure.add(coinMesh);
const victoryPositions=new Float32Array(180*3);for(let i=0;i<180;i++){victoryPositions[i*3]=(rand(i+1500)-.5)*18;victoryPositions[i*3+1]=rand(i+1600)*14;victoryPositions[i*3+2]=(rand(i+1700)-.5)*12;}
const victoryGeometry=new THREE.BufferGeometry();victoryGeometry.setAttribute('position',new THREE.BufferAttribute(victoryPositions,3));
const victory=new THREE.Points(victoryGeometry,new THREE.PointsMaterial({color:0xffd477,size:.19,transparent:true,opacity:.9,depthWrite:false,blending:THREE.AdditiveBlending}));victory.position.copy(vault.position);victory.visible=false;finalCourse.add(victory);
for(const side of [-1,1]){const x=side*((RACE.lanes/2)*RACE.laneWidth+.45);for(let j=0;j<9;j++){const z=RACE.startZ-j*5.6;finalePart(new THREE.BoxGeometry(.6,1.0,5.4),marble,x,3.6,z);}}
const crown=vaultMesh(new THREE.ConeGeometry(2.8,2.2,8),bronze,0,14.2,0);
finalCourse.visible=false;
const camera=new THREE.PerspectiveCamera(51,1,.1,400);camera.position.set(65,65,105);
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;sun.castShadow=true;sun.shadow.bias=-.0003;sun.shadow.normalBias=.035;sun.shadow.camera.far=250;scene.add(sun.target);sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-42;sun.shadow.camera.right=42;sun.shadow.camera.top=42;sun.shadow.camera.bottom=-42;renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;renderer.setClearColor(0xa4c4c7);
// Textured lantern models add architectural detail; failures never stop gameplay.
const gltfLoader=new GLTFLoader();
const assetBase='https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Assets@main/Models/';
gltfLoader.loadAsync(assetBase+'Lantern/glTF-Binary/Lantern.glb').then(gltf=>{
 [[9,4,10],[-9,4,10],[10,4,-9],[-10,4,-9],[0,4,28],[0,4,-28]].forEach(([x,y,z])=>{
  const model=gltf.scene.clone(true);model.position.set(x,y,z);model.scale.setScalar(.42);
  model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
  world.add(model);
 });
}).catch(e=>console.warn('3D-lantaarns niet geladen',e));
const mathSymbols=['∞','x','aⁿ','÷','√','◇','△','∑'];
const costumeColors=[0x2357ae,0x367448,0xf0e0b7,0xc34c29,0x2385b2,0x6841a0,0xc39138,0xb02b68];
function mathBadge(i){
 const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');x.fillStyle='#fff3c9';x.shadowColor='#ffcf64';x.shadowBlur=20;x.font='bold 130px Georgia';x.textAlign='center';x.textBaseline='middle';x.fillText(mathSymbols[i%8],128,128,240);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return new THREE.SpriteMaterial({map:t,transparent:true,depthWrite:false});
}
function character(g,i){
 const robe=mat(costumeColors[i%8],{roughness:.73}),trim=mat(0xe6bd72,{metalness:.67,roughness:.3}),boots=mat(0x3e2d27),skin=mat([0xf0c39d,0xc78e69,0xe9b790,0xb97d5d][i%4]),hair=mat([0x33251d,0x36251e,0xe1c494,0x9e452b,0x215c74,0x302438,0xc48c40,0x812f4a][i%8]);
 const add=(geo,m,x,y,z)=>{const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=true;g.add(o);return o;};
 for(const side of [-1,1]){
  add(new THREE.CapsuleGeometry(.17,.40,4,10),boots,side*.24,.33,.08);
  add(new THREE.CapsuleGeometry(.16,.53,4,10),robe,side*.24,.83,0);
  const arm=add(new THREE.CapsuleGeometry(.15,.69,4,10),skin,side*.65,1.57,0);arm.rotation.z=side*.28;
  add(new THREE.SphereGeometry(.27,14,10),trim,side*.53,2.05,0).scale.set(1,.60,1);
  add(new THREE.SphereGeometry(.06,10,8),boots,side*.16,2.68,.35);
 }
 add(new THREE.CylinderGeometry(.38,.61,1.08,20),robe,0,1.05,0);
 add(new THREE.CapsuleGeometry(.38,.7,6,16),robe,0,1.75,0);
 add(new THREE.BoxGeometry(.82,.12,.52),boots,0,1.38,0);
 add(new THREE.BoxGeometry(.18,.17,.08),trim,0,1.38,.30);
 add(new THREE.SphereGeometry(.43,22,16),skin,0,2.66,0).scale.set(.96,1.1,.87);
 add(new THREE.SphereGeometry(.45,20,12),hair,0,2.93,-.04).scale.set(1,.55,.95);
 const cloak=add(new THREE.ConeGeometry(.80,1.9,22,1,true),robe,0,1.36,-.28);cloak.rotation.z=Math.PI;
 add(new THREE.SphereGeometry(.12,12,10),trim,0,2.13,.41);
 // Tailored details give each adventurer a distinct silhouette and richer material layering.
 const silk=mat(costumeColors[i%8],{metalness:.12,roughness:.38,side:THREE.DoubleSide});
 const silver=mat(0xe5e1d2,{metalness:.7,roughness:.27});
 for(const side of [-1,1]){
  const pauldron=add(new THREE.SphereGeometry(.33,20,14),i%2?trim:silver,side*.55,2.04,.03);
  pauldron.scale.set(1,.47,1.25);
  const cuff=add(new THREE.TorusGeometry(.18,.05,8,20),trim,side*.76,1.22,.05);cuff.rotation.x=Math.PI/2;
  const hairLock=add(new THREE.CapsuleGeometry(.10,.36,4,12),hair,side*.34,2.66,-.10);
  hairLock.rotation.z=side*.19;
  const bootTrim=add(new THREE.TorusGeometry(.18,.04,8,20),trim,side*.24,.48,.08);bootTrim.rotation.x=Math.PI/2;
 }
 for(let k=0;k<7;k++){
  const angle=k*Math.PI*2/7;
  const seam=add(new THREE.CylinderGeometry(.018,.024,.82,6),i%2?trim:silver,Math.cos(angle)*.46,1.06,Math.sin(angle)*.46);
  seam.rotation.z=-Math.cos(angle)*.13;
 }
 if(i===1||i===5){ // Elven circlet with side ornaments
  const band=add(new THREE.TorusGeometry(.42,.045,8,32),trim,0,2.88,.02);band.rotation.x=Math.PI/2;
  add(new THREE.OctahedronGeometry(.12,1),jewel,0,2.94,.39);
 }else if(i===2||i===6){ // Armoured explorer
  const crest=add(new THREE.BoxGeometry(.55,.15,.12),trim,0,3.07,0);
  const visor=add(new THREE.TorusGeometry(.39,.055,8,28),silver,0,2.81,.03);visor.rotation.x=Math.PI/2;
 }else if(i===3||i===7){ // Scholar with hood and ornament
  const hood=add(new THREE.SphereGeometry(.51,24,16,0,Math.PI*2,0,Math.PI*.57),silk,0,2.81,-.11);
  hood.scale.set(1.12,1.13,1.08);
 }
 const mark=new THREE.Sprite(mathBadge(i));mark.position.set(0,1.82,.52);mark.scale.set(.56,.56,1);g.add(mark);
 if(i===0||i===1||i===4){
  const staff=add(new THREE.CylinderGeometry(.04,.06,2.6,10),boots,-.96,1.48,.12);staff.rotation.z=-.07;
  add(new THREE.SphereGeometry(.24,16,12),mat(i===1?0x79ec88:0x69c7ff,{emissive:i===1?0x25652b:0x235e9e,emissiveIntensity:.8}),-1.07,2.80,.12);
 }else if(i===2||i===5){add(new THREE.BoxGeometry(.66,.16,.49),boots,-.85,1.41,.44);}
 else if(i===3){add(new THREE.BoxGeometry(.39,.39,.39),mat(0xf76842,{emissive:0x8b260c,emissiveIntensity:.7}),-.88,1.49,.32);}
 else{add(new THREE.TorusGeometry(.27,.06,8,24),trim,-.85,1.48,.36);}
}
// Actual skinned, textured glTF character asset with animation.
// The procedural figures are used only if the external model cannot load.
let soldierAsset=null;
const soldierMixers=new Map();
const soldierClock=new THREE.Clock();
const soldierLoader=new GLTFLoader();
soldierLoader.load('https://threejs.org/examples/models/gltf/Soldier.glb',gltf=>{
 soldierAsset=gltf;
 portraitCache=null;
 for(const [id,g] of avatars)installDetailedCharacter(g,g.userData.avatarIndex||0,id);
},undefined,e=>console.warn('Gedetailleerd 3D-personagemodel niet beschikbaar; vereenvoudigde reservefiguren blijven zichtbaar.',e));
function installDetailedCharacter(group,index,id){
 if(!soldierAsset||group.userData.highDetail)return;
 const model=cloneSkinned(soldierAsset.scene);
 model.traverse(o=>{
  if(!o.isMesh)return;
  o.castShadow=true;o.receiveShadow=true;
  // Clone materials: one team's color must not change another team's outfit.
  if(o.material){
   o.material=o.material.clone();
   if(o.material.color){
    const tint=new THREE.Color().setHSL((index*.173)%1,.55,.42);
    o.material.color.lerp(tint,.48);
   }
  }
 });
 // Sample Soldier is human-scale (roughly 1.8m); scale up for the island.
 model.scale.set(1.35+(index%4)*.13,1.40+(index%5)*.11,1.25+(index%3)*.16);
 model.position.set(0,.03,0);
 group.add(model);
 const fallback=group.userData.fallback;
 if(fallback)fallback.visible=false;
 group.userData.highDetail=model;
 const accentColor=[0xffd88c,0x7fffd0,0xffe2ae,0xffa77d,0x7eeaff,0xc7a4ff,0xffdc7d,0xff98b8][index%8];
 // Legacy Soldier accessories: these are variants, not thirty independent hero models.
 const role=index%10;
 const archetype=Math.floor(index/10);
 const armorColor=new THREE.MeshStandardMaterial({color:new THREE.Color().setHSL((index*.137)%1,.52,.34),metalness:.65,roughness:.34});
 const metal=new THREE.MeshStandardMaterial({color:0xd4b77c,metalness:.83,roughness:.24});
 const addGear=(geo,m,x,y,z)=>{const part=new THREE.Mesh(geo,m);part.position.set(x,y,z);part.castShadow=true;group.add(part);return part;};
 if(role===0||role===5){
  const helm=addGear(new THREE.ConeGeometry(.39,.95,9),armorColor,0,3.06,0);
  helm.rotation.z=role===5?.18:0;
 }else if(role===1||role===6){
  const crown=addGear(new THREE.TorusGeometry(.34,.075,9,12),metal,0,2.95,0);crown.rotation.x=Math.PI/2;
  for(let j=0;j<5;j++)addGear(new THREE.ConeGeometry(.09,.45,6),metal,Math.sin(j*Math.PI*2/5)*.30,3.14,Math.cos(j*Math.PI*2/5)*.30);
 }else if(role===2||role===7){
  for(const side of [-1,1]){
   const horn=addGear(new THREE.ConeGeometry(.13,.95,9),metal,side*.29,3.12,-.04);horn.rotation.z=-side*.28;
  }
 }else if(role===3||role===8){
  const hood=addGear(new THREE.SphereGeometry(.47,16,12,0,Math.PI*2,0,Math.PI*.57),armorColor,0,2.83,-.05);
  hood.scale.set(1,1.08,1.03);
 }else{
  const halo=addGear(new THREE.TorusGeometry(.47,.045,10,36),metal,0,3.36,0);halo.rotation.x=Math.PI/2;
 }
 if(index%3===0){
  const staff=addGear(new THREE.CylinderGeometry(.045,.06,3.25,10),metal,.78,1.45,.12);
  addGear(new THREE.OctahedronGeometry(.22,1),new THREE.MeshStandardMaterial({color:accentColor,emissive:accentColor,emissiveIntensity:1.8}),.78,3.12,.12);
 }else if(index%3===1){
  const blade=addGear(new THREE.ConeGeometry(.11,1.35,4),metal,.74,1.28,.25);blade.rotation.z=-.23;
  addGear(new THREE.BoxGeometry(.54,.09,.16),armorColor,.74,.70,.25);
 }else{
  const shieldGear=addGear(new THREE.IcosahedronGeometry(.47,1),armorColor,-.68,1.52,.27);
  shieldGear.scale.set(.82,1.22,.35);
  addGear(new THREE.OctahedronGeometry(.14,1),metal,-.68,1.52,.46);
 }
 // Distinct fantasy silhouettes beyond a single uniform: robes, wings or heavy armor.
 if(archetype===1){
  const robe=addGear(new THREE.CylinderGeometry(.48,.82,1.25,12),armorColor,0,.75,-.06);
  robe.scale.z=.85;
  for(const side of [-1,1]){const fin=addGear(new THREE.ConeGeometry(.26,1.05,8),metal,side*.68,2.13,-.15);fin.rotation.z=side*.65;}
 }else if(archetype===2){
  for(const side of [-1,1]){
   const wing=addGear(new THREE.ConeGeometry(.48,2.2,5),armorColor,side*.88,2.06,-.62);
   wing.rotation.z=side*.58;wing.rotation.x=-.27;
  }
  const chest=addGear(new THREE.IcosahedronGeometry(.54,1),metal,0,1.72,.36);
  chest.scale.set(1.1,1.05,.32);
 }
 // Wearable fantasy details: glowing mathematical crest, belt, cape and head ornament.

 const crest=new THREE.Sprite(mathBadge(index));crest.position.set(0,1.6,.32);crest.scale.set(.52,.52,1);group.add(crest);
 const capeMat=new THREE.MeshStandardMaterial({color:costumeColors[index%8],roughness:.87,side:THREE.DoubleSide});
 const cape=new THREE.Mesh(new THREE.PlaneGeometry(.92,1.65,4,8),capeMat);
 cape.position.set(0,1.45,-.26);cape.rotation.x=-.16;group.add(cape);
 const shoulder=new THREE.Mesh(new THREE.TorusGeometry(.46,.075,10,32),new THREE.MeshStandardMaterial({color:0xdab777,metalness:.7,roughness:.3}));
 shoulder.position.set(0,2.15,0);shoulder.rotation.x=Math.PI/2;group.add(shoulder);
 if(soldierAsset.animations?.length){
  const mixer=new THREE.AnimationMixer(model);
  const clip=soldierAsset.animations.find(c=>/idle/i.test(c.name))||soldierAsset.animations[0];
  const actions={};for(const item of soldierAsset.animations)actions[item.name.toLowerCase()]=mixer.clipAction(item);
  mixer.clipAction(clip).play();group.userData.actions=actions;group.userData.action=mixer.clipAction(clip);soldierMixers.set(id,mixer);
 }
}
const avatars=new Map();
function nameLabel(name){
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=96;
 const ctx=canvas.getContext('2d');
 ctx.font='bold 39px Arial';ctx.textAlign='center';ctx.textBaseline='middle';
 ctx.shadowColor='#06101a';ctx.shadowBlur=9;ctx.lineWidth=9;ctx.strokeStyle='#06101a';
 const title=String(name||'Team').slice(0,22);
 ctx.strokeText(title,256,49,465);ctx.fillStyle='#fff0ce';ctx.fillText(title,256,49,465);
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthTest:true,transparent:true}));
 sprite.position.y=3.75;sprite.scale.set(3.2,.6,1);return sprite;
}

function avatar(id,index){let g=avatars.get(id);if(g)return g;g=new THREE.Group();const fallback=new THREE.Group();character(fallback,index);g.add(fallback);g.userData.fallback=fallback;g.userData.avatarIndex=index;g.userData.label=null;scene.add(g);avatars.set(id,g);installDetailedCharacter(g,index,id);return g;}
// Render the actual textured 3D character models as selectable portraits.
// No static cartoon SVGs once the GLB has loaded.
let portraitCache=null;
export function getFantasyPortraits(){
 if(portraitCache)return portraitCache;
 const portraitScene=new THREE.Scene();portraitScene.background=new THREE.Color(0x15273a);
 portraitScene.add(new THREE.HemisphereLight(0xeaf1ff,0x343d55,2.2));
 const light=new THREE.DirectionalLight(0xffdcb5,3.8);light.position.set(-3,7,8);portraitScene.add(light);
 const cam=new THREE.PerspectiveCamera(35,192/240,.1,100);cam.position.set(3.4,3.5,8.3);cam.lookAt(0,1.7,0);
 const portraitRenderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true,powerPreference:'low-power'});
 portraitRenderer.setPixelRatio(1);portraitRenderer.setSize(192,240,false);
 portraitRenderer.outputColorSpace=THREE.SRGBColorSpace;
 const portraits=[];
 for(let i=0;i<30;i++){
  const figure=new THREE.Group();portraitScene.add(figure);
  if(soldierAsset){installDetailedCharacter(figure,i,'portrait-'+i);soldierMixers.get('portrait-'+i)?.update(.18);}
  else {character(figure,i);}
  portraitRenderer.render(portraitScene,cam);
  portraits.push(portraitRenderer.domElement.toDataURL('image/png'));
  portraitScene.remove(figure);
  soldierMixers.get('portrait-'+i)?.stopAllAction();soldierMixers.delete('portrait-'+i);
 }
 portraitRenderer.dispose();portraitRenderer.forceContextLoss();
 portraitCache=portraits;return portraits;
}
const lerp=(a,b,t)=>a.clone().lerp(b,Math.max(0,Math.min(1,t)));
let activeRaceSlots=[];
function position(team,phase){const p=teamPosition(team,phase,activeRaceSlots);return new THREE.Vector3(p.x,p.y,p.z);}
let lastCanvas=null,frame=0;
export function draw3D(canvas,state,view,teamId,time){
 if(!canvas)return false;
 try{
 if(lastCanvas!==canvas){if(lastCanvas)lastCanvas.style.visibility='';const parent=canvas.parentElement;if(!parent)return false;renderer.domElement.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0';parent.style.position='relative';parent.insertBefore(renderer.domElement,canvas);canvas.style.visibility='hidden';lastCanvas=canvas;}
 const width=Math.max(1,canvas.clientWidth||canvas.width),height=Math.max(1,canvas.clientHeight||canvas.height);
 if(renderer.domElement.width!==Math.floor(width*renderer.getPixelRatio())||renderer.domElement.height!==Math.floor(height*renderer.getPixelRatio())){renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();}
 finalCourse.visible=state?.phase==='final'||state?.phase==='ended';world.visible=!finalCourse.visible;scene.fog.density=finalCourse.visible?.002:.006;
 sun.position.z=24+(finalCourse.visible?RACE.originZ:0);sun.target.position.z=finalCourse.visible?RACE.originZ:0;
 const teams=Object.values(state?.teams||{});const ids=new Set(teams.map(t=>t.id));
  if(finalCourse.visible){
   const slots=teams.map(t=>Number.isInteger(t.slot)?t.slot:(t.route||0)).sort((a,b)=>a-b).slice(0,RACE.lanes);
   const signature=slots.join(',');
   if(finalCourse.userData.laneSignature!==signature){
    activeRaceSlots=slots;
    finalCourse.userData.laneSignature=signature;
    const n=slots.length;
    const transform=new THREE.Object3D();
    for(let lane=0;lane<RACE.lanes;lane++){
     const active=lane<n;
     const x=(lane-(n-1)/2)*RACE.laneWidth;
     for(let step=0;step<RACE.squares;step++){
      transform.position.set(x,3.07,RACE.startZ-step*RACE.stride);
      transform.rotation.set(0,0,0);transform.scale.setScalar(active?1:0);transform.updateMatrix();
      raceStone.setMatrixAt(lane*RACE.squares+step,transform.matrix);
      const label=raceLabels[step];
      transform.position.set(x-.55,RACE.floorY+.015,RACE.startZ-step*RACE.stride+.7);
      transform.rotation.set(-Math.PI/2,0,0);transform.scale.setScalar(active?.65:0);transform.updateMatrix();
      label.setMatrixAt(lane,transform.matrix);label.instanceMatrix.needsUpdate=true;
     }
    }
    raceStone.instanceMatrix.needsUpdate=true;
   }
  }
 for(const [id,g] of avatars)if(!ids.has(id)){scene.remove(g);avatars.delete(id);soldierMixers.delete(id);}
 for(const t of teams){const selected=Number.isInteger(t.avatar)?t.avatar:t.route;let g=avatars.get(t.id);if(g&&g.userData.avatarIndex!==selected){scene.remove(g);avatars.delete(t.id);soldierMixers.delete(t.id);g=null;}g=avatar(t.id,selected);const p=position(t,state?.phase);
 if(g.userData.previousWrong===undefined)g.userData.previousWrong=t.wrong||0;
 if((t.wrong||0)>g.userData.previousWrong&&state?.phase==='playing'){
  g.userData.fallStarted=time;g.userData.fallStage=Math.min(5,t.step||0);
 }
 g.userData.previousWrong=t.wrong||0;
 if(!g.userData.placed||g.userData.phase!==state?.phase){g.position.copy(p);g.userData.placed=true;g.userData.phase=state?.phase;g.userData.anchor=p.clone();}
 const moving=g.position.distanceTo(p)>.07;
 g.position.lerp(p,.075);
 // Transient effects are always applied to a stable interpolated anchor.
 if(!g.userData.anchor)g.userData.anchor=p.clone();
 g.userData.anchor.lerp(p,.075);g.position.copy(g.userData.anchor);
 g.rotation.set(0,Math.atan2(-p.x,-p.z),0);g.scale.setScalar(finalCourse.visible?1:.8);
 const actions=g.userData.actions;
 if(actions){const next=moving?(actions.run||actions.walk||actions.idle):actions.idle;if(next&&next!==g.userData.action){g.userData.action?.fadeOut(.2);next.reset().fadeIn(.2).play();g.userData.action=next;}}

 const fallAge=time-(g.userData.fallStarted||-10000);
 if(fallAge>=0&&fallAge<2200){
  const progress=fallAge/2200,stage=g.userData.fallStage;
  if(stage===0){ // Bridge snaps: character tumbles visibly into the open ravine.
   g.position.y-=Math.pow(progress,1.45)*28;
   g.rotation.z=progress*1.3;
   g.scale.setScalar(.8*Math.max(.25,1-progress*.65));
  }else if(stage===1){ // Waterfall surge pushes the hero back.
   g.position.add(new THREE.Vector3(Math.cos(t.route*Math.PI/4),0,Math.sin(t.route*Math.PI/4)).multiplyScalar(Math.sin(progress*Math.PI)*4.4));
   g.rotation.z=Math.sin(progress*Math.PI)*-.55;
  }else if(stage===2){ // Dragon fire knocks the hero backward.
   g.position.y+=Math.sin(progress*Math.PI)*1.8;
   g.rotation.x=-Math.sin(progress*Math.PI)*.9;
  }else if(stage===3){ // Failed portal spell spins and repels the hero.
   g.rotation.y+=progress*Math.PI*4;
   g.position.y+=Math.sin(progress*Math.PI)*2.1;
  }else if(stage===4){ // Falling crystals make the hero duck.
   g.scale.y=.8*(1-Math.sin(progress*Math.PI)*.45);
   g.position.y-=Math.sin(progress*Math.PI)*.35;
  }else{ // Vault door shockwave pushes the hero backward.
   g.position.y+=Math.sin(progress*Math.PI)*.7;
   g.rotation.z=Math.sin(progress*Math.PI)*.7;
  }
 }else{
  g.rotation.z=0;g.rotation.x=0;g.scale.setScalar(finalCourse.visible?1:.8);
  if(fallAge>=2200&&fallAge<2350&&g.userData.fallStage===0)g.position.copy(p);
  g.position.y+=Math.sin(time*.002+t.route)*.004;
 }
 if(finalCourse.visible)g.rotation.y=Math.PI;
 if(state?.winner===t.id){const entrance=new THREE.Vector3(0,3.25,RACE.originZ+RACE.startZ-16*RACE.stride-6);g.position.lerp(entrance,.035);g.position.y+=Math.abs(Math.sin(time*.006))*.25;g.rotation.y=time*.001;}
 }
 if(view==='student'&&state?.teams?.[teamId]){
 const own=state.teams[teamId],target=position(own,state.phase),figure=avatars.get(teamId);
 const failing=time-(figure?.userData.fallStarted||-10000);
 // Three-quarter SIDE camera: show the hero's profile and the route ahead,
 // rather than looking over the hero's shoulder into nearby scenery.
 const yaw=finalCourse.visible?Math.PI:(figure?.rotation.y??Math.atan2(-target.x,-target.z));
 const side=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw));
 const forward=new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw));
 const desired=target.clone().addScaledVector(side,13.5).addScaledVector(forward,-2.8).add(new THREE.Vector3(0,7.8,0));
 camera.position.lerp(desired,.07);
 const aim=target.clone().addScaledVector(forward,3.2).add(new THREE.Vector3(0,1.9,0));
 if(failing>=0&&failing<2200&&figure?.userData.fallStage===0)aim.y=figure.position.y+1;
 camera.lookAt(aim);
 }else if(finalCourse.visible){
 const center=RACE.originZ+RACE.startZ-7.5*RACE.stride;
 const factor=Math.max(1,1.6/(width/height));
 camera.position.lerp(new THREE.Vector3(10,53*factor,center+62*factor),.055);camera.lookAt(0,4,center-2);
 }else{const distance=width/height<1.35?1.22:1;camera.position.lerp(new THREE.Vector3(34*distance,40*distance,87*distance),.055);camera.lookAt(0,7,0);}
 for(let i=0;i<clouds.length;i++)clouds[i].position.x+=Math.sin(time*.00011+i)*.002;
 if(world.userData.waterTexture)world.userData.waterTexture.offset.y=-(time*.00023%1);
 if(world.userData.guardian){world.userData.guardian.userData.gem.rotation.y=time*.0006;world.userData.guardian.userData.gem.position.y=3.7+Math.sin(time*.0015)*.25;}
 const encounterTeams=new Map();for(const t of teams){const key=(t.route%8)+':'+Math.min(5,t.step||0),old=encounterTeams.get(key);if(!old||(avatars.get(t.id)?.userData.fallStarted||0)>(avatars.get(old.id)?.userData.fallStarted||0))encounterTeams.set(key,t);}
 for(const t of encounterTeams.values()){
  if(state?.phase!=='playing')continue;
  const stage=Math.min(5,t.step||0),root=encounters[t.route%8]?.[stage];
  if(!root)continue;
  const wrongAge=time-(avatars.get(t.id)?.userData.fallStarted||-100000);
  const fail=wrongAge>=0&&wrongAge<2200;
  const p=fail?wrongAge/2200:0;
  if(stage===0&&root.userData.planks){
   root.userData.planks.forEach((plank,i)=>{plank.rotation.z=fail?Math.min(1.2,p*2.0)*(i%2?1:-1):Math.sin(time*.002+i)*.025;plank.position.y=fail?.16-p*9:.16+Math.sin(time*.001+i)*.045;});
  }
  if(stage===1&&root.userData.falls){
   root.userData.falls.forEach((fall,i)=>{fall.material.opacity=.58+.14*Math.sin(time*.005+i);fall.position.z=(i?1:-1)*(1.2+.12*Math.sin(time*.002)+(fail?Math.sin(p*Math.PI)*1.5:0));});
  }
  if(stage===2){
   const fire=root.userData.flame,shield=root.userData.shield;
   root.userData.wings?.forEach((wing,i)=>wing.rotation.x=(i?1:-1)*(.6+Math.sin(time*.004)*.35));
   if(root.userData.head)root.userData.head.rotation.y=Math.sin(time*.0018)*.12;
   fire.visible=fail;fire.scale.x=fail?.8+Math.sin(p*Math.PI)*.6:1;
   fire.scale.y=1+.16*Math.sin(time*.008);
   fire.material.opacity=.55+.3*Math.sin(time*.009)**2;
   shield.visible=!fail;shield.scale.setScalar(1+.07*Math.sin(time*.006));
  }
  if(stage===3&&root.userData.ring){root.userData.ring.rotation.x=time*.0005+(fail?p*9:0);root.userData.portal.scale.setScalar(fail?Math.max(.15,1-p):1);}
  if(stage===4&&root.userData.crystals)root.userData.crystals.forEach((c,i)=>{c.rotation.y=time*.0006+i+(fail?p*7:0);c.position.y=.5+(i%3)*.5+.15*Math.sin(time*.003+i)-(fail?p*5:0);});
  if(stage===5&&root.userData.door)root.userData.door.rotation.y=fail?Math.sin(p*Math.PI)*-.8:.07*Math.sin(time*.001);
 }
 chestLid.rotation.x=THREE.MathUtils.lerp(chestLid.rotation.x,state?.winner?-1.8:0,.04);victory.visible=!!state?.winner;victory.rotation.y=time*.00025;victory.position.y=vault.position.y+Math.sin(time*.001)*.6;
 const delta=Math.min(soldierClock.getDelta(),.05);for(const mixer of soldierMixers.values())mixer.update(delta);renderer.render(scene,camera);frame++;const loading=document.getElementById('previewLoading');if(loading&&view==='welcome')loading.style.display='none';return true;
 }catch(err){if(frame<2)console.warn('3D view unavailable',err);return false;}
}
