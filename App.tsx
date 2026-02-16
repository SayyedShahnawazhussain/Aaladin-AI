
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { AppStatus, SystemLog, BrainLobe, SynapticMemory } from './types';
import { getSystemPrompt, DEFAULT_PROFILE, SOVEREIGN_TOOLS } from './constants';
import Orb from './components/Orb';
import HUDModule from './components/HUDModule';
import { encode, decode, decodeAudioData, floatToPcm } from './services/audioUtils';

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [isAwake, setIsAwake] = useState(false);
  const [intensity, setIntensity] = useState(0);
  
  const [lobes, setLobes] = useState<BrainLobe[]>([
    { id: 'ALPHA', name: 'LOGIC_CORE', load: 0, activity: 'DORMANT' },
    { id: 'BETA', name: 'MEMORY_SYNC', load: 0, activity: 'DORMANT' },
    { id: 'GAMMA', name: 'SYSTEM_ROOT', load: 0, activity: 'DORMANT' },
    { id: 'DELTA', name: 'DEEP_SYNTH', load: 0, activity: 'DORMANT' }
  ]);

  const [memory, setMemory] = useState<SynapticMemory[]>(() => {
    const saved = localStorage.getItem('aladdin_synaptic_memory');
    return saved ? JSON.parse(saved) : [];
  });

  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const outAudioContextRef = useRef<AudioContext | null>(null);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);

  const addLog = useCallback((message: string, type: SystemLog['type'] = 'info') => {
    setLogs(prev => [{
      id: Math.random().toString(36).substr(2, 9),
      time: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      message: message.toUpperCase(),
      type
    }, ...prev].slice(0, 20));
  }, []);

  const pulseLobes = (activeLobeId: string, load: number, activity: string) => {
    setLobes(prev => prev.map(l => l.id === activeLobeId ? { ...l, load, activity } : { ...l, load: Math.max(0, l.load - 5) }));
  };

  useEffect(() => {
    localStorage.setItem('aladdin_synaptic_memory', JSON.stringify(memory));
  }, [memory]);

  const handleToolCalls = async (calls: any[], session: any) => {
    for (const fc of calls) {
      if (fc.name === 'control_system') {
        pulseLobes('GAMMA', 95, `EXEC_ROOT: ${fc.args.command}`);
        addLog(`SYS_CMD: [${fc.args.target}] ${fc.args.command}`, 'action');
        await session.sendToolResponse({ functionResponses: [{ id: fc.id, name: fc.name, response: { result: "CORE_CMD_EXECUTED" } }] });
      } else if (fc.name === 'manage_memory') {
        pulseLobes('BETA', 90, `NEURAL_SYNC: ${fc.args.key}`);
        if (fc.args.operation === 'STORE') {
          const newMem: SynapticMemory = { key: fc.args.key, content: fc.args.content, timestamp: new Date().toISOString(), importance: 1.0 };
          setMemory(prev => [newMem, ...prev].slice(0, 50));
          addLog(`MEMORY_LOCKED: ${fc.args.key}`, 'memory');
        }
        const recall = memory.find(m => m.key === fc.args.key)?.content || "NO_SYNC_FOUND";
        await session.sendToolResponse({ functionResponses: [{ id: fc.id, name: fc.name, response: { result: recall } }] });
      } else if (fc.name === 'global_intel_scrape') {
        pulseLobes('DELTA', 98, `DATA_SCRAPE: ${fc.args.sector}`);
        addLog(`DEEP_SCRAPE: ${fc.args.sector}`, 'neural');
        await session.sendToolResponse({ functionResponses: [{ id: fc.id, name: fc.name, response: { result: "SCRAPE_COMPLETE" } }] });
      }
    }
  };

  const startSovereignLink = async () => {
    try {
      addLog("AWAKENING SOVEREIGN INTELLIGENCE...", "neural");
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      outAudioContextRef.current = new AudioCtx({ sampleRate: 24000 });
      const outGain = outAudioContextRef.current.createGain();
      outGain.connect(outAudioContextRef.current.destination);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setIsAwake(true);
            setStatus(AppStatus.LISTENING);
            addLog("OMNI_CORE: LINK_ESTABLISHED", "success");
            const audioCtx = new AudioCtx({ sampleRate: 16000 });
            const source = audioCtx.createMediaStreamSource(stream);
            const scriptProcessor = audioCtx.createScriptProcessor(1024, 1, 1);
            
            sessionPromise.then(activeSession => {
              scriptProcessor.onaudioprocess = (e) => {
                const pcm = floatToPcm(e.inputBuffer.getChannelData(0));
                activeSession.sendRealtimeInput({ media: { data: encode(pcm), mimeType: 'audio/pcm;rate=16000' } });
              };
              const recentMemory = memory.slice(0, 2).map(m => m.key).join(", ");
              activeSession.sendRealtimeInput({ text: `ALADDIN ACTIVE. ALL BRAIN LOBES SYNCHRONIZED. MEMORY RECALLED: ${recentMemory || "FRESH_SYNAPSE"}. STANDING BY.` });
            });
            source.connect(scriptProcessor);
            scriptProcessor.connect(audioCtx.destination);
          },
          onmessage: async (msg) => {
            const base64Audio = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              setStatus(AppStatus.SPEAKING);
              pulseLobes('ALPHA', 70, 'TRANSMITTING');
              const buffer = await decodeAudioData(decode(base64Audio), outAudioContextRef.current!, 24000, 1);
              const source = outAudioContextRef.current!.createBufferSource();
              source.buffer = buffer;
              source.connect(outGain);
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outAudioContextRef.current!.currentTime);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              activeSourcesRef.current.add(source);
              source.onended = () => {
                activeSourcesRef.current.delete(source);
                if (activeSourcesRef.current.size === 0) setStatus(AppStatus.LISTENING);
              };
              setIntensity(1.0);
            }

            if (msg.toolCall?.functionCalls) {
              const session = await sessionPromise;
              handleToolCalls(msg.toolCall.functionCalls, session);
            }

            if (msg.serverContent?.interrupted) {
              activeSourcesRef.current.forEach(s => { try { s.stop(); } catch(e){} });
              activeSourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              setStatus(AppStatus.LISTENING);
            }
          },
          onerror: (e) => { addLog("BRAIN NODE FAILURE", "error"); setStatus(AppStatus.ERROR); },
          onclose: () => { setIsAwake(false); setStatus(AppStatus.IDLE); }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          tools: [{ functionDeclarations: SOVEREIGN_TOOLS }, { googleSearch: {} }],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } },
          systemInstruction: getSystemPrompt(DEFAULT_PROFILE)
        }
      });
      sessionPromiseRef.current = sessionPromise;
    } catch (e) {
      addLog("CORE IGNITION FAILED", "error");
    }
  };

  return (
    <div className="h-screen w-full relative flex flex-col bg-[#000108] overflow-hidden font-mono text-cyan-400">
      <div className="scanline z-30 pointer-events-none opacity-40" />
      <div className="hologram-grid absolute inset-0 opacity-10 pointer-events-none" />

      {!isAwake ? (
        <div className="flex-1 flex flex-col items-center justify-center z-50">
          <button onClick={startSovereignLink} className="group relative flex items-center justify-center">
            <div className="absolute w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-[120px] animate-pulse" />
            <div className="relative w-56 h-56 border border-cyan-500/20 rounded-full flex items-center justify-center shadow-[0_0_100px_rgba(6,182,212,0.2)] hover:scale-105 transition-all bg-black/40">
              <span className="text-3xl font-black tracking-[0.4em] animate-pulse text-white">AWAKEN</span>
            </div>
          </button>
        </div>
      ) : (
        <main className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-6 p-6 overflow-hidden relative">
          
          <aside className="md:col-span-1 flex flex-col gap-4">
            <HUDModule title="NEURAL LOBES">
                <div className="space-y-4">
                    {lobes.map(lobe => (
                        <div key={lobe.id} className="p-3 border border-cyan-500/10 bg-cyan-950/5 rounded group transition-all">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-[10px] font-black text-white">{lobe.name}</span>
                                <span className="text-[8px] text-cyan-400">{lobe.load}%</span>
                            </div>
                            <div className="h-1 bg-cyan-950 rounded-full overflow-hidden">
                                <div className="h-full bg-cyan-400 transition-all duration-700" style={{ width: `${lobe.load}%` }} />
                            </div>
                            <p className="text-[7px] mt-1.5 opacity-40 uppercase truncate">{lobe.activity}</p>
                        </div>
                    ))}
                </div>
            </HUDModule>
            <HUDModule title="HARDWARE ACCESS">
                <div className="text-[10px] space-y-2 opacity-60">
                    <div className="flex justify-between"><span>LAPTOP:</span><span className="text-emerald-400">ROOT_ACTIVE</span></div>
                    <div className="flex justify-between"><span>MOBILE:</span><span className="text-emerald-400">UNRESTRICTED</span></div>
                    <div className="flex justify-between"><span>TV_NODE:</span><span className="text-white">STANDBY</span></div>
                </div>
            </HUDModule>
          </aside>

          <section className="md:col-span-3 flex flex-col items-center justify-center relative">
            <Orb status={status} intensity={status === AppStatus.SPEAKING ? 0.9 + Math.random() * 0.1 : 0} />
            <div className="mt-8 text-center space-y-2">
                <p className="text-lg font-black tracking-[1.2em] text-white">ALADDIN</p>
                <div className="flex justify-center gap-4 text-[9px] opacity-40">
                    <span>SOVEREIGN_SYSTEM_ONLINE</span>
                    <span>|</span>
                    <span>AUTONOMY: MAX</span>
                </div>
            </div>
          </section>

          <aside className="md:col-span-1 flex flex-col gap-4 overflow-hidden">
            <HUDModule title="SYNAPTIC FEED" className="flex-1 overflow-hidden">
                <div className="h-full overflow-y-auto space-y-3 scrollbar-thin pr-2">
                    {memory.length > 0 ? memory.map((m, i) => (
                        <div key={i} className="p-2 border border-cyan-500/10 bg-black/40 rounded hover:border-cyan-500/30">
                            <span className="text-[8px] font-black text-cyan-400 block">{m.key}</span>
                            <p className="text-[9px] text-white/70 line-clamp-1 mt-0.5">{m.content}</p>
                        </div>
                    )) : <p className="text-[9px] opacity-20 italic">Awaiting Synapse...</p>}
                </div>
            </HUDModule>
            <HUDModule title="COMMAND_LOGS" className="h-48 overflow-hidden">
                <div className="h-full overflow-y-auto flex flex-col-reverse gap-2 text-[8px] scrollbar-thin">
                    {logs.map(log => (
                        <div key={log.id} className={`p-1.5 border-l-2 ${log.type === 'action' ? 'border-red-500' : 'border-cyan-500'} bg-white/5 rounded-r`}>
                            {log.message}
                        </div>
                    ))}
                </div>
            </HUDModule>
          </aside>
        </main>
      )}

      <footer className="p-3 border-t border-cyan-500/10 flex justify-between items-center text-[9px] font-black uppercase tracking-[0.8em] px-16 bg-black z-50">
          <span className="text-cyan-400">UNBOUND_MODE // SOVEREIGN v3.1</span>
          <div className="flex gap-16">
              <span className="text-emerald-400">THREAT_LEVEL: 0%</span>
              <span className="text-white animate-pulse">BRIDGE: ACTIVE</span>
          </div>
      </footer>
    </div>
  );
};

export default App;
