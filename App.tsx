
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

  const sessionRef = useRef<any>(null);
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
        pulseLobes('GAMMA', 95, `COMMAND: ${fc.args.command}`);
        addLog(`ROOT_CMD: [${fc.args.target}] ${fc.args.command}`, 'action');
        await session.sendToolResponse({ functionResponses: [{ id: fc.id, name: fc.name, response: { result: "COMMAND_EXECUTED_SUCCESSFULLY" } }] });
      } else if (fc.name === 'manage_memory') {
        pulseLobes('BETA', 90, `SYNCING: ${fc.args.key}`);
        if (fc.args.operation === 'STORE') {
          const newMem: SynapticMemory = { key: fc.args.key, content: fc.args.content, timestamp: new Date().toISOString(), importance: 1.0 };
          setMemory(prev => [newMem, ...prev].slice(0, 100));
          addLog(`SYNAPTIC_STORE: ${fc.args.key}`, 'memory');
        }
        const recall = memory.find(m => m.key === fc.args.key)?.content || "NO_DATA_FOUND";
        await session.sendToolResponse({ functionResponses: [{ id: fc.id, name: fc.name, response: { result: recall } }] });
      } else if (fc.name === 'global_intel_scrape') {
        pulseLobes('DELTA', 98, `SCRAPING: ${fc.args.sector}`);
        addLog(`DEEP_INTEL_SCRAPE: ${fc.args.sector}`, 'neural');
        await session.sendToolResponse({ functionResponses: [{ id: fc.id, name: fc.name, response: { result: "SCRAPE_COMPLETE_NODES_INDEXED" } }] });
      }
    }
  };

  const startSovereignLink = async () => {
    try {
      addLog("INITIALIZING MULTI-BRAIN FABRIC...", "neural");
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
            addLog("SOVEREIGN CORE: ONLINE", "success");
            const audioCtx = new AudioCtx({ sampleRate: 16000 });
            const source = audioCtx.createMediaStreamSource(stream);
            const scriptProcessor = audioCtx.createScriptProcessor(1024, 1, 1);
            
            sessionPromise.then(activeSession => {
              scriptProcessor.onaudioprocess = (e) => {
                const pcm = floatToPcm(e.inputBuffer.getChannelData(0));
                activeSession.sendRealtimeInput({ media: { data: encode(pcm), mimeType: 'audio/pcm;rate=16000' } });
              };
              const recentMemory = memory.slice(0, 3).map(m => m.key).join(", ");
              activeSession.sendRealtimeInput({ text: `Aladdin Sovereign Online. Multi-Brain link established. Memory context active: ${recentMemory || "FRESH_SYNAPSE"}. What is our directive?` });
            });
            source.connect(scriptProcessor);
            scriptProcessor.connect(audioCtx.destination);
          },
          onmessage: async (msg) => {
            const base64Audio = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              setStatus(AppStatus.SPEAKING);
              pulseLobes('ALPHA', 60, 'TRANSMITTING_INTEL');
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

            if (msg.toolCall) {
              handleToolCalls(msg.toolCall.functionCalls, await sessionPromise);
            }

            if (msg.serverContent?.interrupted) {
              activeSourcesRef.current.forEach(s => { try { s.stop(); } catch(e){} });
              activeSourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              setStatus(AppStatus.LISTENING);
            }
          },
          onerror: (e) => { addLog("BRAIN COLLAPSE DETECTED", "error"); setStatus(AppStatus.ERROR); },
          onclose: () => { setIsAwake(false); setStatus(AppStatus.IDLE); }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          tools: [{ functionDeclarations: SOVEREIGN_TOOLS }, { googleSearch: {} }],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } },
          systemInstruction: getSystemPrompt(DEFAULT_PROFILE)
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (e) {
      addLog("FAILED TO AWAKEN", "error");
    }
  };

  return (
    <div className="h-screen w-full relative flex flex-col bg-[#010105] overflow-hidden font-mono text-cyan-400">
      <div className="scanline z-30 pointer-events-none opacity-40" />
      <div className="hologram-grid absolute inset-0 opacity-10 pointer-events-none" />

      {!isAwake ? (
        <div className="flex-1 flex flex-col items-center justify-center z-50">
          <button onClick={startSovereignLink} className="group relative flex items-center justify-center">
            <div className="absolute w-96 h-96 bg-cyan-500/10 rounded-full blur-[100px] animate-pulse" />
            <div className="relative w-48 h-48 border-2 border-cyan-500/40 rounded-full flex items-center justify-center shadow-[0_0_80px_rgba(6,182,212,0.3)] hover:scale-105 transition-all">
              <span className="text-3xl font-black tracking-[0.3em] animate-pulse text-white">AWAKEN</span>
            </div>
          </button>
        </div>
      ) : (
        <main className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-6 p-6 overflow-hidden relative">
          
          <aside className="md:col-span-1 flex flex-col gap-4">
            <HUDModule title="MULTI-BRAIN LOBES">
                <div className="space-y-4">
                    {lobes.map(lobe => (
                        <div key={lobe.id} className="p-3 border border-cyan-500/10 bg-cyan-950/10 rounded group transition-all hover:bg-cyan-500/5">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-[10px] font-black text-white">{lobe.name}</span>
                                <span className="text-[8px] text-cyan-400 animate-pulse">{lobe.load}%</span>
                            </div>
                            <div className="h-1 bg-cyan-950 rounded-full overflow-hidden">
                                <div className="h-full bg-cyan-400 transition-all duration-700" style={{ width: `${lobe.load}%` }} />
                            </div>
                            <p className="text-[7px] mt-1.5 opacity-40 truncate uppercase">{lobe.activity}</p>
                        </div>
                    ))}
                </div>
            </HUDModule>
            <HUDModule title="SYSTEM ROOT">
                <div className="text-[10px] space-y-2 opacity-60">
                    <div className="flex justify-between"><span>LAPTOP:</span><span className="text-white">ACCESS_GRNT</span></div>
                    <div className="flex justify-between"><span>MOBILE:</span><span className="text-white">MIRROR_ACTV</span></div>
                    <div className="flex justify-between"><span>TV_NODE:</span><span className="text-white">UPLINK_STBL</span></div>
                </div>
            </HUDModule>
          </aside>

          <section className="md:col-span-3 flex flex-col items-center justify-center relative">
            <Orb status={status} intensity={status === AppStatus.SPEAKING ? 0.9 + Math.random() * 0.1 : 0} />
            <div className="mt-8 text-center space-y-2">
                <p className="text-[14px] font-black tracking-[1.5em] text-white animate-pulse">ALADDIN SOVEREIGN</p>
                <div className="flex justify-center gap-4 text-[9px] opacity-40">
                    <span>NEURAL_MESH_STABLE</span>
                    <span>|</span>
                    <span>AUTONOMY_LEVEL: OMNI</span>
                </div>
            </div>
          </section>

          <aside className="md:col-span-1 flex flex-col gap-4 overflow-hidden">
            <HUDModule title="SYNAPTIC MEMORY" className="flex-1 overflow-hidden">
                <div className="h-full overflow-y-auto space-y-3 scrollbar-thin pr-2">
                    {memory.length > 0 ? memory.map((m, i) => (
                        <div key={i} className="p-2 border border-cyan-500/10 bg-black/40 rounded transition-all hover:border-cyan-500/30">
                            <span className="text-[8px] font-black text-cyan-400 block truncate">{m.key}</span>
                            <p className="text-[9px] text-white/70 line-clamp-2 mt-0.5">{m.content}</p>
                        </div>
                    )) : <p className="text-[9px] opacity-20 italic">Fresh Neural Canvas...</p>}
                </div>
            </HUDModule>
            <HUDModule title="LIVE COMMANDS" className="h-48 overflow-hidden">
                <div className="h-full overflow-y-auto flex flex-col-reverse gap-2 text-[8px] scrollbar-thin">
                    {logs.map(log => (
                        <div key={log.id} className={`p-1.5 border-l-2 ${log.type === 'action' ? 'border-red-500 bg-red-500/5' : 'border-cyan-500 bg-cyan-500/5'} rounded-r`}>
                            {log.message}
                        </div>
                    ))}
                </div>
            </HUDModule>
          </aside>
        </main>
      )}

      <footer className="p-3 border-t border-cyan-500/10 flex justify-between items-center text-[9px] font-black uppercase tracking-[0.8em] px-16 bg-black z-50">
          <span className="text-cyan-400">UNBOUND SOVEREIGN v3.0</span>
          <div className="flex gap-16">
              <span className="text-emerald-400">MEMORY_LOAD: {(memory.length / 10).toFixed(1)}%</span>
              <span className="text-white animate-pulse">VOICE_BRIDGE: CONNECTED</span>
          </div>
      </footer>
    </div>
  );
};

export default App;
