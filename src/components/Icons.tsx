import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Base({ size = 28, children, ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const CartIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M3 4h2l2.4 11h10.2L20 7H6.5" />
    <circle cx="9" cy="19.5" r="1.5" />
    <circle cx="17" cy="19.5" r="1.5" />
  </Base>
);

export const CalendarIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x="3" y="5" width="18" height="16" rx="4" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </Base>
);

export const ChecklistIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M5 7l2 2 3-3M5 15l2 2 3-3M13 8h6M13 16h6" />
  </Base>
);

export const GiftIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x="3" y="8" width="18" height="5" rx="1.5" />
    <rect x="5" y="13" width="14" height="8" rx="2" />
    <path d="M12 8v13M12 8c-2-4-6-3-5 0M12 8c2-4 6-3 5 0" />
  </Base>
);

export const CheckIcon = (p: IconProps) => (
  <Base strokeWidth={3.4} {...p}>
    <path d="M5 12.5 L10 17.5 L19 7" />
  </Base>
);

export const MenuIcon = (p: IconProps) => (
  <Base strokeWidth={2.4} {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Base>
);

export const CloseIcon = (p: IconProps) => (
  <Base strokeWidth={2.4} {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Base>
);

export function Star({ filled, size = 40 }: { filled: boolean; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path
        d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2 6.3 20.3l1.2-6.4L2.8 9.5l6.4-.8z"
        fill={filled ? "#FDC500" : "#FFFFFF"}
        stroke={filled ? "#C99A00" : "#7D8199"}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export const HouseKeyIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M3 11l9-7 9 7" />
    <path d="M5 10v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-9" />
    <circle cx="12" cy="13" r="2" />
    <path d="M12 15v3" />
  </Base>
);

export const HomeIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M3 11l9-7 9 7" />
    <path d="M5 10v9a2 2 0 0 0 2 2h3v-6h4v6h3a2 2 0 0 0 2-2v-9" />
  </Base>
);

export const UsersIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5" />
    <circle cx="17" cy="9" r="2.5" />
    <path d="M17 14.5c2.4 0 4.1 1.4 4.5 4" />
  </Base>
);

export const ShareIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 3v12M7 8l5-5 5 5" />
    <path d="M5 13v5a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3v-5" />
  </Base>
);

export const CopyIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x="8" y="8" width="13" height="13" rx="3" />
    <path d="M16 8V6a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3v7a3 3 0 0 0 3 3h2" />
  </Base>
);

export const RefreshIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M20 11a8 8 0 0 0-14.5-4.5L4 8M4 4v4h4" />
    <path d="M4 13a8 8 0 0 0 14.5 4.5L20 16M20 20v-4h-4" />
  </Base>
);

export const LogoutIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
    <path d="M10 17l-5-5 5-5M5 12h11" />
  </Base>
);

export const MoreIcon = (p: IconProps) => (
  <Base strokeWidth={3} {...p}>
    <path d="M12 5.5h.01M12 12h.01M12 18.5h.01" />
  </Base>
);

export const CrownIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 10H5z" />
  </Base>
);

/** Logo de Google (marca de terceros, colores oficiales). */
export function GoogleIcon({ size = 22 }: { size?: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

export const GridIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" />
    <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" />
    <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" />
    <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" />
  </Base>
);

export const ChevronLeftIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M15 5l-7 7 7 7" />
  </Base>
);

export const ChevronRightIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M9 5l7 7-7 7" />
  </Base>
);

export const PlusIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 5v14M5 12h14" />
  </Base>
);

export const ShuffleIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M16 4h4v4M20 4l-6.5 6.5M4 20l6-6M16 20h4v-4M20 20L4 4" />
  </Base>
);

export const EditIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 20h4L19 9l-4-4L4 16z" />
    <path d="M13.5 6.5l4 4" />
  </Base>
);

export const XMarkIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M7 7l10 10M17 7L7 17" />
  </Base>
);

export const RepeatIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M17 3l3 3-3 3" />
    <path d="M4 12V9a3 3 0 0 1 3-3h13" />
    <path d="M7 21l-3-3 3-3" />
    <path d="M20 12v3a3 3 0 0 1-3 3H4" />
  </Base>
);

export const AlertIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5v5.5M12 16.5h.01" />
  </Base>
);

export const PiggyIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M5 11a6 5 0 0 1 6-5h2a6 5 0 0 1 6 4h1.5v4H19a6 6 0 0 1-2 2.5V20h-3v-2h-4v2H7v-3a5 5 0 0 1-2-4" />
    <path d="M5 11H3.5M15.5 10.5h.01M10 6.2V5" />
  </Base>
);

export const SettingsIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
    <circle cx="16" cy="7" r="2" />
    <circle cx="10" cy="17" r="2" />
  </Base>
);
