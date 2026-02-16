
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
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  
  const [lobes, setLobes] = useState<BrainLobe[]>([
    { id: 'ALPHA', name: 'LOGIC_CORE', load: 0, activity: 'DORMANT' },
    { id: 'BETA', name: 'MEMORY_SYNC', load: 0, activity: 'DORMANT' },
    { id: 'GAMMA', name: 'SYSTEM_ROOT', load: 0, activity: 'DORMANT' },
    { id: 'DELTA', name: 'DEEP_SYNTH', load: 0, activity: 'DORMANT' }
  ]);

  const [memory, setMemory] = useState<SynapticMemory[]>(() => {
    const saved = localStorage.getItem('aladdin_synaptic_memory');
    try {
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
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
    }, ...prev].slice(0, 30));
  }, []);

  const pulseLobes = (activeLobeId: string, load: number, activity: string) => {
    setLobes(prev => prev.map(l => 
      l.id === activeLobeId 
        ? { ...l, load, activity } 
        : { ...l, load: Math.max(5, l.load - 2), activity: l.load < 10 ? 'IDLE' : l.activity }
    ));
  };

  useEffect(() => {
    localStorage.setItem('aladdin_synaptic_memory', JSON.stringify(memory));
  }, [memory]);

  const handleToolCalls = async (calls: any[] = [], session: any) => {
    for (const fc of calls) {
      if (!fc) continue;
      addLog(`NEURAL_COMMAND: ${fc.name}`, 'action');
      
      try {
        if (fc.name === 'control_system') {
          pulseLobes('GAMMA', 98, `EXECUTING: ${fc.args?.command}`);
          addLog(`HARDWARE_TARGET: ${fc.args?.target} // CMD: ${fc.args?.command}`, 'action');
          await session.sendToolResponse({ 
            functionResponses: [{ id: fc.id, name: fc.name, response: { result: "COMMAND_EXECUTED_SUCCESSFULLY" } }] 
          });
        } else if (fc.name === 'manage_memory') {
          pulseLobes('BETA', 85, `SYNCING_MEMORY: ${fc.args?.key}`);
          if (fc.args?.operation === 'STORE') {
            const newMem: SynapticMemory = { 
              key: fc.args.key, 
              content: fc.args.content, 
              timestamp: new Date().toISOString(), 
              importance: 1.0 
            };
            setMemory(prev => [newMem, ...prev].slice(0, 50));
            addLog(`SYNAPSE_ENCRYPTED: ${fc.args.key}`, 'memory');
            await session.sendToolResponse({ functionResponses: [{ id: fc.id, name: fc.name, response: { result: "NEURAL_COMMIT_SUCCESS" } }] });
          } else {
            const recall = memory.find(m => m.key === fc.args?.key)?.content || "NO_MATCHING_SYNAPSE_FOUND";
            await session.sendToolResponse({ functionResponses: [{ id: fc.id, name: fc.name, response: { result: recall } }] });
          }
        } else if (fc.name === 'global_intel_scrape') {
          pulseLobes('DELTA', 95, `SCRAPING: ${fc.args?.sector}`);
          addLog(`INTEL_ACQUIRED: ${fc.args?.sector}`, 'neural');
          await session.sendToolResponse({ functionResponses: [{ id: fc.id, name: fc.name, response: { result: "SECTOR_ANALYSIS_COMPLETE" } }] });
        }
      } catch (err) {
        console.error("Tool execution failed:", err);
        addLog(`TOOL_FAILURE: ${fc.name}`, "error");
      }
    }
  };

  const startSovereignLink = async () => {
    setErrorDetails(null);
    try {
      addLog("INITIATING ALADDIN SOVEREIGN PROTOCOLS...", "neural");
      const apiKey = process.env.API_KEY;
      
      if (!apiKey || apiKey === "undefined" || apiKey.length < 10) {
        const err = "CRITICAL: API_KEY_NOT_FOUND. ENSURE 'API_KEY' IS SET IN VERCEL ENVIRONMENT.";
        addLog(err, "error");
        setErrorDetails("Configuration Error: API Key Missing");
        return;
      }
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        addLog("CRITICAL: MEDIA_DEVICE_ERROR", "error");
        setErrorDetails("Browser Compatibility Error: Mic Access Unavailable");
        return;
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        addLog("MIC_BRIDGE: ACTIVE", "success");
      } catch (mediaError: any) {
        addLog("PERMISSION_DENIED: MICROPHONE_ACCESS_REQUIRED", "error");
        setErrorDetails("Access Denied: Please enable Microphone");
        return;
      }

      const ai = new GoogleGenAI({ apiKey });
      const AudioCtx = (window.AudioContext || (window as any).webkitAudioContext);
      outAudioContextRef.current = new AudioCtx({ sampleRate: 24000 });
      const outGain = outAudioContextRef.current.createGain();
      outGain.connect(outAudioContextRef.current.destination);

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setIsAwake(true);
            setStatus(AppStatus.LISTENING);
            addLog("ALADDIN_CORE: ONLINE", "success");
            
            const audioCtx = new AudioCtx({ sampleRate: 16000 });
            const source = audioCtx.createMediaStreamSource(stream);
            const scriptProcessor = audioCtx.createScriptProcessor(1024, 1, 1);
            
            sessionPromise.then(activeSession => {
              scriptProcessor.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                const pcm = floatToPcm(inputData);
                activeSession.sendRealtimeInput({ media: { data: encode(pcm), mimeType: 'audio/pcm;rate=16000' } });
              };
              activeSession.sendRealtimeInput({ text: `ALADDIN is online. All neural lobes at 100% stability. Master, I am standing by for your command.` });
            });
            source.connect(scriptProcessor);
            scriptProcessor.connect(audioCtx.destination);
          },
          onmessage: async (msg) => {
            const base64Audio = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              setStatus(AppStatus.SPEAKING);
              pulseLobes('ALPHA', 65 + Math.random() * 25, 'TRANSMITTING');
              try {
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
              } catch (err) {
                console.error("Audio decoding failed", err);
              }
            }

            if (msg.toolCall?.functionCalls) {
              const session = await sessionPromise;
              handleToolCalls(msg.toolCall.functionCalls ?? [], session);
            }

            if (msg.serverContent?.interrupted) {
              activeSourcesRef.current.forEach(s => { try { s.stop(); } catch(e){} });
              activeSourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              setStatus(AppStatus.LISTENING);
              addLog("TRANSMISSION_CLEARED", "warning");
            }
          },
          onerror: (e) => { 
            console.error("Neural Link Error:", e);
            addLog("BRIDGE_STABILITY_FAILURE", "error"); 
            setStatus(AppStatus.ERROR); 
          },
          onclose: () => { 
            setIsAwake(false); 
            setStatus(AppStatus.IDLE); 
            addLog("SYSTEM_BRIDGE_TERMINATED", "info");
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          tools: [{ functionDeclarations: SOVEREIGN_TOOLS ?? [] }, { googleSearch: {} }],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } },
          systemInstruction: getSystemPrompt(DEFAULT_PROFILE)
        }
      });
      sessionPromiseRef.current = sessionPromise;
    } catch (e: any) {
      addLog(`FATAL_ERROR: ${e.message}`, "error");
      setStatus(AppStatus.ERROR);
      setErrorDetails("Fatal Startup Error: Check Connection");
    }
  };

  return (
    <div className="h-screen w-full relative flex flex-col bg-[#000108] overflow-hidden font-mono text-cyan-400">
      <div className="scanline z-30 pointer-events-none opacity-30" />
      <div className="hologram-grid absolute inset-0 opacity-10 pointer-events-none" />

      {!isAwake ? (
        <div className="flex-1 flex flex-col items-center justify-center z-50 p-6 animate-in fade-in duration-1000">
          <div className="mb-16 text-center">
            <h1 className="text-5xl font-black tracking-[0.6em] text-white hud-glow uppercase mb-2">Aladdin</h1>
            <div className="h-px w-32 bg-cyan-500/30 mx-auto" />
            <p className="text-[10px] opacity-40 tracking-[0.4em] mt-4 uppercase">Sovereign Intelligence Core v3.1</p>
          </div>

          <button onClick={startSovereignLink} className="group relative flex items-center justify-center focus:outline-none">
            <div className="absolute w-[450px] h-[450px] bg-cyan-500/5 rounded-full blur-[100px] animate-pulse" />
            <div className="relative w-52 h-52 md:w-64 md:h-64 border border-cyan-500/20 rounded-full flex items-center justify-center shadow-[0_0_120px_rgba(6,182,212,0.15)] hover:scale-110 transition-all duration-1000 bg-black/50 cursor-pointer group-active:scale-95">
                <div className="absolute inset-0 rounded-full border border-cyan-400/0 group-hover:border-cyan-400/40 transition-all duration-700 animate-spin-slow" />
                <span className="text-2xl font-black tracking-[0.5em] text-white relative z-10 transition-all group-hover:tracking-[0.8em]">AWAKEN</span>
            </div>
          </button>

          {errorDetails && (
            <div className="mt-12 p-4 border border-red-500/30 bg-red-950/20 rounded-lg text-center max-w-lg backdrop-blur-xl animate-bounce">
                <p className="text-red-400 text-xs font-black uppercase tracking-widest">{errorDetails}</p>
                <p className="text-[9px] opacity-50 mt-2">Check Vercel environment variables or browser permissions.</p>
            </div>
          )}

          <div className="mt-20 grid grid-cols-3 gap-12 opacity-30 text-[9px] tracking-[0.3em] uppercase">
            <div className="text-center">SEC: AES_256</div>
            <div className="text-center">LINK: NEURAL</div>
            <div className="text-center">STAT: STANDBY</div>
          </div>
        </div>
      ) : (
        <main className="flex-1 grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-6 p-4 md:p-8 overflow-hidden relative animate-in zoom-in-95 duration-700">
          
          <aside className="hidden md:flex md:col-span-1 flex-col gap-6">
            <HUDModule title="NEURAL_ARCHITECTURE">
                <div className="space-y-5">
                    {lobes.map(lobe => (
                        <div key={lobe.id} className="p-3 border border-cyan-500/10 bg-cyan-950/5 rounded-lg group transition-all hover:bg-cyan-900/10">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-[10px] font-black text-white">{lobe.name}</span>
                                <span className="text-[8px] text-cyan-400 font-bold">{lobe.load}%</span>
                            </div>
                            <div className="h-1 bg-cyan-950 rounded-full overflow-hidden">
                                <div className="h-full bg-cyan-400 transition-all duration-1000 ease-out" style={{ width: `${lobe.load}%` }} />
                            </div>
                            <p className="text-[7px] mt-2 opacity-40 uppercase tracking-widest truncate">{lobe.activity}</p>
                        </div>
                    ))}
                </div>
            </HUDModule>
            <HUDModule title="SYSTEM_TELEMETRY">
                <div className="text-[9px] space-y-3 opacity-60 font-bold">
                    <div className="flex justify-between"><span>CORE_LATENCY:</span><span className="text-emerald-400">0.02ms</span></div>
                    <div className="flex justify-between"><span>UPTIME_STAT:</span><span className="text-emerald-400">100.0%</span></div>
                    <div className="flex justify-between"><span>NODE_AUTH:</span><span className="text-emerald-400">SOVEREIGN</span></div>
                </div>
            </HUDModule>
          </aside>

          <section className="col-span-1 md:col-span-2 lg:col-span-3 flex flex-col items-center justify-center relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
            <Orb status={status} intensity={status === AppStatus.SPEAKING ? 0.95 + Math.random() * 0.05 : 0} />
            <div className="mt-12 text-center space-y-4 z-10">
                <p className="text-2xl md:text-4xl font-black tracking-[1.5em] text-white hud-glow uppercase">ALADDIN</p>
                <div className="flex justify-center items-center gap-6 text-[10px] opacity-40 uppercase tracking-[0.4em] font-black">
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${status === AppStatus.SPEAKING ? 'bg-emerald-400 animate-pulse' : 'bg-cyan-400 opacity-50'}`} />
                        <span>{status}</span>
                    </div>
                    <span>|</span>
                    <span className="text-white/60">AUTONOMY_MAX</span>
                </div>
            </div>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[80%] h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
          </section>

          <aside className="col-span-1 md:col-span-1 flex flex-col gap-6 overflow-hidden">
            <HUDModule title="NEURAL_DATABASE" className="flex-1 overflow-hidden">
                <div className="h-full overflow-y-auto space-y-4 scrollbar-thin pr-3">
                    {memory.length > 0 ? memory.map((m, i) => (
                        <div key={i} className="p-3 border border-cyan-500/10 bg-black/60 rounded-lg hover:border-cyan-400/50 transition-all group/mem">
                            <span className="text-[8px] font-black text-cyan-400 block uppercase tracking-widest mb-1 group-hover/mem:text-white transition-colors">{m.key}</span>
                            <p className="text-[10px] text-white/70 line-clamp-3 leading-relaxed">{m.content}</p>
                        </div>
                    )) : <p className="text-[10px] opacity-30 italic text-center py-8">No neural traces detected...</p>}
                </div>
            </HUDModule>
            <HUDModule title="EVENT_PROTOCOLS" className="h-56 overflow-hidden">
                <div className="h-full overflow-y-auto flex flex-col-reverse gap-3 text-[9px] scrollbar-thin font-bold pr-2">
                    {logs.map(log => (
                        <div key={log.id} className={`p-2 border-l-2 ${
                            log.type === 'action' ? 'border-red-500 bg-red-500/5' : 
                            log.type === 'success' ? 'border-emerald-500 bg-emerald-500/5' :
                            'border-cyan-500 bg-cyan-500/5'
                        } rounded-r-md transition-all hover:bg-white/5`}>
                            <div className="flex justify-between opacity-40 text-[7px] mb-1">
                                <span>{log.type.toUpperCase()}</span>
                                <span>{log.time}</span>
                            </div>
                            <span className="tracking-wider">{log.message}</span>
                        </div>
                    ))}
                </div>
            </HUDModule>
          </aside>
        </main>
      )}

      <footer className="p-4 border-t border-cyan-500/10 flex flex-col md:flex-row justify-between items-center text-[9px] md:text-[11px] font-black uppercase tracking-[0.8em] px-6 md:px-20 bg-black/95 z-50">
          <div className="flex items-center gap-6">
            <span className="text-cyan-400">ALADDIN_CORE v3.1</span>
            <span className="text-white/10">|</span>
            <span className="text-emerald-400 animate-pulse">BRIDGE_SECURE</span>
          </div>
          <div className="flex gap-8 md:gap-24 mt-4 md:mt-0 text-[10px]">
              <div className="flex gap-3 items-center">
                <span className="opacity-30">CPU:</span>
                <span className="text-white">{lobes.reduce((acc, l) => acc + l.load, 0) / 4}%</span>
              </div>
              <div className="flex gap-3 items-center">
                <span className="opacity-30">LINK:</span>
                <span className={status === AppStatus.IDLE ? 'text-white/20' : 'text-emerald-400'}>{status === AppStatus.IDLE ? 'CLOSED' : 'NEURAL_ACTIVE'}</span>
              </div>
          </div>
      </footer>
    </div>
  );
};

export default App;
