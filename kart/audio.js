import {TOP_SPEED} from './track.js?v=8';

const cues = {
  picked: [[610,660,0,.10,'triangle'],[865,1010,.068,.15,'square']],
  blocked: [[930,600,0,.18,'triangle']],
  slipped: [[410,105,0,.23,'sawtooth']],
  boost: [[150,610,0,.29,'triangle'],[380,1050,.04,.21,'square']],
  shield: [[525,775,0,.19,'triangle'],[790,1050,.05,.22,'sine']],
  slip: [[300,157,0,.16,'triangle'],[210,105,.08,.19,'square']],
  grip: [[280,420,0,.11,'square'],[410,745,.085,.18,'triangle']],
  pulse: [[630,155,0,.30,'triangle'],[240,80,.045,.24,'sine']],
  disc: [[505,860,0,.13,'square'],[640,330,.07,.18,'triangle']],
  chase: [[160,550,0,.36,'sawtooth'],[440,1180,.08,.29,'triangle']],
  launch: [[220,670,0,.24,'square'],[540,1210,.075,.24,'triangle']],
  recover: [[340,510,0,.17,'triangle']],
  contact: [[118,45,0,.16,'triangle'],[330,120,.01,.09,'square']],
  turbo: [[190,520,0,.22,'triangle'],[490,840,.027,.17,'square']],
};

export function createRaceAudio() {
  let context, master, engine, motorGain, scrapeGain, scrapeFilter, squeal;

  function unlock(muted) {
    if(muted) return;
    try {
      if(!context) {
        const audio=new AudioContext();
        const gain=audio.createGain();
        gain.connect(audio.destination);

        const idle=audio.createOscillator(), idleGain=audio.createGain();
        idle.type='triangle';
        idleGain.gain.value=0;
        idle.connect(idleGain).connect(gain);
        idle.start();

        const noise=audio.createBufferSource();
        noise.buffer=audio.createBuffer(1,audio.sampleRate,audio.sampleRate);
        const samples=noise.buffer.getChannelData(0);
        let seed=33459;
        for(let i=0;i<samples.length;i++) {
          seed=(Math.imul(seed,1664525)+1013904223)>>>0;
          samples[i]=seed/2147483648-1;
        }
        noise.loop=true;
        const filter=audio.createBiquadFilter(), slideGain=audio.createGain();
        filter.type='bandpass';
        filter.frequency.value=1320;
        filter.Q.value=.85;
        slideGain.gain.value=0;
        noise.connect(filter).connect(slideGain).connect(gain);
        noise.start();

        const tire=audio.createOscillator(), tireGain=audio.createGain();
        tire.type='triangle';
        tireGain.gain.value=.18;
        tire.connect(tireGain).connect(slideGain);
        tire.start();

        context=audio;
        master=gain;
        engine=idle;
        motorGain=idleGain;
        scrapeGain=slideGain;
        scrapeFilter=filter;
        squeal=tire;
      }
      context.resume().catch(()=>{});
    } catch {}
  }

  function update(player,running,muted) {
    if(!context) return;
    const now=context.currentTime;
    master.gain.setTargetAtTime(muted?0:1,now,.022);
    const ratio=Math.min(1,player.speed/TOP_SPEED);
    engine.frequency.setTargetAtTime(50+player.speed*.10,now,.055);
    motorGain.gain.setTargetAtTime(running?.009+player.speed*.00001:0,now,.045);
    const friction=running&&player.driftSide ? .08+ratio*.095 : 0;
    scrapeGain.gain.setTargetAtTime(friction,now,.035);
    if(friction>0) {
      scrapeFilter.frequency.setTargetAtTime(900+ratio*960,now,.05);
      squeal.frequency.setTargetAtTime(280+ratio*380+Math.sin(now*29)*42,now,.04);
    }
  }

  function voice(from,to,delay,duration,type,level) {
    if(!context) return;
    const now=context.currentTime+delay, oscillator=context.createOscillator(), gain=context.createGain();
    oscillator.type=type;
    oscillator.frequency.setValueAtTime(from,now);
    oscillator.frequency.exponentialRampToValueAtTime(to,now+duration);
    gain.gain.setValueAtTime(.0001,now);
    gain.gain.exponentialRampToValueAtTime(level,now+.008);
    gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
    oscillator.connect(gain).connect(master);
    oscillator.start(now);
    oscillator.stop(now+duration);
  }

  function tone(freq,duration=.13) {
    voice(freq,freq,0,duration,'square',.032);
  }

  function effect(name) {
    for(const cue of cues[name]) voice(...cue,.041);
  }

  return {unlock,update,tone,effect};
}
