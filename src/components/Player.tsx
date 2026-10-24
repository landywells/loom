import { useEffect, useState } from 'react';
import { AudioLines, Pause, Play, SkipBack, SkipForward } from 'lucide-react';

const tracks = [
  { title: 'Pink + White', duration: 184 },
  { title: 'Ivy', duration: 249 },
  { title: 'Nights', duration: 307 },
  { title: 'Self Control', duration: 249 },
];

function clock(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function Player() {
  const [index, setIndex] = useState(0);
  const [elapsed, setElapsed] = useState(78);
  const [playing, setPlaying] = useState(false);
  const track = tracks[index];

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setElapsed((current) => {
        if (current + 1 >= track.duration) {
          setIndex((previous) => (previous + 1) % tracks.length);
          return 0;
        }
        return current + 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [playing, track.duration]);

  const skip = (direction: number) => {
    setIndex((current) => (current + direction + tracks.length) % tracks.length);
    setElapsed(0);
  };

  return (
    <div className="side-card player-card">
      <div className="player-heading">
        <span className="tiny-label">
          <AudioLines size={12} />
          On repeat
        </span>
        <span className="player-source">Vinyl · Side A</span>
      </div>

      <div className="player-main">
        <div className={`mini-record ${playing ? 'is-playing' : ''}`}>
          <span className="record-disc">
            <i />
          </span>
          <span className="record-sleeve">
            <b>blonde</b>
            <small>frank ocean</small>
          </span>
        </div>
        <div className="player-track">
          <h3>{track.title}</h3>
          <p>Frank Ocean · Blonde</p>
        </div>
        <button
          className="player-play"
          onClick={() => setPlaying((value) => !value)}
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {playing ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
        </button>
      </div>

      <div className="player-progress">
        <div className="track-line">
          <span style={{ width: `${(elapsed / track.duration) * 100}%` }} />
        </div>
        <div className="player-times">
          <span>{clock(elapsed)}</span>
          <span>{clock(track.duration)}</span>
        </div>
      </div>

      <div className="player-controls">
        <button onClick={() => skip(-1)} aria-label="Previous track">
          <SkipBack size={13} fill="currentColor" />
        </button>
        <span>{index + 1} / {tracks.length}</span>
        <button onClick={() => skip(1)} aria-label="Next track">
          <SkipForward size={13} fill="currentColor" />
        </button>
      </div>
    </div>
  );
}
