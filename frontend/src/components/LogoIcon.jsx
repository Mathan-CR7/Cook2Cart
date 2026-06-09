export default function LogoIcon({ className = "w-10 h-10", color = "#ff6b35", cartColor = "#1e2229" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Chef Hat Outline */}
      <path
        d="M 32 60 L 68 60 L 68 48 C 80 48, 82 36, 65 36 C 65 18, 35 18, 35 36 C 18 36, 20 48, 32 48 Z"
        stroke={color}
        strokeWidth="6"
        strokeLinejoin="round"
        strokeLinecap="round"
        fill="white"
      />
      {/* Inner vents (vertical lines) */}
      <path
        d="M 44 51 V 57 M 56 51 V 57"
        stroke={color}
        strokeWidth="5.5"
        strokeLinecap="round"
      />
      {/* Cart Base */}
      <path
        d="M 26 69 C 26 69, 28 77, 50 77 C 72 77, 74 69, 74 69"
        stroke={cartColor}
        strokeWidth="6.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Cart Wheels */}
      <circle cx="37" cy="85" r="5" fill={cartColor} />
      <circle cx="63" cy="85" r="5" fill={cartColor} />
    </svg>
  );
}
