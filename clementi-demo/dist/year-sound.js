/* Sound and music for the seven-year game, synthesised live with Web Audio (no audio files, so the
 * offline single-file build sounds the same).
 * · Music: one gentle generated piece per moment — the estate map, inside a home, deciding, putting
 *   policies in place, the year report, and the ending — crossfading when the moment changes.
 * · Effects: taps, footsteps, knocking, a resident's voice, openness rising, a need found, cards, alerts.
 * · Controls: a speaker button in the top bar with music and effects volume; settings are remembered.
 * Audio only starts after the player's first tap or key, as browsers require. */
(function(root){
  'use strict';
  const doc=root.document;if(!doc)return;
  const KEY='downstairs-clementi-sound';
  const lang=()=>root.CM_I18N?.getLanguage?.()==='en'?'en':'zh',w=(zh,en)=>lang()==='en'?en:zh;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function loadPrefs(){try{const p=JSON.parse(root.localStorage.getItem(KEY)||'{}');return {music:num(p.music,.55),sfx:num(p.sfx,.75),muted:!!p.muted};}catch(_){return {music:.55,sfx:.75,muted:false};}}
  function num(v,d){v=Number(v);return Number.isFinite(v)?Math.max(0,Math.min(1,v)):d;}
  function savePrefs(){try{root.localStorage.setItem(KEY,JSON.stringify(prefs));}catch(_){}}
  const prefs=loadPrefs();
  const mtof=m=>440*Math.pow(2,(m-69)/12);
  let rnd=Math.random;

  /* —— Audio graph —— */
  let ctx=null,out=null,musicBus=null,sfxBus=null,verb=null,verbIn=null,noise=null,unlocked=false;
  function build(){
    if(ctx)return ctx;const AC=root.AudioContext||root.webkitAudioContext;if(!AC)return null;
    try{ctx=new AC({latencyHint:'interactive'});}catch(_){return null;}
    wire();return ctx;
  }
  function wire(){
    const comp=ctx.createDynamicsCompressor();comp.threshold.value=-16;comp.knee.value=12;comp.ratio.value=3;comp.attack.value=.004;comp.release.value=.25;
    out=ctx.createGain();out.gain.value=prefs.muted?0:1;out.connect(comp);comp.connect(ctx.destination);
    musicBus=ctx.createGain();musicBus.gain.value=prefs.music*.8;musicBus.connect(out);
    sfxBus=ctx.createGain();sfxBus.gain.value=prefs.sfx;sfxBus.connect(out);
    verb=ctx.createConvolver();verb.buffer=impulse(2.4,2.8);const verbOut=ctx.createGain();verbOut.gain.value=.32;verb.connect(verbOut);verbOut.connect(out);
    verbIn=ctx.createGain();verbIn.gain.value=1;verbIn.connect(verb);
    noise=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate);const d=noise.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=rnd()*2-1;
  }
  function impulse(seconds,decay){const rate=ctx.sampleRate,len=Math.floor(rate*seconds),b=ctx.createBuffer(2,len,rate);for(let c=0;c<2;c++){const d=b.getChannelData(c);for(let i=0;i<len;i++)d[i]=(rnd()*2-1)*Math.pow(1-i/len,decay)*(i<rate*.012?i/(rate*.012):1);}return b;}
  // Small helpers: an oscillator, a gain with an envelope, a filter, a stereo pan, a noise source.
  const osc=(type,f,t)=>{const o=ctx.createOscillator();o.type=type;o.frequency.setValueAtTime(f,t);return o;};
  function amp(t,peak,attack,decay,sustain=0,hold=0,release=.08){const g=ctx.createGain(),p=g.gain;p.value=0;p.setValueAtTime(0,t);p.linearRampToValueAtTime(peak,t+attack);if(sustain>0){p.setTargetAtTime(peak*sustain,t+attack,decay/3);p.setValueAtTime(peak*sustain,t+attack+hold);p.setTargetAtTime(0.0001,t+attack+hold,release/3);}else p.exponentialRampToValueAtTime(0.0001,t+attack+decay);return g;}
  const filt=(type,f,q=.7)=>{const n=ctx.createBiquadFilter();n.type=type;n.frequency.value=f;n.Q.value=q;return n;};
  function pan(v){if(!ctx.createStereoPanner)return ctx.createGain();const p=ctx.createStereoPanner();p.pan.value=v;return p;}
  function noiseSrc(t,dur){const s=ctx.createBufferSource();s.buffer=noise;s.loop=true;s.start(t,rnd()*1.5);s.stop(t+dur+.05);return s;}
  function send(node,dest,wet){node.connect(dest);if(wet>0){const g=ctx.createGain();g.gain.value=wet;node.connect(g);g.connect(verbIn);}}

  /* —— Instruments (used by both the music and the effects) —— */
  // Soft electric piano: two sines and a short bright tine.
  function keys(t,m,dur,vel,dest,wet=.25,p=0){const f=mtof(m),lp=filt('lowpass',3800),pn=pan(p);lp.connect(pn);send(pn,dest,wet);
    const a=osc('sine',f,t),b=osc('sine',f*2,t),e=osc('triangle',f*3,t),c=osc('sine',f*7.02,t),ga=amp(t,vel,.006,1.6+dur,.32,dur,.5),gb=amp(t,vel*.34,.004,.6),ge=amp(t,vel*.1,.003,.25),gc=amp(t,vel*.1,.002,.12);
    a.connect(ga);b.connect(gb);e.connect(ge);c.connect(gc);ga.connect(lp);gb.connect(lp);ge.connect(lp);gc.connect(lp);for(const o of [a,b,e,c]){o.start(t);o.stop(t+dur+1.2);}}
  // Warm pad: triangle plus a quiet detuned saw through a low filter, slow in and out.
  function pad(t,notes,dur,vel,dest,wet=.45){const lp=filt('lowpass',1250,.4),g=ctx.createGain();g.gain.value=0;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vel,t+.9);g.gain.setValueAtTime(vel,t+Math.max(.95,dur-.2));g.gain.linearRampToValueAtTime(0,t+dur+1.3);lp.connect(g);send(g,dest,wet);
    for(const m of notes){const f=mtof(m),a=osc('triangle',f,t),b=osc('sawtooth',f*1.004,t),gb=ctx.createGain();gb.gain.value=.3;a.connect(lp);b.connect(gb);gb.connect(lp);a.start(t);b.start(t);a.stop(t+dur+1.4);b.stop(t+dur+1.4);}}
  // Marimba-like mallet.
  function mallet(t,m,vel,dest,wet=.2,p=0,decay=.55){const f=mtof(m),pn=pan(p);send(pn,dest,wet);const a=osc('sine',f,t),b=osc('sine',f*3.98,t),ga=amp(t,vel,.002,decay),gb=amp(t,vel*.28,.001,.07);a.connect(ga);b.connect(gb);ga.connect(pn);gb.connect(pn);a.start(t);b.start(t);a.stop(t+decay+.1);b.stop(t+.2);}
  // Small FM bell.
  function bell(t,m,vel,dest,wet=.35,p=0,decay=1.5){const f=mtof(m),pn=pan(p);send(pn,dest,wet);const c=osc('sine',f,t),mod=osc('sine',f*2.76,t),mg=ctx.createGain();mg.gain.setValueAtTime(f*1.3,t);mg.gain.exponentialRampToValueAtTime(f*.02,t+.35);mod.connect(mg);mg.connect(c.frequency);const g=amp(t,vel,.003,decay);c.connect(g);g.connect(pn);c.start(t);mod.start(t);c.stop(t+decay+.1);mod.stop(t+decay+.1);}
  function bass(t,m,dur,vel,dest){if(m<43)m+=12;const f=mtof(m),lp=filt('lowpass',700),a=osc('sine',f,t),b=osc('triangle',f,t),gb=ctx.createGain();gb.gain.value=.35;const g=amp(t,vel,.012,.4,.72,dur,.16);a.connect(g);b.connect(gb);gb.connect(g);g.connect(lp);const hp=filt('highpass',55);lp.connect(hp);hp.connect(dest);a.start(t);b.start(t);a.stop(t+dur+.4);b.stop(t+dur+.4);}
  function kick(t,vel,dest){const o=osc('sine',150,t);o.frequency.exponentialRampToValueAtTime(58,t+.11);const g=amp(t,vel,.002,.3);o.connect(g);g.connect(dest);o.start(t);o.stop(t+.35);}
  function hat(t,vel,dest,p=.15,len=.045){const s=noiseSrc(t,len),hp=filt('highpass',7200),g=amp(t,vel*1.5,.001,len),pn=pan(p);s.connect(hp);hp.connect(g);g.connect(pn);pn.connect(dest);}
  function shaker(t,vel,dest,p=-.2){const s=noiseSrc(t,.09),bp=filt('bandpass',5200,1.1),g=amp(t,vel,.012,.07),pn=pan(p);s.connect(bp);bp.connect(g);g.connect(pn);pn.connect(dest);}
  function rim(t,vel,dest){const o=osc('triangle',1650,t),g=amp(t,vel,.001,.03),s=noiseSrc(t,.05),bp=filt('bandpass',2600,2),gn=amp(t,vel*.6,.001,.04);o.connect(g);s.connect(bp);bp.connect(gn);g.connect(dest);gn.connect(dest);o.start(t);o.stop(t+.06);}
  // A bird far off — only on the estate map.
  function bird(t,dest){const base=2300+rnd()*1400,pn=pan(rnd()*1.4-.7);pn.connect(dest);for(let n=0,k=2+Math.floor(rnd()*3);n<k;n++){const s=t+n*(.09+rnd()*.05),o=osc('sine',base,s);o.frequency.exponentialRampToValueAtTime(base*(1.25+rnd()*.3),s+.05);o.frequency.exponentialRampToValueAtTime(base*.9,s+.08);const g=amp(s,.035,.008,.08);o.connect(g);g.connect(pn);o.start(s);o.stop(s+.12);}}

  /* —— Music: one generated piece per moment —— */
  // Chords are [voicing, bass]. Melody notes are picked from the scale and lean on chord tones on the beat.
  const SCENES={
    map:{bpm:78,swing:.17,level:.9,key:'F',
      chords:[[[53,57,60,64],41],[[52,55,57,60],45],[[50,53,57,60,64],38],[[50,53,57,60],34],[[53,57,60,64],41],[[52,55,57,60],45],[[50,53,57,60,64],38],[[55,58,62,65],36]],
      scale:[65,67,69,72,74,77,79,81,84,86],lead:'mallet',mix:{pad:.075,keys:.132,bass:.112,lead:.106,hat:.048,shaker:.031,kick:0,rim:0},keysAt:[0,6,10],bassAt:[0,10],density:.3,birds:true},
    title:{bpm:72,swing:.12,level:.75,
      chords:[[[53,57,60,64],41],[[52,55,57,60],45],[[50,53,57,60,64],38],[[55,58,62,65],36]],
      scale:[65,67,69,72,74,77,79,81],lead:'keys',mix:{pad:.09,keys:.120,bass:.084,lead:.088},keysAt:[0,10],bassAt:[0],density:.2,birds:true},
    home:{bpm:66,swing:.1,level:.55,
      chords:[[[51,55,58,62],39],[[48,51,55,58],36],[[48,51,55,58],44],[[51,55,58,60],46]],
      scale:[63,65,67,70,72,75,77,79],lead:'keys',mix:{pad:.085,arp:.072,bass:.070,lead:.062},arpAt:[0,4,8,12],arpChance:.55,bassAt:[0],density:.12},
    decide:{bpm:88,swing:.08,level:.78,
      chords:[[[55,59,60,64],45],[[53,57,60,64],41],[[55,59,60,64],36],[[55,59,62,64],43]],
      scale:[64,67,69,71,72,76,79,81],lead:'bell',mix:{pad:.055,arp:.090,bass:.105,lead:.075,kick:.210,hat:.048,shaker:.026},arpAt:[0,2,4,6,8,10,12,14],arpChance:.9,arpInst:'mallet',bassAt:[0,6,8],kickAt:[0,8],hatAt:[2,6,10,14],shakerAll:true,density:.16},
    build:{bpm:100,swing:.1,level:.82,
      chords:[[[55,59,60,64],36],[[55,59,62,67],47],[[55,57,60,64],45],[[53,57,60,64,67],41]],
      scale:[67,69,72,74,76,79,81,84],lead:'bell',mix:{pad:.05,keys:.102,bass:.105,lead:.088,kick:.255,hat:.066,shaker:.031,rim:.063},keysAt:[2,6,10,14],keysShort:true,bassAt:[0,4,8,12],bassOct:[6,14],kickAt:[0,4,8,12],hatAt:[2,6,10,14],shakerAll:true,rimAt:[4,12],density:.3},
    report:{bpm:72,swing:.1,level:.72,
      chords:[[[54,57,61,64],38],[[50,54,57,59],35],[[54,57,59,62],43],[[52,57,59,61],45]],
      scale:[66,69,71,73,76,78,81,83],lead:'keys',mix:{pad:.08,arp:.084,bass:.084,lead:.075},arpAt:[0,2,4,6,8,10,12,14],arpChance:.7,bassAt:[0],density:.18},
    win:{bpm:90,swing:.12,level:.85,
      chords:[[[53,57,60,64],41],[[55,59,62,65],41],[[52,55,59,62],40],[[55,57,60,64],45]],
      scale:[65,67,69,71,72,76,77,79,81,84],lead:'bell',mix:{pad:.06,keys:.108,bass:.098,lead:.100,kick:.165,hat:.055,shaker:.026},keysAt:[0,6,10],bassAt:[0,10],kickAt:[0,8],hatAt:[2,6,10,14],density:.38},
    lose:{bpm:62,swing:.06,level:.62,
      chords:[[[52,57,60,64],45],[[53,57,60,64],41],[[52,55,60,64],36],[[52,56,59,62],40]],
      scale:[64,67,69,71,72,76,79],lead:'keys',mix:{pad:.09,arp:.060,bass:.077,lead:.062},arpAt:[0,4,8,12],arpChance:.6,bassAt:[0],density:.14}
  };
  let scene=null,sceneName='',wanted='',nextTime=0,step=0,pumpTimer=0;
  function makeScene(name){
    const def=SCENES[name];if(!def)return null;const g=ctx.createGain();g.gain.value=0;g.gain.setValueAtTime(0,ctx.currentTime);g.gain.linearRampToValueAtTime(def.level,ctx.currentTime+1.8);g.connect(musicBus);
    return {name,def,gain:g,stepDur:60/def.bpm/4,motif:null,phrase:-1,last:Math.floor(def.scale.length/2),arpN:0};
  }
  function setScene(name){
    wanted=name||'';if(!ctx||!unlocked||name===sceneName)return;
    const old=scene;if(old){const t=ctx.currentTime;old.gain.gain.cancelScheduledValues(t);old.gain.gain.setValueAtTime(old.gain.gain.value,t);old.gain.gain.linearRampToValueAtTime(0,t+1.6);root.setTimeout(()=>{try{old.gain.disconnect();}catch(_){}} ,4200);}
    sceneName=name;scene=name?makeScene(name):null;step=0;nextTime=ctx.currentTime+.15;
  }
  function chordTones(ch){return new Set(ch[0].map(m=>m%12).concat(ch[1]%12));}
  // A two-bar idea, then the same idea again with its tail changed; every other phrase may rest.
  function newMotif(sc){const d=sc.def,n=d.scale.length,list=[];let at=sc.last;for(let i=0;i<16;i++){if(rnd()<d.density*(i%4===0?1.5:i%2?0.55:1)){at=Math.max(0,Math.min(n-1,at+[-2,-1,-1,0,1,1,2][Math.floor(rnd()*7)]));list.push(at);}else list.push(null);}sc.last=at;return list;}
  function playStep(sc,s,t){
    const d=sc.def,m=d.mix,bar=Math.floor(s/16),i=s%16,ch=d.chords[bar%d.chords.length],beat=sc.stepDur*4,barDur=beat*4,out=sc.gain;
    const swing=i%2?sc.stepDur*d.swing:0,ts=t+swing,vel=v=>v*(.86+rnd()*.22);
    if(i===0&&m.pad)pad(t,ch[0],barDur,m.pad,out);
    if(m.bass&&d.bassAt?.includes(i))bass(t,ch[1],(i===0&&d.bassAt.length===1?barDur:beat)*.9,vel(m.bass),out);
    if(m.bass&&d.bassOct?.includes(i))bass(ts,ch[1]+12,beat*.4,vel(m.bass*.7),out);
    if(m.keys&&d.keysAt?.includes(i)){const top=ch[0].slice(-3).map(n=>n+12);top.forEach((n,k)=>keys(ts+k*.014,n,d.keysShort?beat*.35:beat*1.2,vel(m.keys)/1.6,out,.25,(k-1)*.25));}
    if(m.arp&&d.arpAt?.includes(i)&&rnd()<d.arpChance){const notes=ch[0].map(n=>n+12).concat(ch[0][0]+24);const n=notes[sc.arpN++%notes.length];(d.arpInst==='mallet'?mallet:(tt,mm,vv,o)=>keys(tt,mm,beat*.8,vv,o,.35,(rnd()-.5)*.6))(ts,n,vel(m.arp),out,.25,(rnd()-.5)*.6);}
    if(m.kick&&d.kickAt?.includes(i))kick(t,vel(m.kick),out);
    if(m.hat&&d.hatAt?.includes(i))hat(ts,vel(m.hat),out);
    if(m.shaker&&d.shakerAll&&i%2)shaker(ts,vel(m.shaker),out);
    if(m.hat&&!d.hatAt&&i%2===0&&i)hat(ts,vel(m.hat)*(i%4?1:.6),out);
    if(m.shaker&&!d.shakerAll&&i%4===2)shaker(ts,vel(m.shaker),out);
    if(m.rim&&d.rimAt?.includes(i))rim(ts,vel(m.rim),out);
    if(m.lead&&i%2===0){const phrase=Math.floor(bar/4);if(phrase!==sc.phrase){sc.phrase=phrase;sc.resting=phrase%2===1&&rnd()<.45;if(!sc.motif||rnd()<.55)sc.motif=newMotif(sc);sc.variant=sc.motif.map((v,k)=>v!=null&&k>=10&&rnd()<.6?Math.max(0,Math.min(d.scale.length-1,v+(rnd()<.5?-1:1))):v);}
      const idx=((bar%4)<2?sc.motif:sc.variant)[(bar%2)*8+i/2];
      if(!sc.resting&&idx!=null){let note=d.scale[idx];if(i%4===0){const tones=chordTones(ch);if(!tones.has(note%12)){const near=[idx+1,idx-1,idx+2,idx-2].map(k=>d.scale[k]).find(n=>n!=null&&tones.has(n%12));if(near)note=near;}}
        const v=vel(m.lead),p=(rnd()-.5)*.5;if(d.lead==='mallet')mallet(ts,note,v,out,.3,p);else if(d.lead==='bell')bell(ts,note,v*.8,out,.4,p,1.1);else keys(ts,note,beat*.9,v,out,.35,p);}}
    if(d.birds&&i===0&&rnd()<.22)bird(t+rnd()*barDur*.8,out);
  }
  function pump(){if(!ctx||!scene||ctx.state!=='running')return;const ahead=ctx.currentTime+.2;if(nextTime<ctx.currentTime-.5)nextTime=ctx.currentTime+.05;while(nextTime<ahead){playStep(scene,step,nextTime);nextTime+=scene.stepDur;step++;}}

  /* —— Effects —— */
  const voiceOf=id=>{let h=0;for(const c of String(id||''))h=(h*31+c.charCodeAt(0))>>>0;return 150+h%150;};
  const FX={
    tap(t){const o=osc('sine',900,t);o.frequency.exponentialRampToValueAtTime(620,t+.04);const g=amp(t,.13,.002,.06);o.connect(g);g.connect(sfxBus);o.start(t);o.stop(t+.08);},
    open(t){keys(t,76,.12,.09,sfxBus,.2);keys(t+.06,83,.15,.08,sfxBus,.25);},
    close(t){keys(t,79,.1,.08,sfxBus,.2);keys(t+.06,72,.14,.07,sfxBus,.2);},
    step(t){const s=noiseSrc(t,.06),lp=filt('lowpass',520+rnd()*160),g=amp(t,.16,.004,.05);stepSide=-stepSide;const pn=pan(stepSide);s.connect(lp);lp.connect(g);g.connect(pn);pn.connect(sfxBus);const o=osc('sine',85+rnd()*15,t),go=amp(t,.11,.003,.06);o.connect(go);go.connect(sfxBus);o.start(t);o.stop(t+.08);},
    bump(t){const o=osc('sine',120,t);o.frequency.exponentialRampToValueAtTime(70,t+.09);const g=amp(t,.22,.003,.12);o.connect(g);g.connect(sfxBus);o.start(t);o.stop(t+.15);const s=noiseSrc(t,.08),lp=filt('lowpass',300),gn=amp(t,.12,.002,.07);s.connect(lp);lp.connect(gn);gn.connect(sfxBus);},
    look(t){bell(t,91,.1,sfxBus,.4,.2,.7);bell(t+.07,96,.085,sfxBus,.45,.25,.9);},
    knock(t){for(const [dt,v] of [[0,1],[.17,.85],[.3,.7]]){const s=t+dt,n=noiseSrc(s,.08),bp=filt('bandpass',230,1.4),g=amp(s,.36*v,.002,.07);n.connect(bp);bp.connect(g);g.connect(sfxBus);const o=osc('sine',150,s);o.frequency.exponentialRampToValueAtTime(95,s+.08);const go=amp(s,.3*v,.002,.1);o.connect(go);go.connect(sfxBus);o.start(s);o.stop(s+.14);}},
    enter(t){FX.knock(t);keys(t+.62,72,.3,.07,sfxBus,.35);keys(t+.72,79,.4,.07,sfxBus,.4);},
    refused(t){FX.knock(t);keys(t+.65,64,.3,.075,sfxBus,.3);keys(t+.85,60,.5,.065,sfxBus,.35);},
    voice(t,id){const base=voiceOf(id),count=3+Math.floor(rnd()*4);for(let n=0;n<count;n++){const s=t+n*(.075+rnd()*.03),f=base*(.82+rnd()*.42),o=osc('triangle',f,s);o.frequency.linearRampToValueAtTime(f*(rnd()<.5?1.08:.94),s+.05);const bp=filt('bandpass',900+rnd()*700,1.2),g=amp(s,.42,.008,.055);o.connect(bp);bp.connect(g);g.connect(sfxBus);o.start(s);o.stop(s+.08);}},
    reply(t){const s=noiseSrc(t,.08),bp=filt('bandpass',2400,.8),g=amp(t,.05,.01,.07);s.connect(bp);bp.connect(g);g.connect(sfxBus);keys(t+.02,72,.12,.07,sfxBus,.2);keys(t+.07,76,.15,.06,sfxBus,.25);},
    trust(t,level){const tops={1:[84],2:[84,86],3:[84,88],5:[79,84,88,91]}[level]||[84];tops.forEach((m,k)=>bell(t+k*.07,m,.1,sfxBus,.45,(k-1)*.2,1.2));},
    found(t){[72,76,79,84,88].forEach((m,k)=>bell(t+k*.065,m,.075,sfxBus,.5,(k-2)*.18,1.6));const s=noiseSrc(t+.25,.6),hp=filt('highpass',6500),g=ctx.createGain();g.gain.value=0;g.gain.setValueAtTime(0,t+.25);g.gain.linearRampToValueAtTime(.03,t+.4);g.gain.linearRampToValueAtTime(0,t+.85);s.connect(hp);hp.connect(g);send(g,sfxBus,.6);},
    card(t){const s=noiseSrc(t,.05),hp=filt('highpass',1800),g=amp(t,.16,.001,.045);s.connect(hp);hp.connect(g);g.connect(sfxBus);mallet(t+.015,79,.12,sfxBus,.2,0,.4);},
    flip(t){const s=noiseSrc(t,.16),bp=filt('bandpass',900,1.2);bp.frequency.exponentialRampToValueAtTime(3600,t+.14);const g=amp(t,.11,.03,.12);s.connect(bp);bp.connect(g);g.connect(sfxBus);},
    confirm(t){bell(t,79,.11,sfxBus,.35,-.1,.9);bell(t+.09,84,.12,sfxBus,.4,.1,1.2);},
    build(t){for(const dt of [0,.16,.32]){const s=t+dt,o=osc('sine',310+rnd()*40,s),g=amp(s,.17,.002,.09);o.connect(g);g.connect(sfxBus);o.start(s);o.stop(s+.12);const n=noiseSrc(s,.04),bp=filt('bandpass',1800,1.5),gn=amp(s,.1,.001,.03);n.connect(bp);bp.connect(gn);gn.connect(sfxBus);}bell(t+.5,84,.06,sfxBus,.45,0,1.2);},
    service(t){[79,84,88].forEach((m,k)=>bell(t+k*.05,m,.055,sfxBus,.45,(k-1)*.25,1.4));},
    report(t){FX.flip(t);[62,66,69,73,76].forEach((m,k)=>keys(t+.15+k*.05,m,.9,.06,sfxBus,.4,(k-2)*.15));},
    year(t){bell(t,84,.09,sfxBus,.5,0,2.4);bell(t+.02,91,.04,sfxBus,.5,.2,2);},
    alert(t){for(const [dt,m] of [[0,81],[.18,76],[.42,81],[.6,76]]){const s=t+dt,o=osc('triangle',mtof(m),s),g=amp(s,.12,.01,.15);o.connect(g);g.connect(sfxBus);o.start(s);o.stop(s+.18);}},
    tour(t){const o=osc('sine',620,t);o.frequency.exponentialRampToValueAtTime(930,t+.08);const g=amp(t,.1,.006,.14);o.connect(g);send(g,sfxBus,.3);o.start(t);o.stop(t+.18);},
    toast(t){const o=osc('sine',440,t),g=amp(t,.07,.004,.08);o.connect(g);g.connect(sfxBus);o.start(t);o.stop(t+.1);},
    win(t){[72,76,79,84,88,91].forEach((m,k)=>bell(t+k*.11,m,.08,sfxBus,.5,(k-2.5)*.15,1.8));[60,64,67,72].forEach(m=>keys(t+.7,m,1.6,.05,sfxBus,.45));},
    lose(t){[69,67,64,60].forEach((m,k)=>keys(t+k*.22,m,.6,.07,sfxBus,.45));}
  };
  let stepSide=.18,lastPlay={};
  const played=[];
  function play(name,arg){
    if(FX[name]){played.push(name);if(played.length>80)played.shift();}
    if(prefs.muted||!unlocked||!ctx||ctx.state!=='running'||!FX[name]||prefs.sfx<=0)return;
    const now=ctx.currentTime,gap={step:.06,tap:.05,voice:.3,trust:.3}[name]??.04;if(now-(lastPlay[name]||-1)<gap)return;lastPlay[name]=now;
    try{FX[name](now+.005,arg);}catch(_){}
  }

  /* —— Starting, muting, the hidden tab —— */
  function unlock(){
    if(!build())return;unlocked=true;if(!prefs.muted&&ctx.state!=='running')ctx.resume?.().catch?.(()=>{});
    if(wanted&&wanted!==sceneName)setScene(wanted);
    if(!pumpTimer)pumpTimer=root.setInterval(pump,40);
  }
  ['pointerdown','keydown','touchstart'].forEach(type=>doc.addEventListener(type,()=>{if(!unlocked||ctx?.state==='suspended'&&!prefs.muted&&!doc.hidden)unlock();},{capture:true,passive:true}));
  doc.addEventListener('visibilitychange',()=>{if(!ctx)return;if(doc.hidden)ctx.suspend?.();else if(!prefs.muted&&unlocked)ctx.resume?.().then?.(()=>{nextTime=ctx.currentTime+.1;});});
  function apply(){
    if(!ctx)return;const t=ctx.currentTime;
    musicBus.gain.setTargetAtTime(prefs.music*.8,t,.05);sfxBus.gain.setTargetAtTime(prefs.sfx,t,.05);out.gain.setTargetAtTime(prefs.muted?0:1,t,.05);
    if(prefs.muted)root.setTimeout(()=>{if(prefs.muted)ctx.suspend?.();},250);else if(unlocked&&!doc.hidden)ctx.resume?.();
  }
  function set(next){Object.assign(prefs,next);prefs.music=num(prefs.music,.55);prefs.sfx=num(prefs.sfx,.75);savePrefs();apply();paintButton();}

  /* —— Watching the game: which music fits now, and what just happened —— */
  const seen={phase:null,year:null,learned:null,talk:null,lines:0,level:null,tour:null,toast:'',alert:false,effect:null,home:false,refusal:false};
  function learnedCount(s){return Object.values(s?.learnedIssues||{}).filter(v=>v===true).length+Object.values(s?.extraLearnedIssues||{}).filter(v=>v===true).length;}
  function watch(){
    const app=root.CM_YEAR_APP,s=app?.getState?.(),modal=doc.getElementById('modal'),open=!!modal?.open,phase=doc.body.dataset.phase||s?.phase||'visit';
    const home=open&&modal.classList.contains('home-modal'),refusal=open&&modal.classList.contains('refusal-modal'),flow=!!root.CM_FLOW?.isActive?.();
    const want=flow?'title':phase==='ended'?(s?.outcome==='win'?'win':'lose'):home?'home':phase==='policy'||phase==='needs'?'decide':phase==='enact'?'build':phase==='report'?'report':'map';
    setScene(want);
    if(!s)return;
    if(home&&!seen.home)play('enter');if(refusal&&!seen.refusal)play('refused');
    if(seen.phase&&phase!==seen.phase){if(phase==='report')play('report');else if(phase==='ended')play(s.outcome==='win'?'win':'lose');}
    if(seen.year!=null&&s.year>seen.year)play('year');
    const learned=learnedCount(s);if(seen.learned!=null&&learned>seen.learned)play('found');
    // The resident's newest line, and the openness meter climbing.
    const panel=home?doc.getElementById('year-talk-panel'):null,talk=panel?.dataset.yearTalkIssue||null,lines=panel?panel.querySelectorAll('.year-talk-exchange:not(.is-pending)').length:0,level=Number(panel?.querySelector('.year-talk-trust')?.dataset.level);
    if(talk&&talk===seen.talk){if(lines>seen.lines)play('voice',doc.querySelector('.cm-home-panel')?.dataset.homeResident);if(Number.isFinite(level)&&Number.isFinite(seen.level)&&level>seen.level&&level!==4)play('trust',level);}
    seen.talk=talk;seen.lines=lines;seen.level=Number.isFinite(level)?level:null;
    const fx=phase==='enact'?s.ux?.effectIndex:null;if(fx!=null&&fx!==seen.effect){const item=s.ux?.plan?.[fx];if(item)play(item.policyId==='capital'?'build':'service');}seen.effect=fx;
    const alert=!!doc.querySelector('.yr-alert');if(alert&&!seen.alert)play('alert');seen.alert=alert;
    const tour=root.CM_YEAR_TOUR?.current?.()?.id||null;if(tour&&tour!==seen.tour)play('tour');seen.tour=tour;
    const t=doc.getElementById('toast'),toastText=t&&!t.hidden?t.textContent:'';if(toastText&&toastText!==seen.toast)play('toast');seen.toast=toastText;
    Object.assign(seen,{phase,year:s.year,learned,home,refusal});
  }
  root.setInterval(watch,120);

  // Direct taps get their sound at once. The room's own taps (walk, look, bump) come from the room.
  const TAPS=[['[data-year-action="choose"],.policy-option','card'],['[data-year-action="flip"],.yr-card-info','flip'],['[data-year-talk-choice],[data-year-talk-object]','reply'],['#year-next,.yr-report-next,[data-year-action="next"]','confirm'],['[data-year-talk-return],[data-year-action="close"],.close,[data-tour="skip"]','close'],['[data-year-action="visit"],.yr-home,#cm-home-map *,[data-sound-off]',null],['[data-year-action="help"],[data-year-action="notes"],[data-year-action="settings"],[data-year-action="decade"],[data-year-action="finance"],[data-year-action="need"]','open']];
  doc.addEventListener('click',event=>{const el=event.target.closest?.('button,[role="button"],summary,a[href]');if(!el||el.disabled||el.getAttribute('aria-disabled')==='true')return;const hit=TAPS.find(([sel])=>el.matches(sel));const name=hit?hit[1]:'tap';if(name)play(name);},true);
  doc.addEventListener('submit',event=>{if(event.target.closest?.('[data-year-talk-form]'))play('reply');},true);

  /* —— The speaker button and its little panel —— */
  const ICON={on:'<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',off:'<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="m16 9.5 5 5M21 9.5l-5 5"/>',music:'<path d="M9 18V5.5l10-2V16"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>',fx:'<path d="M12 3v3M12 18v3M4.6 6.6l2.1 2.1M17.3 15.3l2.1 2.1M3 12h3M18 12h3M4.6 17.4l2.1-2.1M17.3 8.7l2.1-2.1"/><circle cx="12" cy="12" r="2.4"/>'};
  const svg=d=>'<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+d+'</svg>';
  let button=null,popover=null;
  function paintButton(){if(!button)return;const off=prefs.muted||prefs.music+prefs.sfx===0;if(button.dataset.icon!==String(off)){button.innerHTML=svg(off?ICON.off:ICON.on);button.dataset.icon=String(off);}const label=w('声音','Sound');button.title=label;button.setAttribute('aria-label',label+' · '+(off?w('已静音','muted'):w('开','on')));button.classList.toggle('is-muted',off);button.setAttribute('aria-expanded',String(!!popover&&!popover.hidden));if(popover&&!popover.hidden)paintPopover();}
  function paintPopover(){
    const row=(k,icon,label)=>'<label class="yr-sound-row"><span class="yr-sound-ico">'+svg(icon)+'</span><span class="yr-sound-name">'+esc(label)+'</span><input type="range" min="0" max="100" step="5" value="'+Math.round(prefs[k]*100)+'" data-sound-volume="'+k+'" aria-label="'+esc(label)+'"><output>'+Math.round(prefs[k]*100)+'</output></label>';
    popover.innerHTML='<div class="yr-sound-head"><strong>'+esc(w('声音','Sound'))+'</strong><button type="button" class="yr-sound-mute'+(prefs.muted?' is-on':'')+'" data-sound-mute data-sound-off aria-pressed="'+prefs.muted+'">'+svg(prefs.muted?ICON.off:ICON.on)+'<span>'+esc(prefs.muted?w('已静音','Muted'):w('静音','Mute'))+'</span></button></div>'+row('music',ICON.music,w('音乐','Music'))+row('sfx',ICON.fx,w('音效','Effects'));
  }
  function place(){if(!popover||popover.hidden||!button)return;const r=button.getBoundingClientRect(),wd=popover.offsetWidth||260;popover.style.top=Math.round(r.bottom+8)+'px';popover.style.left=Math.round(Math.max(8,Math.min(root.innerWidth-wd-8,r.right-wd)))+'px';}
  function toggle(show){if(!popover){popover=doc.createElement('div');popover.className='yr-sound-pop';popover.hidden=true;popover.setAttribute('role','dialog');popover.dataset.i18nIgnore='';doc.body.appendChild(popover);
      popover.addEventListener('input',e=>{const k=e.target.dataset?.soundVolume;if(!k)return;const v=Number(e.target.value)/100;e.target.nextElementSibling.textContent=e.target.value;set({[k]:v,muted:false});const m=popover.querySelector('[data-sound-mute]');if(m){m.classList.remove('is-on');m.setAttribute('aria-pressed','false');}});
      popover.addEventListener('change',e=>{if(e.target.dataset?.soundVolume==='sfx')play('confirm');});
      popover.addEventListener('click',e=>{if(e.target.closest('[data-sound-mute]')){set({muted:!prefs.muted});if(!prefs.muted)unlock();paintPopover();}});}
    const on=show??popover.hidden;popover.hidden=!on;popover.setAttribute('aria-label',w('声音','Sound'));if(on){paintPopover();place();}paintButton();}
  function mountButton(){
    if(button&&doc.contains(button))return;const tools=doc.querySelector('.yr-tools');if(!tools)return;
    button=doc.createElement('button');button.type='button';button.className='yr-icon-button yr-sound-button';button.dataset.soundOff='';button.setAttribute('aria-haspopup','dialog');
    tools.insertBefore(button,tools.querySelector('[data-year-action="language"]'));button.addEventListener('click',()=>{unlock();toggle();});paintButton();
  }
  doc.addEventListener('click',e=>{if(!popover||popover.hidden)return;const path=e.composedPath?.()||[e.target];if(!path.includes(popover)&&!path.includes(button))toggle(false);});
  doc.addEventListener('keydown',e=>{if(e.key==='Escape'&&popover&&!popover.hidden){toggle(false);button?.focus();}});
  root.addEventListener?.('resize',place);root.addEventListener?.('localechange',paintButton);
  if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',mountButton);else mountButton();
  root.setInterval(mountButton,1000);

  // Renders a piece of music, or a list of effects, offline — used to check levels without playing aloud.
  async function render(what,seconds=12){
    const OAC=root.OfflineAudioContext||root.webkitOfflineAudioContext;if(!OAC)return null;
    const saved={ctx,out,musicBus,sfxBus,verb,verbIn,noise};
    try{ctx=new OAC(2,Math.round(44100*seconds),44100);wire();
      if(typeof what==='string'){const sc=makeScene(what);for(let n=0,t=.05;t<seconds-2.5;n++,t+=sc.stepDur)playStep(sc,n,t);}
      else for(const [t,name,arg] of what)FX[name]?.(t,arg);
      return await ctx.startRendering();}
    finally{({ctx,out,musicBus,sfxBus,verb,verbIn,noise}=saved);}
  }
  root.CM_SOUND={play,render,scene:name=>setScene(name),current:()=>sceneName||wanted,prefs:()=>({...prefs}),set,unlocked:()=>unlocked,running:()=>ctx?.state==='running',
    scenes:()=>Object.keys(SCENES),effects:()=>Object.keys(FX),played:()=>played.slice(),_seed(fn){rnd=fn;}};
})(typeof window!=='undefined'?window:globalThis);
