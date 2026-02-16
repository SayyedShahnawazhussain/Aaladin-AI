
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { AppStatus } from './types';
import { getSystemPrompt, DEFAULT_PROFILE, SOVEREIGN_TOOLS } from './constants';
import Orb from './components/Orb';
import HUDModule from './components/HUDModule';
import { encode, decode, decodeAudioData, floatToPcm } from './services/audioUtils';

const RECONNECT_DELAY = 3000;
const AUDIO_SAMPLE_RATE_INPUT = 16000;
const AUDIO_SAMPLE_RATE_OUTPUT = 24000;

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [isAwake, setIsAwake] = useState(false);
  const [intensity, setIntensity] = useState(0);
  const [inputIntensity, setInputIntensity] = useState(0);
  const [telemetry, setTelemetry] = useState<string[]>([]);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [needsKey, setNeedsKey] = useState(false);
  
  const outAudioContextRef = useRef<AudioContext | null>(null);
  const inAudioContextRef = useRef<AudioContext | null>(null);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);
  const sessionRef = useRef<any>(null);
  const isConnectingRef = useRef(false);

  const pushTelemetry = useCallback((msg: string) => {
    setTelemetry(prev => [msg.toUpperCase(), ...prev].slice(0, 8));
  }, []);

  const stopAllAudio = () => {
    activeSourcesRef.current.forEach(source => {
      try { source.stop(); } catch (e) {}
    });
    activeSourcesRef.current.clear();
    nextStartTimeRef.current = 0;
    setIntensity(0);
  };

  const handleToolCalls = async (calls: any[] = [], sessionPromise: Promise<any>) => {
    for (const fc of calls) {
      if (!fc) continue;
      pushTelemetry(`EX_CMD: ${fc.name}`);
      try {
        let result: any = { status: "SUCCESS" };
        if (fc.name === 'device_app_control') result.detail = `${fc.args.app_name} INTERFACE ACTIVE`;
        else if (fc.name === 'device_comms_call') {
          if (!fc.args.sim_slot) result = { status: "AWAITING_SIM_SELECTION", message: "SIM_SLOT_REQUIRED" };
          else result.detail = `UPLINK TO ${fc.args.recipient} VIA SIM ${fc.args.sim_slot}`;
        }
        else if (fc.name === 'device_comms_message') result.detail = `PACKET TRANSMITTED TO ${fc.args.recipient}`;

        // Send response back to model using the resolved session
        const session = await sessionPromise;
        session.sendToolResponse({ 
          functionResponses: { 
            id: fc.id, 
            name: fc.name, 
            response: { result } 
          } 
        });
        
        if (status !== AppStatus.SPEAKING) setStatus(AppStatus.LISTENING);
      } catch (err) {
        pushTelemetry(`IO_FAILURE`);
      }
    }
  };

  const handleKeySetup = async () => {
    if (typeof window !== 'undefined' && (window as any).aistudio) {
      try {
        await (window as any).aistudio.openSelectKey();
        setNeedsKey(false);
        // Procedurally proceed as per guidelines
        startMUSA();
      } catch (e) {
        pushTelemetry("KEY_SELECT_CANCELLED");
      }
    }
  };

  const startMUSA = async () => {
    if (isConnectingRef.current) return;
    
    // Check if we have an API key available
    const hasKey = process.env.API_KEY && process.env.API_KEY !== "undefined" && process.env.API_KEY !== "";
    const isAiStudioKey = typeof window !== 'undefined' && (window as any).aistudio && await (window as any).aistudio.hasSelectedApiKey();
    
    if (!hasKey && !isAiStudioKey) {
      setNeedsKey(true);
      return;
    }

    isConnectingRef.current = true;
    setErrorMsg(null);
    setStatus(AppStatus.THINKING);
    pushTelemetry("UPLINK SECURED");
    
    try {
      // Re-initialize for every connection to ensure fresh key from dialog
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Initialize Audio Pipeline
      if (!outAudioContextRef.current) {
        outAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: AUDIO_SAMPLE_RATE_OUTPUT });
      }
      if (outAudioContextRef.current.state === 'suspended') {
        await outAudioContextRef.current.resume();
      }

      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const outGain = outAudioContextRef.current.createGain();
      outGain.connect(outAudioContextRef.current.destination);

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            isConnectingRef.current = false;
            setIsAwake(true);
            setStatus(AppStatus.LISTENING);
            pushTelemetry("MUSA ONLINE");
            
            if (!inAudioContextRef.current) {
              inAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: AUDIO_SAMPLE_RATE_INPUT });
            }
            const source = inAudioContextRef.current.createMediaStreamSource(micStream);
            const scriptProcessor = inAudioContextRef.current.createScriptProcessor(4096, 1, 1);
            
            sessionPromise.then(session => {
              sessionRef.current = session;
              scriptProcessor.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                // Simple RMS for orb visuals
                let sum = 0;
                for (let i = 0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
                setInputIntensity(Math.min(1, Math.sqrt(sum / inputData.length) * 10));

                session.sendRealtimeInput({ 
                  media: { data: encode(floatToPcm(inputData)), mimeType: 'audio/pcm;rate=16000' } 
                });
              };
              
              // Initial handshake
              session.sendRealtimeInput({ text: "Hello MUSA. Establish neural link and greet me as 'Sir'. Confirm system integrity." });
            });

            source.connect(scriptProcessor);
            scriptProcessor.connect(inAudioContextRef.current.destination);
          },
          onmessage: async (msg) => {
            // Process model audio output
            const base64Audio = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && outAudioContextRef.current) {
              setStatus(AppStatus.SPEAKING);
              try {
                const buffer = await decodeAudioData(decode(base64Audio), outAudioContextRef.current, AUDIO_SAMPLE_RATE_OUTPUT, 1);
                const source = outAudioContextRef.current.createBufferSource();
                source.buffer = buffer;
                source.connect(outGain);
                
                const now = outAudioContextRef.current.currentTime;
                const startTime = Math.max(nextStartTimeRef.current, now);
                source.start(startTime);
                nextStartTimeRef.current = startTime + buffer.duration;
                
                activeSourcesRef.current.add(source);
                source.onended = () => {
                  activeSourcesRef.current.delete(source);
                  if (activeSourcesRef.current.size === 0) {
                    setStatus(AppStatus.LISTENING);
                    setIntensity(0);
                  }
                };
                setIntensity(1.0);
              } catch (audioErr) {
                console.error("Audio decoding failed:", audioErr);
              }
            }

            // Handle tools and interruptions
            if (msg.toolCall?.functionCalls) {
              handleToolCalls(msg.toolCall.functionCalls, sessionPromise);
            }
            
            if (msg.serverContent?.interrupted) {
              stopAllAudio();
              pushTelemetry("V_INT: INTERRUPT");
            }
          },
          onerror: (e) => {
            console.error("Live Session Error:", e);
            pushTelemetry("LINK_ERROR");
            handleReconnect();
          },
          onclose: (e) => {
            console.log("Live Session Closed", e);
            pushTelemetry("LINK_DORMANT");
            handleReconnect();
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          tools: [{ functionDeclarations: SOVEREIGN_TOOLS }], 
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } } },
          systemInstruction: getSystemPrompt(DEFAULT_PROFILE)
        }
      });
    } catch (e: any) {
      console.error("MUSA Initialization Error:", e);
      if (e.message?.includes("Network error") || e.message?.includes("Requested entity was not found")) {
        setNeedsKey(true);
        pushTelemetry("RE-AUTH REQUIRED");
      } else {
        setErrorMsg(`CORE_BREACH: ${e.message}`);
      }
      handleReconnect();
    }
  };

  const handleReconnect = () => {
    isConnectingRef.current = false;
    setTimeout(() => {
      if (hasInteracted && !isAwake) startMUSA();
    }, RECONNECT_DELAY);
  };

  const handleInteraction = () => {
    if (!hasInteracted) {
      setHasInteracted(true);
      startMUSA();
    }
  };

  return (
    <div 
      className={`h-screen w-full flex flex-col transition-all duration-1000 ${isAwake ? 'bg-[#030005]' : 'bg-[#020617]'} overflow-hidden relative font-mono select-none cursor-pointer`}
      onClick={handleInteraction}
    >
      <div className="absolute inset-0 opacity-10 pointer-events-none" 
        style={{ backgroundImage: 'radial-gradient(#22d3ee 1px, transparent 0)', backgroundSize: '40px 40px' }} 
      />

      <header className="p-6 flex justify-between items-center z-20 border-b border-white/5 bg-black/20 backdrop-blur-md">
        <div className="flex flex-col">
          <h1 className="text-cyan-500 font-hud text-xl tracking-tighter">MUSA <span className="text-[10px] opacity-50 ml-2">CORE_V7.0</span></h1>
          <div className="flex gap-4 mt-1">
             <div className="text-[8px] text-cyan-500/50 uppercase tracking-[0.2em]">Neural Uplink Active</div>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-[10px] text-cyan-400 font-hud uppercase">Link Stability</span>
            <span className={`text-[10px] font-hud uppercase ${isAwake ? 'text-green-500' : 'text-yellow-500'}`}>
              {isAwake ? 'Synchronized' : 'Searching...'}
            </span>
          </div>
          {needsKey && (
            <button 
              onClick={(e) => { e.stopPropagation(); handleKeySetup(); }}
              className="px-4 py-2 bg-purple-600/20 border border-purple-500 text-purple-400 text-[10px] font-hud hover:bg-purple-600/40 transition-all uppercase tracking-widest animate-pulse"
            >
              Verify Auth Key
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center relative overflow-hidden">
        {errorMsg && (
          <div className="absolute top-10 z-30 px-6 py-2 bg-red-950/60 border border-red-500/50 text-red-400 text-[10px] font-hud">
            {errorMsg}
          </div>
        )}

        <div className="relative z-10">
           <Orb status={status} intensity={intensity} inputIntensity={inputIntensity} />
           
           {!hasInteracted && (
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
               <div className="text-cyan-400 text-[12px] font-hud uppercase tracking-[0.5em] animate-pulse">
                 Establish Link
               </div>
             </div>
           )}
        </div>

        {/* HUD Overlay Elements */}
        <div className="absolute left-10 top-1/2 -translate-y-1/2 hidden xl:flex flex-col gap-4 w-64 pointer-events-none opacity-80">
           <HUDModule title="Neural Logs">
              {telemetry.length > 0 ? telemetry.map((t, i) => (
                <div key={i} className={`mb-1 flex gap-2 ${i === 0 ? 'text-cyan-300' : ''}`}>
                  <span>{t}</span>
                </div>
              )) : "MONITORING_READY..."}
           </HUDModule>
           <HUDModule title="Environment">
              <div className="flex flex-col gap-1 text-[9px]">
                <div className="flex justify-between"><span>THERMAL</span><span>31°C</span></div>
                <div className="flex justify-between"><span>LATENCY</span><span>14ms</span></div>
              </div>
           </HUDModule>
        </div>

        <div className="absolute right-10 top-1/2 -translate-y-1/2 hidden xl:flex flex-col gap-4 w-64 pointer-events-none opacity-80">
           <HUDModule title="System Health">
              <div className="flex flex-col gap-2">
                <div className="w-full h-1 bg-cyan-950 rounded-full overflow-hidden">
                  <div className="h-full bg-cyan-500" style={{ width: isAwake ? '88%' : '5%' }} />
                </div>
                <div className="flex justify-between text-[8px] uppercase">
                  <span>Logic Core</span><span>{isAwake ? 'Optimal' : 'Cold'}</span>
                </div>
              </div>
           </HUDModule>
           <HUDModule title="Diagnostics">
              <div className="text-[8px] leading-relaxed opacity-60">
                AARCH64_QUANTUM_01<br/>
                KERNEL_LOCKED: YES<br/>
                SESSION_ID: {Math.random().toString(16).slice(2, 10).toUpperCase()}
              </div>
           </HUDModule>
        </div>
      </main>

      <footer className="p-6 flex justify-between items-end z-20">
         <div className="flex flex-col gap-1">
            <div className="text-[10px] font-hud text-cyan-500/50 uppercase tracking-[0.3em]">Quantum Encrypted</div>
         </div>
         <div className="text-[9px] font-hud text-cyan-500/30 uppercase">
           MUSA // Sovereign Intelligence // Alpha Build
         </div>
      </footer>
    </div>
  );
};

export default App;
