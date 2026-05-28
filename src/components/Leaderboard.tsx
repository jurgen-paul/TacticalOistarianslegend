import { useEffect, useState, startTransition } from 'react';
import { fetchLeaderboard, auth } from '../services/firebase';
import { Play } from 'lucide-react';

interface LeaderboardRecord {
  id: string;
  name: string;
  score: number;
  legend: string;
  userId: string;
  createdAt: any;
}

export default function Leaderboard() {
  const [board, setBoard] = useState<LeaderboardRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRank, setUserRank] = useState<number | null>(null);

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      const data = await fetchLeaderboard(15);
      setBoard(data);

      // Find authenticated user's best rank
      const currentUid = auth.currentUser?.uid;
      if (currentUid) {
        const index = data.findIndex(item => item.userId === currentUid);
        if (index !== -1) {
          setUserRank(index + 1);
        } else {
          setUserRank(null);
        }
      } else {
        setUserRank(null);
      }
    } catch (e) {
      console.error("Failed to fetch leaderboard logs:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeaderboard();
  }, []);

  return (
    <div className="w-full bg-neutral-950/80 border border-cyan-500/20 p-5 rounded-sm shadow-[0_0_25px_rgba(6,182,212,0.05)] text-left backdrop-blur-md">
      <div className="flex justify-between items-center mb-4 pb-2 border-b border-cyan-500/10">
        <div>
          <h3 className="text-cyan-400 text-xs font-black uppercase tracking-[0.25em] flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-ping" />
            Global Tactical Feed
          </h3>
          <p className="text-[9px] text-cyan-500/40 uppercase tracking-widest font-semibold mt-0.5">
            Synchronized Pilot Logs
          </p>
        </div>
        <button
          onClick={() => startTransition(() => { loadLeaderboard(); })}
          disabled={loading}
          className="text-[9px] text-cyan-400 hover:text-white transition-all uppercase font-medium border border-cyan-400/25 hover:border-cyan-400 px-2.5 py-1 tracking-widest disabled:opacity-50"
        >
          {loading ? "LINKING..." : "[ SYNC ]"}
        </button>
      </div>

      {loading && board.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
          <div className="text-[10px] text-cyan-500/40 uppercase font-black tracking-widest animate-pulse">
            Connecting to Host...
          </div>
        </div>
      ) : board.length === 0 ? (
        <div className="py-12 text-center text-[10px] text-zinc-600 uppercase tracking-widest">
          No tactical pilot logs found in Sector 7.
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {userRank !== null && (
            <div className="mb-2 bg-gradient-to-r from-cyan-950/40 to-transparent border-l-2 border-cyan-400 px-3 py-1.5 text-[9px] text-cyan-300 font-bold uppercase tracking-wider flex items-center justify-between">
              <span>Your Current Sector Standing:</span>
              <span className="font-extrabold text-cyan-400 text-xs">RANK #{userRank}</span>
            </div>
          )}

          {/* Table Header */}
          <div className="grid grid-cols-12 text-[8px] font-black text-zinc-500 uppercase tracking-widest border-b border-zinc-900 pb-1 px-2">
            <div className="col-span-2">Rank</div>
            <div className="col-span-4">Operator</div>
            <div className="col-span-3">Class</div>
            <div className="col-span-3 text-right">Extracted</div>
          </div>

          {/* Listing */}
          <div className="max-h-[220px] overflow-y-auto pr-1 flex flex-col gap-1 mt-1 custom-scrollbar">
            {board.map((item, index) => {
              const isMe = item.userId === auth.currentUser?.uid;
              const rank = index + 1;
              return (
                <div 
                  key={item.id} 
                  className={`grid grid-cols-12 text-[10px] font-medium py-1.5 px-2 rounded-sm items-center transition-all ${
                    isMe 
                      ? 'bg-cyan-400/10 border-l border-cyan-400 text-cyan-200 font-bold' 
                      : 'hover:bg-cyan-950/20 text-zinc-300 border-l border-transparent'
                  }`}
                >
                  {/* Rank */}
                  <div className="col-span-2 font-mono flex items-center gap-1">
                    {rank === 1 ? (
                      <span className="text-yellow-400 font-bold">🥇</span>
                    ) : rank === 2 ? (
                      <span className="text-zinc-400 font-bold">🥈</span>
                    ) : rank === 3 ? (
                      <span className="text-amber-600 font-bold">🥉</span>
                    ) : (
                      <span className="text-zinc-500 font-bold font-mono">#{rank}</span>
                    )}
                  </div>

                  {/* Operator */}
                  <div className="col-span-4 font-bold tracking-tight uppercase truncate pr-1">
                    {item.name}
                  </div>

                  {/* Specialty */}
                  <div className="col-span-3 text-[9px] text-zinc-500 uppercase tracking-wide truncate">
                    {item.legend ? item.legend.split('_').join(' ') : 'RECON'}
                  </div>

                  {/* Extraction points */}
                  <div className="col-span-3 text-right font-black text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.15)] font-mono">
                    {item.score}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
