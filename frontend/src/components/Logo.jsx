import React from 'react';

export default function Logo({ className = "w-10 h-10", showText = false, textClassName = "text-2xl font-bold text-gray-800" }) {
  return (
    <div className="flex items-center gap-3 select-none">
      <svg
        viewBox="0 0 200 180"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        <defs>
          <linearGradient id="sevadeepFlameGrad" x1="0%" y1="100%" x2="40%" y2="0%">
            <stop offset="0%" stopColor="#be1e2d" />
            <stop offset="50%" stopColor="#f37021" />
            <stop offset="100%" stopColor="#faa61a" />
          </linearGradient>
          
          <linearGradient id="sevadeepRedHand" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#c02128" />
            <stop offset="100%" stopColor="#9e111a" />
          </linearGradient>

          <linearGradient id="sevadeepOrangeHand" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f47820" />
            <stop offset="100%" stopColor="#d85200" />
          </linearGradient>
        </defs>

        <g>
          {/* --- TOP FLAME --- */}
          {/* Main Flame outer shape */}
          <path
            d="M 100 12 C 104 22 118 36 120 50 C 122 65 115 78 100 88 C 88 78 82 68 82 54 C 82 38 92 24 100 12 Z"
            fill="url(#sevadeepFlameGrad)"
          />
          {/* Flame S-curve outer orange tip extension */}
          <path
            d="M 100 12 C 108 24 124 38 120 54 C 117 68 106 78 100 88 C 105 80 114 70 112 56 C 110 40 102 24 100 12 Z"
            fill="#f7931e"
          />
          {/* Flame inner red accent (left side) */}
          <path
            d="M 100 12 C 94 24 84 38 84 54 C 84 66 90 76 100 88 C 93 78 88 68 88 56 C 88 42 96 24 100 12 Z"
            fill="#b81d24"
          />
          {/* Flame inner core bright yellow/orange glow */}
          <path
            d="M 100 30 C 105 42 108 55 102 68 C 100 73 98 80 100 88 C 98 80 96 73 95 68 C 90 55 94 42 100 30 Z"
            fill="#ffc247"
          />

          {/* --- BOTTOM HANDS / DIYA BOWL --- */}
          
          {/* Right Hand (Orange) Swoop */}
          <path
            d="M 175 92 C 150 96 110 122 75 142 C 110 144 148 130 172 112 C 178 105 180 98 175 92 Z"
            fill="url(#sevadeepOrangeHand)"
          />
          <path
            d="M 175 92 C 135 96 90 125 55 145 C 95 148 145 132 172 112 C 178 105 180 98 175 92 Z"
            fill="#f37021"
          />

          {/* Left Hand (Red) Swoop */}
          <path
            d="M 25 92 C 50 96 90 122 125 142 C 90 144 52 130 28 112 C 22 105 20 98 25 92 Z"
            fill="url(#sevadeepRedHand)"
          />
          <path
            d="M 25 92 C 65 96 110 125 145 145 C 105 148 55 132 28 112 C 22 105 20 98 25 92 Z"
            fill="#be1e2d"
          />

          {/* Front Red Hand overlapping gracefully */}
          <path
            d="M 25 92 C 55 96 100 120 135 125 C 105 136 60 128 35 114 C 27 107 24 99 25 92 Z"
            fill="#be1e2d"
          />

          {/* Front Orange Hand overlapping gracefully on right */}
          <path
            d="M 175 92 C 145 96 100 120 65 125 C 95 136 140 128 165 114 C 173 107 176 99 175 92 Z"
            fill="#f37021"
          />

          {/* Diya Base Smooth Bottom Arc (Joined Hands) */}
          <path
            d="M 32 94 C 55 106 90 136 100 142 C 110 136 145 106 168 94 C 150 114 118 148 100 148 C 82 148 50 114 32 94 Z"
            fill="#d94b15"
            opacity="0.3"
          />

        </g>
      </svg>
      {showText && <span className={textClassName}>Sevadeep</span>}
    </div>
  );
}
