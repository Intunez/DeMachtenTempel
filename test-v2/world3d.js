import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
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
const finalCourse=new THREE.Group();world.add(finalCourse);
const marble=mat(0x8b8576,{map:stoneTex,roughness:.92});
const bronze=mat(0xd2a653,{metalness:.78,roughness:.24});
const jewel=mat(0x79e5f3,{emissive:0x2b9ca7,emissiveIntensity:1.8,roughness:.15});
function finalePart(geometry,material,x,y,z){
 const o=new THREE.Mesh(geometry,material);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;finalCourse.add(o);return o;
}
for(let i=0;i<16;i++){
 const z=27-i*1.22;
 finalePart(new THREE.BoxGeometry(11.7,.38,1.18),marble,0,3.08,z);
 for(const side of [-1,1]){
  finalePart(new THREE.BoxGeometry(.30,.6,1.18),bronze,side*6,3.43,z);
  if(i%3===0){
   finalePart(new THREE.CylinderGeometry(.35,.43,3.4,12),marble,side*6.55,5.1,z);
   finalePart(new THREE.BoxGeometry(1.1,.42,1.1),bronze,side*6.55,6.9,z);
   const flame=finalePart(new THREE.OctahedronGeometry(.35,1),jewel,side*6.55,7.5,z);
  }
 }
}
const vault=new THREE.Group();vault.position.set(0,3.35,6.7);finalCourse.add(vault);
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
const crown=vaultMesh(new THREE.ConeGeometry(2.8,2.2,8),bronze,0,14.2,0);
finalCourse.visible=false;
const camera=new THREE.PerspectiveCamera(39,1,.1,400);camera.position.set(65,65,105);
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-42;sun.shadow.camera.right=42;sun.shadow.camera.top=42;sun.shadow.camera.bottom=-42;renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;renderer.setClearColor(0xa4c4c7);
// Textured lantern models add architectural detail; failures never stop gameplay.
const gltfLoader=new GLTFLoader();
const assetBase='https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Assets@main/Models/';
gltfLoader.loadAsync(assetBase+'Lantern/glTF-Binary/Lantern.glb').then(gltf=>{
 [[9,4,10],[-9,4,10],[10,4,-9],[-10,4,-9],[0,4,28],[0,4,-28]].forEach(([x,y,z])=>{
  const model=gltf.scene.clone(true);model.position.set(x,y,z);model.scale.setScalar(2.1);
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
    const tint=new THREE.Color([0x9ec4ff,0x9edbb3,0xe5c99c,0xf2a48e,0x83d6f0,0xc7a7e8,0xe7cb85,0xe8a2ca][index%8]);
    o.material.color.lerp(tint,.16);
   }
  }
 });
 // Sample Soldier is human-scale (roughly 1.8m); scale up for the island.
 model.scale.setScalar(1.55);
 model.position.set(0,.03,0);
 group.add(model);
 const fallback=group.userData.fallback;
 if(fallback)fallback.visible=false;
 group.userData.highDetail=model;
 // Wearable fantasy details: glowing mathematical crest, belt, cape and head ornament.
 const accentColor=[0xffd88c,0x7fffd0,0xffe2ae,0xffa77d,0x7eeaff,0xc7a4ff,0xffdc7d,0xff98b8][index%8];
 const crest=new THREE.Sprite(mathBadge(index));crest.position.set(0,1.6,.32);crest.scale.set(.52,.52,1);group.add(crest);
 const capeMat=new THREE.MeshStandardMaterial({color:costumeColors[index%8],roughness:.87,side:THREE.DoubleSide});
 const cape=new THREE.Mesh(new THREE.PlaneGeometry(.92,1.65,4,8),capeMat);
 cape.position.set(0,1.45,-.26);cape.rotation.x=-.16;group.add(cape);
 const shoulder=new THREE.Mesh(new THREE.TorusGeometry(.46,.075,10,32),new THREE.MeshStandardMaterial({color:0xdab777,metalness:.7,roughness:.3}));
 shoulder.position.set(0,2.15,0);shoulder.rotation.x=Math.PI/2;group.add(shoulder);
 if(soldierAsset.animations?.length){
  const mixer=new THREE.AnimationMixer(model);
  const clip=soldierAsset.animations.find(c=>/idle/i.test(c.name))||soldierAsset.animations[0];
  mixer.clipAction(clip).play();soldierMixers.set(id,mixer);
 }
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

function avatar(id,index){let g=avatars.get(id);if(g)return g;g=new THREE.Group();const fallback=new THREE.Group();character(fallback,index);g.add(fallback);g.userData.fallback=fallback;g.userData.avatarIndex=index;g.userData.label=nameLabel('Team');g.add(g.userData.label);scene.add(g);avatars.set(id,g);installDetailedCharacter(g,index,id);return g;}
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
 for(const [id,g] of avatars)if(!ids.has(id)){scene.remove(g);if(g.userData.label){g.userData.label.material.map.dispose();g.userData.label.material.dispose();}avatars.delete(id);soldierMixers.delete(id);}
 for(const t of teams){const g=avatar(t.id,Number.isInteger(t.avatar)?t.avatar:t.route);if(g.userData.labelName!==t.name){g.remove(g.userData.label);g.userData.label.material.map.dispose();g.userData.label.material.dispose();g.userData.label=nameLabel(t.name);g.add(g.userData.label);g.userData.labelName=t.name;}const p=position(t,state?.phase);
 if(g.userData.previousWrong===undefined)g.userData.previousWrong=t.wrong||0;
 if((t.wrong||0)>g.userData.previousWrong&&state?.phase==='playing'){
  g.userData.fallStarted=time;g.userData.fallStage=Math.min(5,t.step||0);
 }
 g.userData.previousWrong=t.wrong||0;
 g.position.lerp(p,.07);
 const fallAge=time-(g.userData.fallStarted||-10000);
 if(fallAge>=0&&fallAge<2200&&g.userData.fallStage===0){
  const progress=fallAge/2200;
  // The bridge gives way: fall down and out of view; no magical rescue.
  g.position.y-=Math.pow(progress,1.45)*28;
  g.rotation.z=progress*1.3;
  g.scale.setScalar(Math.max(.12,1-progress*.75));
 }else{
  g.rotation.z=0;g.scale.setScalar(1);
  if(fallAge>=2200&&fallAge<2350&&g.userData.fallStage===0)g.position.copy(position({...t,step:0},state?.phase));
  g.position.y+=Math.sin(time*.002+t.route)*.004;
 }
 g.rotation.y=Math.atan2(-g.position.x,-g.position.z);}
 if(view==='student'&&state?.teams?.[teamId]){const target=position(state.teams[teamId],state.phase);const direction=target.clone().normalize();if(direction.length()<.1)direction.set(0,0,1);const desired=target.clone().add(direction.multiplyScalar(7.5)).add(new THREE.Vector3(0,4.3,0));camera.position.lerp(desired,.055);camera.lookAt(target.x*.48,6.7,target.z*.48);}
 else if(state?.phase==='final'||state?.phase==='ended'){camera.position.lerp(new THREE.Vector3(17,19,49),.035);camera.lookAt(0,6,16);}else{const wide=width/height;const distance=wide<1.35?1.22:1;camera.position.lerp(new THREE.Vector3(34*distance,40*distance,87*distance),.055);camera.lookAt(0,7,0);}
 for(let i=0;i<clouds.length;i++)clouds[i].position.x+=Math.sin(time*.00011+i)*.002;
 if(world.userData.falls)for(let i=0;i<world.userData.falls.length;i++){const f=world.userData.falls[i];f.material.opacity=.63+.12*Math.sin(time*.002+i);}
 if(world.userData.guardian){world.userData.guardian.userData.gem.rotation.y=time*.0006;world.userData.guardian.userData.gem.position.y=3.7+Math.sin(time*.0015)*.25;}
 const delta=Math.min(soldierClock.getDelta(),.05);for(const mixer of soldierMixers.values())mixer.update(delta);renderer.render(scene,camera);frame++;const loading=document.getElementById('previewLoading');if(loading&&view==='welcome')loading.style.display='none';return true;
 }catch(err){if(frame<2)console.warn('3D view unavailable',err);return false;}
}
