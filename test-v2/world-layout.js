// Shared dimensions for the scene and regression checks. No renderer required.
export const RACE = Object.freeze({lanes:13, squares:16, laneWidth:3.2, stride:2.8, startZ:27, originZ:-110, floorY:3.25});
export function teamSlot(team) {
 const value=Number.isInteger(team.slot)?team.slot:(team.route||0);
 return Math.max(0,Math.min(12,value));
}
export function teamPosition(team,phase,activeSlots=null) {
 const slot=teamSlot(team);
 if(phase==='final'||phase==='ended'){
  const step=Math.max(1,Math.min(RACE.squares,Number(team.finalPos)||1));
  const lane=Array.isArray(activeSlots)?Math.max(0,activeSlots.indexOf(slot)):slot;
  const total=Array.isArray(activeSlots)?activeSlots.length:RACE.lanes;
  return {x:(lane-(total-1)/2)*RACE.laneWidth,y:RACE.floorY,z:RACE.originZ+RACE.startZ-(step-1)*RACE.stride};
 }
 const route=((team.route||0)%8+8)%8,angle=route*Math.PI/4;
 const radius=25-Math.max(0,Math.min(6,Number(team.step)||0))*2.72;
 const offset=(Math.floor(slot/8)-1.5)*1.2;
 return {x:Math.cos(angle)*radius-Math.sin(angle)*offset,y:3,z:Math.sin(angle)*radius+Math.cos(angle)*offset};
}
