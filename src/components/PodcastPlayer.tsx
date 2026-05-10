import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, Volume2, X } from 'lucide-react';

interface PodcastPlayerProps {
  onClose: () => void;
}

export const PodcastPlayer: React.FC<PodcastPlayerProps> = ({ onClose }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const totalTime = 150; // 2:30
  const [volume, setVolume] = useState(0.7);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const intervalsRef = useRef<NodeJS.Timeout[]>([]);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const initializeAudio = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      masterGainRef.current = audioContextRef.current.createGain();
      masterGainRef.current.connect(audioContextRef.current.destination);
      masterGainRef.current.gain.value = volume;
    }
  }, [volume]);

  const createTone = useCallback((frequency: number, duration: number, type: OscillatorType = 'sine', fadeIn = 0.1, fadeOut = 0.1) => {
    if (!audioContextRef.current || !masterGainRef.current) return;
    
    const oscillator = audioContextRef.current.createOscillator();
    const gainNode = audioContextRef.current.createGain();
    
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, audioContextRef.current.currentTime);
    
    gainNode.gain.setValueAtTime(0, audioContextRef.current.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, audioContextRef.current.currentTime + fadeIn);
    gainNode.gain.linearRampToValueAtTime(0, audioContextRef.current.currentTime + duration - fadeOut);
    
    oscillator.connect(gainNode);
    gainNode.connect(masterGainRef.current);
    
    oscillator.start(audioContextRef.current.currentTime);
    oscillator.stop(audioContextRef.current.currentTime + duration);
  }, []);

  const createNoise = useCallback((duration: number) => {
    if (!audioContextRef.current || !masterGainRef.current) return;
    
    const bufferSize = audioContextRef.current.sampleRate * duration;
    const buffer = audioContextRef.current.createBuffer(1, bufferSize, audioContextRef.current.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const source = audioContextRef.current.createBufferSource();
    const gainNode = audioContextRef.current.createGain();
    const filter = audioContextRef.current.createBiquadFilter();
    
    source.buffer = buffer;
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(200, audioContextRef.current.currentTime);
    
    gainNode.gain.setValueAtTime(0, audioContextRef.current.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.1, audioContextRef.current.currentTime + 0.1);
    gainNode.gain.linearRampToValueAtTime(0, audioContextRef.current.currentTime + duration - 0.1);
    
    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(masterGainRef.current);
    
    source.start(audioContextRef.current.currentTime);
  }, []);

  const playDataPulses = useCallback(() => {
    const pulseInterval = setInterval(() => {
      createTone(440 + Math.random() * 200, 0.1, 'square');
    }, 800);
    intervalsRef.current.push(pulseInterval);
  }, [createTone]);

  const playGunfire = useCallback(() => {
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        createNoise(0.05);
        createTone(100, 0.05, 'sawtooth');
      }, i * 200);
    }
  }, [createNoise, createTone]);

  const playSynthCombat = useCallback(() => {
    const synthInterval = setInterval(() => {
      createTone(80, 0.5, 'sawtooth');
      setTimeout(() => {
        const notes = [330, 370, 415, 466];
        const note = notes[Math.floor(Math.random() * notes.length)];
        createTone(note, 0.3, 'square');
      }, 100);
    }, 1000);
    intervalsRef.current.push(synthInterval);
  }, [createTone]);

  const startPlayback = useCallback(() => {
    initializeAudio();
    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume();
    }

    const timeline = [
      { time: 0, action: playDataPulses },
      { time: 2, action: playGunfire },
      { time: 8, action: () => createTone(220, 2, 'sine') },
      { time: 15, action: playSynthCombat },
      { time: 30, action: () => createTone(110, 3, 'sawtooth') },
      { time: 45, action: () => {
        for (let i = 0; i < 3; i++) {
          setTimeout(() => {
            createNoise(0.2);
            createTone(60, 0.3, 'sawtooth');
          }, i * 500);
        }
      }},
      { time: 60, action: () => createTone(165, 4, 'triangle') },
      { time: 80, action: () => {
        createNoise(10);
        createTone(55, 8, 'sawtooth');
      }},
      { time: 120, action: () => {
        createTone(130, 5, 'sawtooth');
        createTone(165, 5, 'sawtooth');
        createTone(196, 5, 'sawtooth');
      }}
    ];

    timeline.forEach(event => {
      const timeout = setTimeout(() => {
        if (isPlaying) event.action();
      }, event.time * 1000);
      intervalsRef.current.push(timeout as any);
    });

    progressIntervalRef.current = setInterval(() => {
      setCurrentTime(prev => {
        if (prev >= totalTime) {
          stopPlayback();
          return totalTime;
        }
        return prev + 0.1;
      });
    }, 100);
  }, [isPlaying, createNoise, createTone, initializeAudio, playDataPulses, playGunfire, playSynthCombat]);

  const stopPlayback = useCallback(() => {
    setIsPlaying(false);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    intervalsRef.current.forEach(clearInterval);
    intervalsRef.current = [];
  }, []);

  useEffect(() => {
    if (isPlaying) {
      startPlayback();
    } else {
      stopPlayback();
    }
  }, [isPlaying]);

  useEffect(() => {
    if (masterGainRef.current) {
      masterGainRef.current.gain.value = volume;
    }
  }, [volume]);

  useEffect(() => {
    return () => {
      stopPlayback();
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, [stopPlayback]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-4xl bg-[#0a0a0a] border-2 border-emerald-500 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(16,185,129,0.2)] flex flex-col max-h-[90vh]"
      >
        <div className="p-4 border-b border-emerald-500/20 flex justify-between items-center">
          <div className="flex flex-col">
            <h2 className="text-emerald-500 font-display font-black tracking-tighter text-xl">RISE OF OISTARIAN</h2>
            <p className="text-emerald-500/50 text-[10px] uppercase tracking-[0.2em]">Podcast Archive // Tactical Legends</p>
          </div>
          <button onClick={onClose} className="text-emerald-500 p-2 hover:bg-emerald-500/10 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
          {/* Player UI */}
          <div className="bg-black/40 border border-emerald-500/30 rounded-2xl p-8 relative overflow-hidden group">
            <div className="absolute inset-0 bg-conic-gradient(from 0deg, transparent, rgba(16,185,129,0.1), transparent) animate-spin duration-10000 pointer-events-none" />
            
            <div className="relative z-10 flex flex-col items-center">
              <button 
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-20 h-20 rounded-full bg-emerald-500 flex items-center justify-center text-black shadow-[0_0_20px_rgba(16,185,129,0.5)] hover:scale-110 transition-transform active:scale-95"
              >
                {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
              </button>

              <div className="w-full mt-8 space-y-2">
                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden relative">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-red-500 transition-all duration-100 border-r-2 border-white shadow-[0_0_10px_#10b981]" 
                    style={{ width: `${(currentTime / totalTime) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-emerald-500 font-mono">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(totalTime)}</span>
                </div>
              </div>

              <div className="mt-6 flex items-center gap-4">
                <Volume2 size={16} className="text-emerald-500" />
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.01" 
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-32 accent-emerald-500 h-1 bg-white/10 rounded-full appearance-none appearance-none-none"
                />
              </div>
            </div>
          </div>

          {/* Script Section */}
          <div className="space-y-6">
            <h3 className="text-emerald-500 font-display font-black text-lg border-b border-emerald-500/20 pb-2">PODCAST SCRIPT</h3>
            
            <div className="space-y-6 text-sm leading-relaxed">
              <div className="text-emerald-500/40 italic text-xs animate-pulse">
                [Sound of distant data pulses and echoes of gunfire. Ambient cyber atmosphere.]
              </div>

              <div className="border-l-2 border-emerald-500 pl-4 py-2">
                <span className="text-emerald-400 font-bold uppercase text-[10px] block mb-1">Narrator</span>
                <p className="text-emerald-100/90 italic">"In a world coded in silence... one whisper rewrites the algorithm."</p>
              </div>

              <div className="text-emerald-500/40 italic text-xs">
                [Flash cuts: a shattered memory crystal. A cloaked figure sprinting across Echo Swamp. Neon eyes flicker in the dark.]
              </div>

              <div className="border-l-2 border-emerald-500 pl-4 py-2">
                <span className="text-emerald-400 font-bold uppercase text-[10px] block mb-1">Zoe (Glitching)</span>
                <p className="text-emerald-100/90 italic">"They said you were erased, but legends don't vanish. They reload."</p>
              </div>

              <div className="text-emerald-500/40 italic text-xs">
                [Cue synth-heavy combat sequence. OISTARIAN locks in the NeuroPulse Arm. Drones dive, explosions bloom.]
              </div>

              <div className="border-l-2 border-emerald-400 pl-4 py-2">
                <span className="text-emerald-400 font-bold uppercase text-[10px] block mb-1">Narrator</span>
                <p className="text-emerald-100/90 italic">"OISTARIAN—former engineer. Reluctant operative. Relentless myth."</p>
              </div>

              <div className="text-emerald-500/40 italic text-xs">
                [Fast montage: encrypted data walls exploding, a vault marked "EDEN" unlocking, flash of Zoe's hologram saying "Protect the Shard."]
              </div>

              <div className="border-l-2 border-emerald-500 pl-4 py-2">
                <span className="text-emerald-400 font-bold uppercase text-[10px] block mb-1">Narrator</span>
                <p className="text-emerald-100/90 italic">"This summer... silence is broken."</p>
              </div>

              <div className="text-red-400/80 font-black text-center text-lg mt-8 tracking-widest font-display">
                DECODE THE SHADOWS. UNLEASH THE LEGEND.
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
