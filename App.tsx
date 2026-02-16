
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { AppStatus, CognitiveProfile } from './types';
import { getSystemPrompt, DEFAULT_PROFILE, SOVEREIGN_TOOLS } from './constants';
import Orb from './components/Orb';
import { encode, decode, decodeAudioData, floatToPcm } from './services/audioUtils';

const RECONNECT_DELAY = 1000;
const AUDIO_SAMPLE_RATE_INPUT = 16000;
const AUDIO_SAMPLE_RATE_OUTPUT = 24000;

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [isAwake, setIsAwake] = useState(false);
  const [intensity, setIntensity] = useState(0);
  const [inputIntensity, setInputIntensity] = useState(0);
  const [telemetry, setTelemetry] = useState<string[]>([]);
  const [hasInteracted, setHasInteracted] = useState(false);
  
  const outAudioContextRef = useRef<AudioContext | null>(null);
  const inAudioContextRef = useRef<AudioContext | null>(null);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);
  const sessionRef = useRef<any>(null);
  const isConnectingRef = useRef(false);

  const pushTelemetry = useCallback((msg: string) => {
    setTelemetry(prev => [msg.toUpperCase(), ...prev].slice(0, 5));
  }, []);

  const stopAllAudio = () => {
    activeSourcesRef.current.forEach(source => {
      try { source.stop(); } catch (e) {}
    });
    activeSourcesRef.current.clear();
    nextStartTimeRef.current = 0;
    setIntensity(0);
  };

  const handleToolCalls = async (calls: any[] = [], session: any) => {
    for (const fc of calls) {
      if (!fc) continue;
      pushTelemetry(`CMD: ${fc.name}`);
      try {
        let result: any = { status: "SUCCESS" };
        
        if (fc.name === 'device_app_control') {
          pushTelemetry(`OPENING: ${fc.args.app_name}`);
          result.detail = `${fc.args.app_name} LAUNCHED`;
        }
        else if (fc.name === 'device_comms_call') {
          if (!fc.args.sim_slot) {
            pushTelemetry(`WAITING: SIM_SLOT`);
            result = { status: "ERROR", message: "SIM_SLOT_REQUIRED. Please ask the user to choose SIM 1 or SIM 2." };
          } else {
            pushTelemetry(`CALLING: ${fc.args.recipient} (SIM ${fc.args.sim_slot})`);
            result.detail = `CALLING ${fc.args.recipient}`;
          }
        }
        else if (fc.name === 'device_comms_message') {
          pushTelemetry(`${fc.args.platform}: ${fc.args.recipient}`);
          result.detail = "MESSAGE_SENT";
        }

        await session.sendToolResponse({ 
          functionResponses: [{ id: fc.id, name: fc.name, response: { result } }] 
        });
        
        if (status !== AppStatus.SPEAKING) setStatus(AppStatus.LISTENING);
      } catch (err) {
        pushTelemetry(`CORE ERROR`);
      }
    }
  };

  const startMUSA = async () => {
    if (isConnectingRef.current) return;
    isConnectingRef.current = true;
    
    try {
      const apiKey = process.env.API_KEY;
      if (!apiKey) throw new Error("API_KEY_MISSING");

      const ai = new GoogleGenAI({ apiKey });
      
      if (!outAudioContextRef.current) {
        const AudioCtx = (window.AudioContext || (window as any).webkitAudioContext);
        outAudioContextRef.current = new AudioCtx({ sampleRate: AUDIO_SAMPLE_RATE_OUTPUT });
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
            
            if (!inAudioContextRef.current) {
              const AudioCtx = (window.AudioContext || (window as any).webkitAudioContext);
              inAudioContextRef.current = new AudioCtx({ sampleRate: AUDIO_SAMPLE_RATE_INPUT });
            }
            const source = inAudioContextRef.current.createMediaStreamSource(micStream);
            const scriptProcessor = inAudioContextRef.current.createScriptProcessor(4096, 1, 1);
            
            sessionPromise.then(s => {
              sessionRef.current = s;
              scriptProcessor.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                let sum = 0;
                for (let i = 0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
                setInputIntensity(Math.min(1, Math.sqrt(sum / inputData.length) * 6));

                if (s) {
                  s.sendRealtimeInput({ 
                    media: { data: encode(floatToPcm(inputData)), mimeType: 'audio/pcm;rate=16000' } 
                  });
                }
              };
              s.sendRealtimeInput({ text: "Musa core active, Sir. Ready to execute." });
            });
            source.connect(scriptProcessor);
            scriptProcessor.connect(inAudioContextRef.current.destination);
          },
          onmessage: async (msg) => {
            const base64Audio = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              setStatus(AppStatus.SPEAKING);
              const buffer = await decodeAudioData(decode(base64Audio), outAudioContextRef.current!, AUDIO_SAMPLE_RATE_OUTPUT, 1);
              const source = outAudioContextRef.current!.createBufferSource();
              source.buffer = buffer;
              source.connect(outGain);
              
              const now = outAudioContextRef.current!.currentTime;
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
            }
            if (msg.toolCall?.functionCalls) handleToolCalls(msg.toolCall.functionCalls, sessionRef.current);
            if (msg.serverContent?.interrupted) {
              stopAllAudio();
              pushTelemetry("INTERRUPT");
            }
          },
          onerror: () => handleReconnect(),
          onclose: () => handleReconnect()
        },
        config: {
          responseModalities: [Modality.AUDIO],
          tools: [{ functionDeclarations: SOVEREIGN_TOOLS }, { googleSearch: {} }],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } } },
          systemInstruction: getSystemPrompt(DEFAULT_PROFILE)
        }
      });
    } catch (e: any) {
      handleReconnect();
    }
  };

  const handleReconnect = () => {
    isConnectingRef.current = false;
    setIsAwake(false);
    setStatus(AppStatus.ERROR);
    window.setTimeout(startMUSA, RECONNECT_DELAY);
  };

  const handleInteraction = () => {
    if (!hasInteracted) {
      setHasInteracted(true);
      startMUSA();
    }
  };

  return (
    <div 
      className={`h-screen w-full flex flex-col transition-colors duration-1000 ${isAwake ? 'bg-[#030005]' : 'bg-[#020617]'} overflow-hidden relative font-mono select-none`}
      onClick={handleInteraction}
    >
      <div className={`scan-line z-50 transition-opacity duration-1000 ${isAwake ? 'opacity-20 bg-purple-500' : 'opacity-10 bg-cyan-400'}`} />
      
      <div className="absolute top-0 left-0 right-0 p-8 flex justify-between items-start z-[60] pointer-events-none">
        <div className="flex items-center gap-4">
           <div className={`w-2 h-2 rounded-full ${isAwake ? 'bg-purple-500 shadow-[0_0_10px_purple] animate-pulse' : 'bg-cyan-400 shadow-[0_0_10px_cyan]'}`} />
           <h1 className={`text-xl font-hud font-black tracking-[0.5em] transition-colors duration-1000 ${isAwake ? 'text-purple-400' : 'text-cyan-400'}`}>MUSA</h1>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center relative z-10 p-4">
        {!hasInteracted ? (
          <div className="text-center group cursor-pointer">
            <div className="w-64 h-64 rounded-full border border-cyan-500/5 flex items-center justify-center relative transition-all duration-1000 group-hover:border-cyan-400/20">
              <div className="absolute inset-[-10px] border border-cyan-400/5 rounded-full animate-[spin_60s_linear_infinite]" />
              <div className="w-24 h-24 rounded-full bg-cyan-500/5 flex items-center justify-center">
                <div className="w-6 h-6 rounded-full bg-cyan-400 shadow-[0_0_20px_#22d3ee] animate-pulse" />
              </div>
            </div>
            <h2 className="text-cyan-400 text-[10px] font-hud font-black tracking-[1.5em] uppercase mt-10 animate-pulse">INITIATE MUSA</h2>
          </div>
        ) : (
          <div className={`relative transition-all duration-1000 ${isAwake ? 'scale-110' : 'scale-100'}`}>
            <Orb status={status} intensity={intensity} inputIntensity={inputIntensity} />
          </div>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-8 flex justify-between items-end z-[60] pointer-events-none">
        <div className="space-y-1">
          {telemetry.map((t, i) => (
            <p key={i} className={`text-[8px] font-mono tracking-tighter transition-colors duration-1000 ${isAwake ? 'text-purple-500/30' : 'text-cyan-400/20'}`} style={{ opacity: 1 - (i * 0.2) }}>{t}</p>
          ))}
        </div>
      </div>

      <div className={`absolute inset-0 transition-opacity duration-2000 ${isAwake ? 'opacity-100' : 'opacity-0'} pointer-events-none bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.04)_0%,#030005_100%)]`} />
    </div>
  );
};

export default App;
