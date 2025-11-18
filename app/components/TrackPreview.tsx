interface Track {
  track_id: string;
  track_name: string;
  track_url: string;
  track_duration_seconds: number;
}

interface TrackPreviewProps {
  track: Track;
  onRemove?: (trackId: string) => void;
}

const formatDuration = (value: number): string => {
  const totalSeconds = Math.max(0, Math.round(value));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = `${totalSeconds % 60}`.padStart(2, "0");
  return `${minutes}:${seconds}`;
};

const TrackPreview = ({ track, onRemove }: TrackPreviewProps) => {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-700/70 bg-slate-900/60 px-5 py-4 shadow-[0_10px_35px_rgba(2,6,23,0.6)]">
      <div className="max-w-[75%]">
        <p className="text-base font-semibold text-white">{track.track_name}</p>
        <p className="text-sm text-slate-400">
          Duration: {formatDuration(track.track_duration_seconds)}
        </p>
        <a
          href={track.track_url}
          target="_blank"
          rel="noreferrer"
          className="text-sm font-medium text-indigo-300 underline hover:text-indigo-200"
        >
          Open R2 object
        </a>
      </div>
      {onRemove ? (
        <button
          type="button"
          className="rounded-xl border border-rose-500/50 px-3 py-1 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/10"
          onClick={() => onRemove(track.track_id)}
        >
          Remove
        </button>
      ) : null}
    </div>
  );
};

export default TrackPreview;
