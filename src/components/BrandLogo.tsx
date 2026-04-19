interface BrandLogoProps {
  size?: number;
  className?: string;
}

const BrandLogo = ({ size = 28, className = "" }: BrandLogoProps) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="nx-grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="hsl(220 100% 60%)" />
          <stop offset="50%" stopColor="hsl(270 80% 60%)" />
          <stop offset="100%" stopColor="hsl(330 90% 65%)" />
        </linearGradient>
      </defs>
      <path
        d="M16 2 C 18 12, 20 14, 30 16 C 20 18, 18 20, 16 30 C 14 20, 12 18, 2 16 C 12 14, 14 12, 16 2 Z"
        fill="url(#nx-grad)"
      />
    </svg>
  );
};

export default BrandLogo;
