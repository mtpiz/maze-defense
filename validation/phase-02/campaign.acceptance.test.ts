// Astra-owned independent P2-04 contract. Workers may not edit this suite.
import { describe, expect, it, vi } from 'vitest';
import type { CompiledCampaignMission } from '@tower-defense/content';
import type { MissionCommand } from '@tower-defense/sim';
import { FIRST_SESSION_MISSIONS } from '../../apps/game/src/application/first-session-missions.js';
import { createPlayerProfile, parsePlayerProfile, type PlayerProfile } from '../../apps/game/src/application/player-profile.js';
import { ProfileStore } from '../../apps/game/src/platform/profile-store.js';
import type { BenchmarkController, BenchmarkViewState } from '../../apps/game/src/application/benchmark-controller.js';
import fixtures from '../../packages/testkit/src/first-session/replay-plans.json';

const ids = FIRST_SESSION_MISSIONS.map(entry => entry.mission.id);
type Result = {outcome:'victory';stars:1|2|3}|{outcome:'defeat';stars:0};
interface Writer { save(profile:PlayerProfile):Promise<{revision:number}> }
interface View {
  screen:'mission'|'results'|'map'; profile:PlayerProfile; activeMissionId:string|null;
  mission:BenchmarkViewState|null; nodes:readonly {id:string;locked:boolean;bestStars:number}[];
  mapAvailable:boolean; loanedBlueprints:readonly string[];
  result:null|{missionId:string;outcome:string;stars:number;awardedBlueprints:readonly string[]};
  saveStatus:'idle'|'saving'|'error'; saveError:string|null;
}
type Controls = Pick<BenchmarkController, 'tapCell'|'clearSelection'|'dismantleSelected'|'installSelected'|'aimSelected'|'startWave'|'togglePause'|'cycleSpeed'|'setForeground'|'advanceFrame'|'interpolationAlpha'>;
interface Campaign extends Controls {
  getState():View; subscribe(listener:(state:View)=>void):()=>void; dispose():void;
  selectMission(id:string):boolean; showMap():boolean; retryMission(restoreOpening?:boolean):boolean;
  retrySave():Promise<boolean>;
}
async function api():Promise<{
  FirstSessionController:new(profile:PlayerProfile, writer:Writer)=>Campaign;
  applyMissionResult(profile:PlayerProfile, entry:CompiledCampaignMission, result:Result):PlayerProfile;
}> {
  const controllerPath = '../../apps/game/src/application/first-session-controller.ts';
  const profilePath = '../../apps/game/src/application/player-profile.ts';
  const controller = await import(controllerPath), profile = await import(profilePath);
  expect(profile.applyMissionResult).toBeTypeOf('function');
  return {...controller, ...profile};
}
function progress(completed=2):PlayerProfile {
  return parsePlayerProfile({...createPlayerProfile(), completedMissions:Object.fromEntries(ids.slice(0,completed).map(id=>[id,3])), destination:{kind:'map'}});
}
function writer() {
  const writes:PlayerProfile[]=[];
  const state = { fail:false, hold:false, release:()=>{}, saved:null as PlayerProfile|null };
  return {writes,state, async save(profile:PlayerProfile) {
    writes.push(profile);
    if(state.hold) await new Promise<void>(resolve=>{state.release=resolve;});
    if(state.fail) throw new Error('Disk full');
    state.saved=profile;
    return {revision:writes.length};
  }};
}
function frozen(value:unknown):void {
  if(!value || typeof value!=='object') return;
  expect(Object.isFrozen(value)).toBe(true);
  for(const child of Object.values(value)) frozen(child);
}
function play(c:Campaign, planId:string):void {
  const plan=fixtures.find(p=>p.id===planId)!;
  const advanceTo=(tick:number)=>{
    while(c.getState().mission!.ui.tick<tick) {
      const before=c.getState().mission!.ui.tick;
      c.advanceFrame(1000/30);
      expect(c.getState().mission!.ui.tick,`stalled ${planId} at ${before}`).toBeGreaterThan(before);
    }
  };
  for(const item of plan.commands) {
    advanceTo(item.tick);
    const command=item.command as MissionCommand;
    if(command.type==='place-foundation') c.tapCell(command.cell);
    else if(command.type==='start-wave' || command.type==='early-launch') c.startWave();
    else if(command.type==='install-specialist' || command.type==='aim-tower') {
      const tower=c.getState().mission!.render.towers.find(t=>t.id===command.towerId)!;
      c.tapCell(tower.cell);
      if(command.type==='install-specialist') c.installSelected(command.familyId);
      else c.aimSelected(command.facingMilliDegrees);
    } else throw new Error('Unexpected fixture command');
  }
  advanceTo(plan.durationTicks);
  expect(c.getState().mission!.ui.phase).toBe(plan.outcome);
}
const settled = async(c:Campaign)=>vi.waitFor(()=>expect(c.getState().saveStatus).toBe('idle'));

describe('P2-04 campaign flow and result contract',()=>{
  it('cold-opens M1, publishes a frozen view, and rejects locked/unknown direct selection',async()=>{
    const {FirstSessionController}=await api(), w=writer();
    const c=new FirstSessionController(createPlayerProfile(),w);
    expect(c.getState()).toMatchObject({screen:'mission',activeMissionId:ids[0],mapAvailable:false,loanedBlueprints:[],saveStatus:'idle',result:null});
    expect(c.getState().nodes.map(n=>n.locked)).toEqual([false,true,true]);
    frozen(c.getState());
    expect(c.selectMission(ids[1]!)).toBe(false); expect(c.selectMission(ids[2]!)).toBe(false);
    expect(c.selectMission('missing')).toBe(false); expect(c.showMap()).toBe(false);
    expect(c.getState().activeMissionId).toBe(ids[0]); expect(w.writes).toHaveLength(0);
  });
  it('does not trust a saved locked destination or reveal the map before first clear',async()=>{
    const {FirstSessionController}=await api();
    for(const destination of [{kind:'mission',missionId:ids[2]!},{kind:'map'}] as const) {
      const c=new FirstSessionController(parsePlayerProfile({...createPlayerProfile(),destination}),writer());
      expect(c.getState()).toMatchObject({screen:'mission',activeMissionId:ids[0],mapAvailable:false});
    }
    const c=new FirstSessionController(progress(1),writer());
    expect(c.getState()).toMatchObject({screen:'map',activeMissionId:null,mapAvailable:true});
    expect(c.getState().nodes.map(n=>n.locked)).toEqual([false,false,true]);
  });
  it('waits for durable M1 victory before revealing map/unlocks and blocks destructive navigation',async()=>{
    const {FirstSessionController}=await api(),w=writer(); w.state.hold=true;
    const c=new FirstSessionController(createPlayerProfile(),w);
    play(c,'m1-foundation-corridor-win');
    expect(c.getState()).toMatchObject({screen:'results',saveStatus:'saving',mapAvailable:false,result:{missionId:ids[0],outcome:'victory',stars:3}});
    expect(c.getState().profile.completedMissions).toEqual({});
    expect(c.getState().nodes[1]!.locked).toBe(true);
    expect(c.selectMission(ids[0]!)).toBe(false); expect(c.retryMission()).toBe(false); expect(c.showMap()).toBe(false);
    const tick=c.getState().mission!.ui.tick; c.startWave();c.tapCell(1);c.cycleSpeed();c.advanceFrame(100);
    expect(c.getState().mission!.ui.tick).toBe(tick); expect(w.writes).toHaveLength(1);
    w.state.release(); await settled(c);
    expect(c.getState().profile.completedMissions[ids[0]!]).toBe(3);
    expect(c.getState().mapAvailable).toBe(true); expect(c.showMap()).toBe(true);
    expect(c.getState()).toMatchObject({screen:'map',activeMissionId:null,mission:null,loanedBlueprints:[]}); expect(c.retryMission()).toBe(false); expect(c.selectMission(ids[1]!)).toBe(true);
  });
  it('retries exactly the retained candidate after save failure and coalesces duplicate retries',async()=>{
    const {FirstSessionController}=await api(),w=writer(); w.state.fail=true;
    const c=new FirstSessionController(progress(),w); expect(c.selectMission(ids[2]!)).toBe(true);
    play(c,'m3-east-rail-win');
    const terminal=c.getState().mission, earned=c.getState().result;
    await vi.waitFor(()=>expect(c.getState().saveStatus).toBe('error'));
    expect(c.getState().saveError).toContain('Disk full');
    expect(c.getState().mission).toEqual(terminal);expect(c.getState().result).toEqual(earned);
    expect(c.getState().profile.unlockedBlueprints).toEqual([]);
    expect(c.retryMission()).toBe(false);expect(c.showMap()).toBe(false);expect(c.selectMission(ids[0]!)).toBe(false);
    const candidate=w.writes[0]!; expect(candidate.unlockedBlueprints).toEqual(['rail']);
    w.state.fail=false;w.state.hold=true;
    const first=c.retrySave(),second=c.retrySave();
    expect(w.writes).toHaveLength(2); expect(w.writes[1]).toEqual(candidate);
    w.state.release();expect(await first).toBe(true);expect(await second).toBe(true);
    expect(c.getState()).toMatchObject({saveStatus:'idle',saveError:null,profile:{unlockedBlueprints:['rail']}});
    expect(w.writes).toHaveLength(2);
    expect(c.getState().mission).toEqual(terminal);expect(c.getState().result).toEqual(earned);
  });
  it('can retry a synchronous writer failure without retaining a settled save promise',async()=>{
    const {FirstSessionController}=await api();let fail=true;let writes=0;
    const w={save():Promise<{revision:number}>{writes++;if(fail) throw new Error('Synchronous save failure');return Promise.resolve({revision:writes});}};
    const c=new FirstSessionController(progress(),w);c.selectMission(ids[2]!);play(c,'m3-east-rail-win');
    await vi.waitFor(()=>expect(c.getState().saveStatus).toBe('error'));expect(writes).toBe(1);
    fail=false;expect(await c.retrySave()).toBe(true);expect(writes).toBe(2);
    expect(c.getState().profile.unlockedBlueprints).toEqual(['rail']);expect(c.getState().saveStatus).toBe('idle');
  });
  it('locks navigation before notifying result listeners and writes a terminal result only once',async()=>{
    const {FirstSessionController}=await api(),w=writer();w.state.hold=true;
    const c=new FirstSessionController(progress(),w);c.selectMission(ids[2]!);
    const attempts:boolean[]=[];let observed=false;
    c.subscribe(state=>{
      if(state.result && !observed) {
        observed=true;
        expect(state.saveStatus).toBe('saving');
        attempts.push(c.retryMission(),c.showMap(),c.selectMission(ids[0]!));
      }
    });
    play(c,'m3-east-rail-win');
    expect(observed).toBe(true);expect(attempts).toEqual([false,false,false]);expect(w.writes).toHaveLength(1);
    w.state.release();await settled(c);expect(w.writes).toHaveLength(1);
  });
  it('loans Rail without ownership, grants it once on victory, and isolates mission state',async()=>{
    const {FirstSessionController}=await api(),w=writer(),c=new FirstSessionController(progress(),w);
    expect(c.selectMission(ids[2]!)).toBe(true);
    expect(c.getState().loanedBlueprints).toEqual(['rail']);
    expect(c.getState().mission!.specialistOptions.map(o=>o.familyId)).toEqual(['rail']);
    expect(c.getState().profile.unlockedBlueprints).toEqual([]);
    play(c,'m3-east-rail-win'); await settled(c);
    expect(c.getState().result!.awardedBlueprints).toEqual(['rail']);
    c.advanceFrame(100);c.clearSelection(); await Promise.resolve(); expect(w.writes).toHaveLength(1);
    expect(c.selectMission(ids[2]!)).toBe(true); play(c,'m3-east-rail-win');await settled(c);
    expect(c.getState().result!.awardedBlueprints).toEqual([]);expect(c.getState().profile.unlockedBlueprints).toEqual(['rail']);
    expect(c.selectMission(ids[0]!)).toBe(true);
    expect(c.getState().loanedBlueprints).toEqual([]);
    expect(c.getState().mission!.specialistOptions).toEqual([]);
    expect(c.getState().mission!.render.towers).toEqual([]);
    expect(c.getState().mission!.ui).toMatchObject({phase:'opening',tick:0,speed:1,fieldCredits:100,lives:20});
  });
  it('defeat awards nothing, writes nothing, and permits retry',async()=>{
    const {FirstSessionController}=await api(),w=writer(),base=progress(),c=new FirstSessionController(base,w);
    c.selectMission(ids[2]!);play(c,'m3-empty-defeat');
    expect(c.getState()).toMatchObject({screen:'results',saveStatus:'idle',result:{outcome:'defeat',stars:0,awardedBlueprints:[]}});
    expect(c.getState().profile).toEqual(base);expect(w.writes).toHaveLength(0);
    expect(c.retryMission()).toBe(true);expect(c.getState().result).toBeNull();
    expect(c.getState().mission!.ui).toMatchObject({phase:'opening',speed:1,fieldCredits:120});
  });
  it('restores the opening layout on retry and respects foreground state across mission switches',async()=>{
    const {FirstSessionController}=await api(),c=new FirstSessionController(progress(),writer());
    c.selectMission(ids[2]!);c.tapCell(51);c.installSelected('rail');c.aimSelected(90000);c.startWave();c.cycleSpeed();c.advanceFrame(100);
    expect(c.retryMission()).toBe(true);
    expect(c.getState().mission!.render.towers[0]).toMatchObject({cell:51,familyId:'rail',facingMilliDegrees:90000});
    expect(c.getState().mission!.ui).toMatchObject({phase:'opening',tick:0,speed:1,fieldCredits:75});
    c.setForeground(false);c.selectMission(ids[1]!);c.startWave();c.advanceFrame(100);
    expect(c.getState().mission!.ui.tick).toBe(0);
  });
  it('round-trips a saved victory through the real ProfileStore and reopens the map',async()=>{
    const {FirstSessionController}=await api(),data=new Map<string,string>();
    const storage={async get({key}:{key:string}){return {value:data.get(key)??null};},async set({key,value}:{key:string;value:string}){data.set(key,value);}};
    const store=new ProfileStore(storage),loaded=await store.load();
    const c=new FirstSessionController(loaded.profile!,store);play(c,'m1-foundation-corridor-win');await settled(c);
    const restored=await new ProfileStore(storage).load();
    const next=new FirstSessionController(restored.profile!,writer());
    expect(next.getState()).toMatchObject({screen:'map',mapAvailable:true});
    expect(next.selectMission(ids[1]!)).toBe(true);
  });
  it('keeps published snapshots detached and stops notifications after disposal',async()=>{
    const {FirstSessionController}=await api(),input=structuredClone(createPlayerProfile()),c=new FirstSessionController(input,writer());
    (input.completedMissions as Record<string,number>)[ids[0]!]=3;
    expect(c.getState().nodes[1]!.locked).toBe(true);
    let calls=0;const off=c.subscribe(()=>{calls++;});expect(calls).toBe(1);
    const before=c.getState();c.tapCell(21);expect(before.mission!.render.towers).toHaveLength(0);frozen(before);
    off();const count=calls;c.tapCell(30);expect(calls).toBe(count);
    c.subscribe(()=>{calls++;});c.dispose();const disposed=calls;c.tapCell(39);c.advanceFrame(100);expect(calls).toBe(disposed);
  });
  it('applies immutable max-Star/set-award results without changing unrelated profile data',async()=>{
    const {applyMissionResult}=await api();const input=parsePlayerProfile({...progress(),seenHelp:['foundation-help']});
    const entry=FIRST_SESSION_MISSIONS[2]!;
    const once=applyMissionResult(input,entry,{outcome:'victory',stars:2});
    const twice=applyMissionResult(once,entry,{outcome:'victory',stars:1});
    expect(twice).toEqual(once);expect(once.completedMissions[ids[2]!]).toBe(2);expect(once.unlockedBlueprints).toEqual(['rail']);
    expect(once.destination).toEqual({kind:'map'});expect(once.seenHelp).toEqual(['foundation-help']);
    expect(input.unlockedBlueprints).toEqual([]);expect(input.completedMissions[ids[2]!]).toBeUndefined();frozen(once);
    expect(applyMissionResult(once,entry,{outcome:'victory',stars:3}).completedMissions[ids[2]!]).toBe(3);
    expect(applyMissionResult(input,entry,{outcome:'defeat',stars:0})).toEqual(input);
    expect(()=>applyMissionResult(input,entry,{outcome:'victory',stars:0} as unknown as Result)).toThrow();
  });
});
