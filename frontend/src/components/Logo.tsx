export function Logo({ size = 32 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2 font-display text-xl font-extrabold text-ink">
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="9" fill="#2563EB" />
        <path d="M13 6h6v7h7v6h-7v7h-6v-7H6v-6h7z" fill="#fff" />
        <circle cx="23.5" cy="23.5" r="6.5" fill="#14B8A6" stroke="#F8FAFC" strokeWidth="2" />
        <path d="M23.5 20.5v3l2 1.5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      </svg>
      MediSlot
    </span>
  );
}
