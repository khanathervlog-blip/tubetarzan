/** TubeTarzan mark: a play button with a rising "viral" line, in the brand yellow and red. */
export default function TubeTarzanMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <defs>
        <linearGradient id="ttm-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFD200" />
          <stop offset="1" stopColor="#FF3B3B" />
        </linearGradient>
      </defs>
      <rect x="3" y="9" width="42" height="30" rx="10" fill="url(#ttm-g)" />
      <path d="M20 17.5v13l11-6.5z" fill="#080808" />
      <path d="M8 34l8-6 6 3 9-9" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" opacity=".9" />
    </svg>
  );
}
