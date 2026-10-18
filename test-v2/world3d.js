import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
const THREE_COLORS=['#ffb563','#8cd9ff','#e4a5ff','#9ff2bf','#ffd68b','#f4a2cb','#d0ed87','#b3aaff'];
const routePoints=Array.from({length:8},(_,i)=>{const angle=i*Math.PI/4;return Array.from({length:7},(_,j)=>{const radius=25-j*2.72;return new THREE.Vector3(Math.cos(angle)*radius,3.0,Math.sin(angle)*radius);});});
const scene=new THREE.Scene();scene.background=new THREE.Color(0xa4c4c7);scene.fog=new THREE.FogExp2(0xa4c4c7,.0038);
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
photoTexture('terrain/rock.jpg',4,texture=>{
 rock.map=texture;rock.color.set(0xd0d3ce);rock.roughness=.95;rock.needsUpdate=true;
});
photoTexture('brick_diffuse.jpg',3,texture=>{
 stone.map=texture;stone.color.set(0xb3aa98);stone.roughness=.96;stone.needsUpdate=true;
});
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
 const terrainGeo=new THREE.CylinderGeometry(29.5,31,4.8,96,10);
 const tp=terrainGeo.attributes.position;
 for(let k=0;k<tp.count;k++){const x=tp.getX(k),y=tp.getY(k),z=tp.getZ(k),a=Math.atan2(z,x);
  const jag=.55*Math.sin(a*17)+.4*Math.sin(a*37+1)+.2*Math.cos(a*71);
  const radial=Math.hypot(x,z),r=(radial>20?1:0);
  tp.setXYZ(k,x+(x/(radial||1))*jag*r,y+(y>0?.32*Math.sin(x*.42)*Math.cos(z*.35):0),z+(z/(radial||1))*jag*r);
 }
 terrainGeo.computeVertexNormals();groupMesh(terrainGeo,moss,0,-.5,0);
 for(let i=0;i<80;i++){const a=i*2.399963,r=24+rand(i+21)*7,x=Math.cos(a)*r,z=Math.sin(a)*r;
  boulder(x,-3.2-rand(i+5)*5,z,2.2+rand(i+18)*3,cliffMaterials[i%4]);
  if(i%4===0)boulder(x*.93,-1.2,z*.93,1.8,green[i%3]);
 }
 for(let i=0;i<22;i++){const a=i*Math.PI*2/22,r=30.5,x=Math.cos(a)*r,z=Math.sin(a)*r;
  boulder(x,-9-rand(i)*3,z,4+rand(i+9)*2,cliffMaterials[i%4]);
 }
 // Natural terraces, waterfalls with spray and plunge pools.
 const falls=[];
 for(let i=0;i<9;i++){const a=i*Math.PI*2/9+.21,x=Math.cos(a)*28.8,z=Math.sin(a)*28.8;
  const fall=groupMesh(new THREE.PlaneGeometry(2.2+rand(i)*1.7,12+rand(i+3)*7,8,14),
    new THREE.MeshStandardMaterial({color:0x91d8d8,emissive:0x2b6678,emissiveIntensity:.25,transparent:true,opacity:.73,side:THREE.DoubleSide,roughness:.17}),x,-7.8,z);
  fall.rotation.y=Math.PI/2-a;
  const p=fall.geometry.attributes.position;for(let k=0;k<p.count;k++){const xx=p.getX(k),yy=p.getY(k);p.setZ(k,.18*Math.sin(yy*2.4+xx*3.8)+.07*Math.sin(yy*8+xx*5));}fall.geometry.computeVertexNormals();
  falls.push(fall);
  for(let k=0;k<6;k++){const spray=groupMesh(new THREE.SphereGeometry(.16+rand(k+i)*.24,7,5),mat(0xd4f7ef,{transparent:true,opacity:.6}),x+Math.cos(a)*(k*.2),-14+rand(k+i+8)*2,z+Math.sin(a)*(k*.2));spray.scale.y=.35;}
 }
 world.userData.falls=falls;
 // Forest: trunks, layered organic crowns, ferns and undergrowth.
 for(let i=0;i<115;i++){const a=rand(i+24)*Math.PI*2,r=11+rand(i+47)*17.3,x=Math.cos(a)*r,z=Math.sin(a)*r;
  if(i%11===0)continue;
  const height=2.5+rand(i+55)*4.6;
  cylinder(.13,.27,height*.6,mat(0x554637),x,height*.3,z,7);
  for(let layer=0;layer<3;layer++){const crown=groupMesh(new THREE.IcosahedronGeometry(1,2),green[(i+layer)%3],x,height*.48+layer*height*.19,z);crown.scale.set(.8+rand(i+70)*.6+(2-layer)*.2,height*.22,.8+rand(i+70)*.6+(2-layer)*.2);crown.rotation.y=rand(i+layer)*3;}
  if(i%4===0){for(let k=0;k<4;k++)boulder(x+(rand(i+k)*2-1)*1.3,.35,z+(rand(i+k+4)*2-1)*1.3,.3,green[(i+k)%3]);}
 }
 // Eight raised stone bridges with individually weathered flagstones, carved balustrades and glowing rune gateways.
 for(let i=0;i<8;i++){
  const a=i*Math.PI/4,radial=new THREE.Vector3(Math.cos(a),0,Math.sin(a));
  const tangent=new THREE.Vector3(-Math.sin(a),0,Math.cos(a));
  for(let j=0;j<38;j++){const r=7.8+j*.49,p=radial.clone().multiplyScalar(r),y=2.4+(25-r)*.012;
   const slab=box(2.8,.4,.53,stoneDetail[(i+j)%3],p.x,y,p.z);slab.rotation.y=a;slab.rotation.z=(rand(i*44+j)-.5)*.025;
   if(j%4===0){for(const side of [-1,1]){const edge=p.clone().addScaledVector(tangent,side*1.62);
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

function numberedTileLabel(n){
 const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');
 x.fillStyle='rgba(12,24,30,.84)';x.fillRect(0,0,128,128);
 x.strokeStyle='#d7b875';x.lineWidth=7;x.strokeRect(5,5,118,118);
 x.fillStyle='#fff1c4';x.font='bold 74px Georgia';x.textAlign='center';x.textBaseline='middle';x.fillText(String(n),64,67);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
 const o=new THREE.Mesh(new THREE.PlaneGeometry(1.05,1.05),new THREE.MeshBasicMaterial({map:t,transparent:true,depthWrite:false,side:THREE.DoubleSide}));
 o.rotation.x=-Math.PI/2;return o;
}
const finalCourse=new THREE.Group();world.add(finalCourse);
for(let i=0;i<16;i++){
 const z=27-i*1.22;
 const tile=new THREE.Mesh(new THREE.BoxGeometry(8.7,.3,1.08),stone);
 tile.position.set(0,3.1,z);tile.castShadow=true;tile.receiveShadow=true;finalCourse.add(tile);
 const label=numberedTileLabel(i+1);label.position.set(0,3.27,z);finalCourse.add(label);
 for(const side of [-1,1]){
  const rim=new THREE.Mesh(new THREE.BoxGeometry(.22,.35,1.08),gold);
  rim.position.set(side*4.5,3.15,z);finalCourse.add(rim);
 }
}
finalCourse.visible=false;

const camera=new THREE.PerspectiveCamera(39,1,.1,400);camera.position.set(65,65,105);
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-42;sun.shadow.camera.right=42;sun.shadow.camera.top=42;sun.shadow.camera.bottom=-42;renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.0;renderer.setClearColor(0xa4c4c7);
// Actual textured glTF assets (not primitives): licensed Khronos sample assets.
// They load asynchronously; the procedural scene remains playable if an asset fails.
const gltfLoader=new GLTFLoader();
const assetBase='https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Assets@main/Models/';
let humanModel=null,lanternModel=null;

const loadModel=(name)=>gltfLoader.loadAsync(assetBase+name+'/glTF-Binary/'+name+'.glb');
loadModel('CesiumMan').then(gltf=>{
 humanModel=gltf.scene;
 humanModel.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
 for(const g of avatars.values())replaceAvatarModel(g);
}).catch(e=>console.warn('3D-personage niet geladen',e));
loadModel('Lantern').then(gltf=>{
 lanternModel=gltf.scene;
 const positions=[[9,4,10],[-9,4,10],[10,4,-9],[-10,4,-9],[0,4,28],[0,4,-28]];
 positions.forEach(([x,y,z],i)=>{
  const model=lanternModel.clone(true);model.position.set(x,y,z);model.scale.setScalar(2.1);
  model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
  world.add(model);
 });
}).catch(e=>console.warn('3D-lantaarn niet geladen',e));
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
 const mark=new THREE.Sprite(mathBadge(i));mark.position.set(0,1.82,.52);mark.scale.set(.56,.56,1);g.add(mark);
 if(i===0||i===1||i===4){
  const staff=add(new THREE.CylinderGeometry(.04,.06,2.6,10),boots,-.96,1.48,.12);staff.rotation.z=-.07;
  add(new THREE.SphereGeometry(.24,16,12),mat(i===1?0x79ec88:0x69c7ff,{emissive:i===1?0x25652b:0x235e9e,emissiveIntensity:.8}),-1.07,2.80,.12);
 }else if(i===2||i===5){add(new THREE.BoxGeometry(.66,.16,.49),boots,-.85,1.41,.44);}
 else if(i===3){add(new THREE.BoxGeometry(.39,.39,.39),mat(0xf76842,{emissive:0x8b260c,emissiveIntensity:.7}),-.88,1.49,.32);}
 else{add(new THREE.TorusGeometry(.27,.06,8,24),trim,-.85,1.48,.36);}
}
const avatars=new Map();
function nameLabel(name){
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=96;
 const ctx=canvas.getContext('2d');ctx.fillStyle='rgba(8,19,30,.85)';ctx.fillRect(0,4,512,88);
 ctx.font='bold 38px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#ffffff';ctx.fillText(String(name||'Team').slice(0,22),256,49,475);
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthTest:false,transparent:true}));
 sprite.position.y=4.2;sprite.scale.set(5.6,1.05,1);return sprite;
}

function avatar(id,index){let g=avatars.get(id);if(g)return g;g=new THREE.Group();character(g,index);g.userData.label=nameLabel('Team');g.add(g.userData.label);scene.add(g);avatars.set(id,g);return g;}
const lerp=(a,b,t)=>a.clone().lerp(b,Math.max(0,Math.min(1,t)));
function position(team,phase){const path=routePoints[team.route%8]||routePoints[0];
 if(phase==='final'||phase==='ended'){const lane=((team.route||0)%8-3.5)*.94;const pos=Math.max(1,Math.min(16,team.finalPos||1));return new THREE.Vector3(lane,3.45,27-(pos-1)*1.22);}
 const p=Math.max(0,Math.min(path.length-1,team.step||0)),i=Math.floor(p);return lerp(path[i],path[Math.min(i+1,6)],p-i);}
let lastCanvas=null,frame=0;
export function draw3D(canvas,state,view,teamId,time){
 if(!canvas)return false;
 try{
 if(lastCanvas!==canvas){const parent=canvas.parentElement;if(!parent)return false;renderer.domElement.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0';parent.style.position='relative';parent.insertBefore(renderer.domElement,canvas);canvas.style.visibility='hidden';lastCanvas=canvas;}
 const width=Math.max(1,canvas.clientWidth||canvas.width),height=Math.max(1,canvas.clientHeight||canvas.height);
 renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();
 finalCourse.visible=state?.phase==='final'||state?.phase==='ended';
 const teams=Object.values(state?.teams||{});const ids=new Set(teams.map(t=>t.id));
 for(const [id,g] of avatars)if(!ids.has(id)){scene.remove(g);if(g.userData.label){g.userData.label.material.map.dispose();g.userData.label.material.dispose();}avatars.delete(id);}
 for(const t of teams){const g=avatar(t.id,Number.isInteger(t.avatar)?t.avatar:t.route);if(g.userData.labelName!==t.name){g.remove(g.userData.label);g.userData.label.material.map.dispose();g.userData.label.material.dispose();g.userData.label=nameLabel(t.name);g.add(g.userData.label);g.userData.labelName=t.name;}const p=position(t,state?.phase);g.position.lerp(p,.07);g.position.y+=Math.sin(time*.002+t.route)*.004;g.rotation.y=Math.atan2(-g.position.x,-g.position.z);}
 if(view==='student'&&state?.teams?.[teamId]){const target=position(state.teams[teamId],state.phase);const direction=target.clone().normalize();if(direction.length()<.1)direction.set(0,0,1);const desired=target.clone().add(direction.multiplyScalar(8)).add(new THREE.Vector3(0,6,0));camera.position.lerp(desired,.045);camera.lookAt(target.x, target.y+2.3,target.z);}
 else if(state?.phase==='final'||state?.phase==='ended'){camera.position.lerp(new THREE.Vector3(20,30,48),.035);camera.lookAt(0,3,17);}else{const wide=width/height;const distance=wide<1.35?1.22:1;camera.position.lerp(new THREE.Vector3(64*distance,65*distance,104*distance),.055);camera.lookAt(0,0,0);}
 for(let i=0;i<clouds.length;i++)clouds[i].position.x+=Math.sin(time*.00011+i)*.002;
 if(world.userData.falls)for(let i=0;i<world.userData.falls.length;i++){const f=world.userData.falls[i];f.material.opacity=.63+.12*Math.sin(time*.002+i);}
 if(world.userData.guardian){world.userData.guardian.userData.gem.rotation.y=time*.0006;world.userData.guardian.userData.gem.position.y=3.7+Math.sin(time*.0015)*.25;}
 renderer.render(scene,camera);frame++;const loading=document.getElementById('previewLoading');if(loading&&view==='welcome')loading.style.display='none';return true;
 }catch(err){if(frame<2)console.warn('3D view unavailable',err);return false;}
}
