import React from "react";

export type IconName =
  | "grid"
  | "clock"
  | "receipt"
  | "scissors"
  | "box"
  | "shield"
  | "search"
  | "bell"
  | "pause"
  | "trash"
  | "plus"
  | "minus"
  | "chevron"
  | "logout"
  | "eye"
  | "eyeOff"
  | "card"
  | "cash"
  | "phone"
  | "calendar"
  | "filter"
  | "download"
  | "printer"
  | "edit"
  | "users"
  | "chart"
  | "settings"
  | "backup"
  | "menu"
  | "check"
  | "alert"
  | "wallet"
  | "tag"
  | "copy"
  | "key"
  | "lock"
  | "unlock"
  | "refresh"
  | "zap"
  | "x"
  | "info"
  | "dollarSign"
  | "star"
  | "trendingUp"
  | "trendingDown"
  | "percent"
  | "crown"
  | "sparkles"
  | "volume"
  | "volumeX"
  | "sun"
  | "moon"
  | "maximize"
  | "minimize"
  | "send";

const iconPaths: Record<IconName, React.ReactNode> = {
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  receipt: (
    <>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" />
      <path d="M9 8h6M9 12h6" />
    </>
  ),
  scissors: (
    <>
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="m8.6 7.5 10.4 9M8.6 16.5 19 8" />
    </>
  ),
  box: (
    <>
      <path d="m4 7 8-4 8 4-8 4-8-4Z" />
      <path d="M4 7v10l8 4 8-4V7M12 11v10" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 4 6v5c0 5 3.4 8.2 8 10 4.6-1.8 8-5 8-10V6l-8-3Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" />
    </>
  ),
  pause: (
    <>
      <rect x="5" y="4" width="5" height="16" rx="1.5" />
      <rect x="14" y="4" width="5" height="16" rx="1.5" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16M9 3h6l1 4M7 7l1 14h8l1-14M10 11v6M14 11v6" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  chevron: <path d="m9 18 6-6-6-6" />,
  logout: (
    <>
      <path d="M10 4H5v16h5M14 8l4 4-4 4M8 12h10" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  eyeOff: (
    <>
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68M3 3l18 18M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
    </>
  ),
  card: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 10h18" />
    </>
  ),
  cash: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <circle cx="12" cy="12" r="3" />
      <path d="M7 9H6v2M17 15h1v-2" />
    </>
  ),
  phone: (
    <path d="M6 3h4l2 5-3 2c1.5 3 3 4.5 6 6l2-3 4 2v4c0 2-2 3-4 2C9 19 5 15 3 7c-1-2 1-4 3-4Z" />
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </>
  ),
  filter: <path d="M4 5h16l-6 7v6l-4 2v-8L4 5Z" />,
  download: (
    <>
      <path d="M12 3v12m-5-5 5 5 5-5" />
      <path d="M5 21h14" />
    </>
  ),
  printer: (
    <>
      <path d="M7 8V3h10v5M7 17H4V9h16v8h-3M7 14h10v7H7z" />
    </>
  ),
  edit: (
    <>
      <path d="m4 20 4-1 11-11-3-3L5 16l-1 4Z" />
      <path d="m14 7 3 3" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="4" />
      <path d="M2 20c0-4 3-7 7-7s7 3 7 7M16 4c3 0 5 2 5 5 0 2-1 3-2 4M18 14c3 1 4 3 4 6" />
    </>
  ),
  chart: (
    <>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19 13.5v-3l-2-.7-.6-1.4.9-2-2.1-2.1-2 .9-1.4-.6-.7-2h-3l-.7 2-1.4.6-2-.9-2.1 2.1.9 2-.6 1.4-2 .7v3l2 .7.6 1.4-.9 2 2.1 2.1 2-.9 1.4.6.7 2h3l.7-2 1.4-.6 2 .9 2.1-2.1-.9-2 .6-1.4 2-.7Z" />
    </>
  ),
  backup: (
    <>
      <path d="M5 8a8 8 0 1 1-1 8" />
      <path d="M5 3v5h5" />
    </>
  ),
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  check: <path d="m5 12 4 4L19 6" />,
  alert: (
    <>
      <path d="M12 3 2 21h20L12 3Z" />
      <path d="M12 9v5M12 18h.01" />
    </>
  ),
  wallet: (
    <>
      <path d="M4 6h14a2 2 0 0 1 2 2v11H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h13" />
      <path d="M15 11h7v5h-7a2.5 2.5 0 0 1 0-5Z" />
    </>
  ),
  tag: (
    <>
      <path d="m3 12 9-9h7l2 2v7l-9 9-9-9Z" />
      <circle cx="16" cy="8" r="1" />
    </>
  ),
  copy: (
    <>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </>
  ),
  key: (
    <>
      <circle cx="7.5" cy="15.5" r="4.5" />
      <path d="m11 12 9-9M17 3l4 4M14 6l2 2" />
    </>
  ),
  lock: (
    <>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </>
  ),
  unlock: (
    <>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 9.9-1" />
    </>
  ),
  refresh: (
    <>
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 21h5v-5" />
    </>
  ),
  zap: <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z" />,
  x: <path d="M18 6 6 18M6 6l12 12" />,
  info: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </>
  ),
  dollarSign: (
    <>
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </>
  ),
  star: (
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  ),
  trendingUp: (
    <>
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </>
  ),
  trendingDown: (
    <>
      <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
      <polyline points="17 18 23 18 23 12" />
    </>
  ),
  percent: (
    <>
      <line x1="19" y1="5" x2="5" y2="19" />
      <circle cx="6.5" cy="6.5" r="2.5" />
      <circle cx="17.5" cy="17.5" r="2.5" />
    </>
  ),
  crown: (
    <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7Z" />
  ),
  sparkles: (
    <>
      <path d="m12 3 1.9 4.3L18 9l-4.1 1.7L12 15l-1.9-4.3L6 9l4.1-1.7L12 3Z" />
      <path d="m5 16 .9 2.1L8 19l-2.1.9L5 22l-.9-2.1L2 19l2.1-.9L5 16Z" />
    </>
  ),
  volume: (
    <>
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14" />
    </>
  ),
  volumeX: (
    <>
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <line x1="22" y1="9" x2="16" y2="15" />
      <line x1="16" y1="9" x2="22" y2="15" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </>
  ),
  moon: (
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
  ),
  maximize: (
    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
  ),
  minimize: (
    <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
  ),
  send: (
    <>
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </>
  ),
};

export function Icon({
  name,
  size = 18,
  className = "",
  style,
}: {
  name: IconName;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {iconPaths[name]}
    </svg>
  );
}

