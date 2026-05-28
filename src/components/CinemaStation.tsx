import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Play, Pause, Volume2, VolumeX, Maximize2, SkipForward, Film, Search, ShieldCheck } from 'lucide-react';

const SAMPLE_MOVIES = [
  {
    id: 'intro',
    title: 'The Great Convergence - Archive 01',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-top-view-of-a-cyber-city-with-neon-lights-42571-large.mp4',
    description: 'An analysis of the initial collision between dimensions.',
    duration: '0:15'
  },
  {
    id: 'mission-01',
    title: 'Operation Skyfall - Gaza Sector',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-futuristic-urban-landscape-at-night-with-flying-vehicles-42572-large.mp4',
    description: 'Tactical briefing for the first territorial recovery mission.',
    duration: '0:22'
  },
  {
    id: 'survival',
    title: 'Star System Survival - Deep Space Proto',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-flying-over-the-surface-of-a-planet-42574-large.mp4',
    description: 'A simulation of the Europa sector deep space recovery operations.',
    duration: '0:18'
  },
  {
    id: 'glitch',
    title: 'Unknown Frequency - ERROR 404',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-abstract-dark-background-with-moving-particles-and-light-42573-large.mp4',
    description: 'Recovered data from the South American jungle anomaly.',
    duration: '0:10'
  }
];

export const CinemaStation: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [currentMovie, setCurrentMovie] = useState(SAMPLE_MOVIES[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const p = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(p);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] bg-black/98 flex items-center justify-center p-4 backdrop-blur-xl"
    >
      <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(circle_at_center,#22d3ee_0%,transparent_70%)]" />
      
      <div className="w-full max-w-6xl h-[80vh] flex flex-col gap-4">
        {/* Header */}
        <div className="flex justify-between items-center px-4">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-cyan-500/20 border border-cyan-500/40 rounded-sm">
              <Film className="text-cyan-400" size={20} />
            </div>
            <div>
              <h2 className="text-cyan-400 font-display font-black text-xl tracking-[0.2em] uppercase">Cinematic Archive</h2>
              <div className="flex items-center gap-2">
                <span className="text-[8px] text-cyan-900 uppercase font-black tracking-widest">HD Visual Processing Unit</span>
                <div className="h-px w-12 bg-cyan-500/20" />
                <span className="text-[8px] text-cyan-400/60 uppercase font-black tracking-widest">Status: Ready</span>
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 border border-cyan-500/20 text-cyan-500 hover:bg-cyan-500/10 rounded-full transition-all"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 flex gap-6 overflow-hidden">
          {/* Main Player */}
          <div className="flex-1 bg-black border border-cyan-500/10 relative group overflow-hidden">
            <video 
              ref={videoRef}
              src={currentMovie.url}
              className="w-full h-full object-cover"
              onTimeUpdate={handleTimeUpdate}
              onEnded={() => setIsPlaying(false)}
            />

            {/* Controls Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="absolute bottom-0 left-0 right-0 p-6 flex flex-col gap-4">
                {/* Progress Bar */}
                <div className="h-1 bg-cyan-900/40 w-full rounded-full cursor-pointer overflow-hidden group/bar">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className="h-full bg-cyan-400 shadow-[0_0_15px_#22d3ee]"
                  />
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <button onClick={togglePlay} className="text-white hover:text-cyan-400 transition-colors">
                      {isPlaying ? <Pause size={24} /> : <Play size={24} />}
                    </button>
                    <button onClick={() => setIsMuted(!isMuted)} className="text-white hover:text-cyan-400 transition-colors">
                      {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                    </button>
                    <div className="text-[10px] text-cyan-400 font-mono tracking-widest uppercase">
                      {currentMovie.title}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Maximize2 size={20} className="text-white/40 hover:text-cyan-400 transition-colors cursor-pointer" />
                  </div>
                </div>
              </div>
            </div>

            {!isPlaying && progress === 0 && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <motion.button 
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={togglePlay}
                  className="w-20 h-20 rounded-full bg-cyan-500/20 border-2 border-cyan-400/40 flex items-center justify-center text-cyan-400 shadow-[0_0_40px_rgba(34,211,238,0.2)]"
                >
                  <Play size={40} fill="currentColor" />
                </motion.button>
              </div>
            )}
          </div>

          {/* Playlist / Details */}
          <div className="w-80 flex flex-col gap-4">
            <div className="bg-cyan-950/20 border border-cyan-500/10 p-4">
              <div className="flex items-center gap-2 mb-4">
                <Search size={14} className="text-cyan-500" />
                <span className="text-[10px] text-cyan-400 font-black uppercase tracking-widest">Mission Reels</span>
              </div>
              <div className="space-y-3">
                {SAMPLE_MOVIES.map(movie => (
                  <button
                    key={movie.id}
                    onClick={() => {
                      setCurrentMovie(movie);
                      setIsPlaying(false);
                      setProgress(0);
                    }}
                    className={`w-full p-3 border transition-all text-left ${
                      currentMovie.id === movie.id 
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-400' 
                      : 'bg-black/40 border-cyan-900/20 text-cyan-800 hover:bg-cyan-950/30'
                    }`}
                  >
                    <div className="text-[10px] font-black uppercase tracking-tighter mb-1">{movie.title}</div>
                    <div className="flex justify-between items-center text-[8px] font-bold opacity-60">
                      <span>{movie.duration}</span>
                      {currentMovie.id === movie.id && <span className="animate-pulse">PLAYING</span>}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 bg-cyan-950/10 border border-cyan-500/10 p-4">
                <div className="flex items-center gap-2 mb-4">
                    <ShieldCheck size={14} className="text-cyan-500" />
                    <span className="text-[10px] text-cyan-400 font-black uppercase tracking-widest">Metadata</span>
                </div>
                <p className="text-[10px] text-cyan-200/40 font-accent italic leading-relaxed uppercase">
                    {currentMovie.description}
                </p>
                <div className="mt-8 pt-8 border-t border-cyan-500/10 space-y-4">
                    <div className="flex flex-col gap-1">
                        <span className="text-[8px] text-cyan-900 uppercase font-bold">Bitrate</span>
                        <span className="text-[10px] text-cyan-400 font-mono">14.8 GBPS</span>
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-[8px] text-cyan-900 uppercase font-bold">Latency</span>
                        <span className="text-[10px] text-cyan-400 font-mono">0.02 MS</span>
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-[8px] text-cyan-900 uppercase font-bold">Encryption</span>
                        <span className="text-[10px] text-cyan-400 font-mono">QUANTUM-RESISTANT</span>
                    </div>
                </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
