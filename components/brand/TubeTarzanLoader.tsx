import TubeTarzanMark from "./TubeTarzanMark";

/** Page-load state for the dashboard and admin panel: the 3D mark with orbiting rings. Pure CSS, no script. */
export default function TubeTarzanLoader({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-2" role="status" aria-live="polite" aria-label={`${label}…`}>
      <div className="tt-splash-stage" style={{ width: 180 }}>
        <div className="tt-splash-ring a"><i /></div>
        <div className="tt-splash-ring b"><i /></div>
        <div className="tt-splash-core"><TubeTarzanMark size={40} /></div>
      </div>
      <p className="text-[#999999] text-sm -mt-2">{label}…</p>
    </div>
  );
}
