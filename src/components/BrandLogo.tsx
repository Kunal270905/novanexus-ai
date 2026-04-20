interface BrandLogoProps {
  size?: number;
  className?: string;
}

// Novanexus mark: an interlocking orbit forming an "N" — a nexus of paths in motion.
const BrandLogo = ({ size = 28, className = "" }: BrandLogoProps) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="nx-grad" x1="4" y1="4" x2="60" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="hsl(220 100% 60%)" />
          <stop offset="50%" stopColor="hsl(270 80% 60%)" />
          <stop offset="100%" stopColor="hsl(330 90% 65%)" />
        </linearGradient>
        <radialGradient id="nx-core" cx="32" cy="32" r="10" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="hsl(330 90% 75%)" />
          <stop offset="100%" stopColor="hsl(270 80% 55%)" />
        </radialGradient>
      </defs>

      {/* Outer rounded square frame */}
      <rect
        x="4"
        y="4"
        width="56"
        height="56"
        rx="16"
        stroke="url(#nx-grad)"
        strokeWidth="2.5"
        opacity="0.85"
      />

      {/* Stylized "N" — two diagonals + bridging slash */}
      <path
        d="M16 48 L16 16 L48 48 L48 16"
        stroke="url(#nx-grad)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Nexus core */}
      <circle cx="32" cy="32" r="4.5" fill="url(#nx-core)" />
    </svg>
  );
};

export default BrandLogo;
