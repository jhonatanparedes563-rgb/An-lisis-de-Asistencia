import React from 'react';

interface CamposolLogoProps {
  className?: string;
  size?: number;
}

export const CamposolLogo: React.FC<CamposolLogoProps> = ({
  className = 'w-10 h-10',
}) => {
  return (
    <svg
      viewBox="0 0 200 200"
      className={`${className} shrink-0 select-none`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Sun Gradient */}
        <radialGradient id="camposol-sun" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFE066" />
          <stop offset="45%" stopColor="#FFA600" />
          <stop offset="100%" stopColor="#FF7700" />
        </radialGradient>

        {/* Text Arc: Curves over the top of the fields */}
        <path
          id="camposol-arc"
          d="M 32 112 A 74 74 0 0 1 168 112"
          fill="none"
        />

        {/* Clip path for the field dome */}
        <clipPath id="camposol-fields-clip">
          <path d="M 40 144 C 40 76 160 76 160 144 C 136 164 64 164 40 144 Z" />
        </clipPath>
      </defs>

      {/* Main circular green badge with gold border */}
      <circle
        cx="100"
        cy="100"
        r="94"
        fill="#559E37"
        stroke="#CBB078"
        strokeWidth="4.5"
      />

      {/* Arched Text: Camposol® */}
      <text fill="#FFFFFF">
        <textPath
          href="#camposol-arc"
          startOffset="50%"
          textAnchor="middle"
          fontSize="33"
          fontWeight="800"
          fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          letterSpacing="0.5px"
        >
          Camposol®
        </textPath>
      </text>

      {/* Field dome interior */}
      <g clipPath="url(#camposol-fields-clip)">
        {/* Sky behind the fields */}
        <rect x="30" y="60" width="140" height="100" fill="#559E37" />

        {/* Rising sun */}
        <circle cx="100" cy="98" r="18" fill="url(#camposol-sun)" />

        {/* Perspective furrowed rows (agricultural fields) */}
        {/* Row 1 - Far Left */}
        <path
          d="M 38 144 Q 72 116 93 103 L 88 103 Q 56 122 38 144"
          fill="#1C6524"
        />
        {/* Row 2 */}
        <path
          d="M 52 148 Q 78 120 95 103 L 93 103 Q 66 124 50 148"
          fill="#3B8B2E"
        />
        {/* Row 3 - Center Left */}
        <path
          d="M 68 153 Q 86 124 97 103 L 95 103 Q 76 128 66 153"
          fill="#1C6524"
        />
        {/* Row 4 - Center */}
        <path
          d="M 85 156 Q 94 126 99 103 L 97 103 Q 88 130 83 156"
          fill="#3B8B2E"
        />
        {/* Row 5 - Center Right */}
        <path
          d="M 103 156 Q 102 127 100 103 L 102 103 Q 106 128 105 156"
          fill="#1C6524"
        />
        {/* Row 6 */}
        <path
          d="M 120 154 Q 110 126 102 103 L 104 103 Q 117 127 122 154"
          fill="#3B8B2E"
        />
        {/* Row 7 */}
        <path
          d="M 136 150 Q 119 123 104 103 L 106 103 Q 128 124 139 150"
          fill="#1C6524"
        />
        {/* Row 8 - Far Right */}
        <path
          d="M 160 144 Q 128 117 106 103 L 110 103 Q 142 120 160 144"
          fill="#3B8B2E"
        />

        {/* Fine white perspective divider lines between rows */}
        <path
          d="M 52 148 Q 78 120 95 103"
          stroke="#FFFFFF"
          strokeWidth="1.2"
          fill="none"
          opacity="0.9"
        />
        <path
          d="M 68 153 Q 86 124 97 103"
          stroke="#FFFFFF"
          strokeWidth="1.2"
          fill="none"
          opacity="0.9"
        />
        <path
          d="M 85 156 Q 94 126 99 103"
          stroke="#FFFFFF"
          strokeWidth="1.2"
          fill="none"
          opacity="0.9"
        />
        <path
          d="M 103 156 Q 102 127 100 103"
          stroke="#FFFFFF"
          strokeWidth="1.2"
          fill="none"
          opacity="0.9"
        />
        <path
          d="M 120 154 Q 110 126 102 103"
          stroke="#FFFFFF"
          strokeWidth="1.2"
          fill="none"
          opacity="0.9"
        />
        <path
          d="M 136 150 Q 119 123 104 103"
          stroke="#FFFFFF"
          strokeWidth="1.2"
          fill="none"
          opacity="0.9"
        />
      </g>

      {/* Crisp white arched dome outline */}
      <path
        d="M 40 144 C 40 76 160 76 160 144"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="3.8"
      />
    </svg>
  );
};
