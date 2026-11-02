import type { SVGProps } from 'react';

const paths = {
  home: 'm3 10 9-7 9 7M5 9v11h5v-6h4v6h5V9',
  plan: 'M7 3v4m10-4v4M4 9h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1M8 13h3m-3 4h7',
  fitness: 'M7 8v8m-3-6v4m13-6v8m3-6v4M7 12h10',
  english: 'M4 5h6a3 3 0 0 1 3 3v12a5 5 0 0 0-5-2H4V5Zm9 3a3 3 0 0 1 3-3h5v13h-3a5 5 0 0 0-5 2',
  more: 'M5 5h5v5H5zM14 5h5v5h-5zM5 14h5v5H5zM14 14h5v5h-5z',
  report: 'M6 3h9l4 4v14H6V3Zm9 0v5h4M9 12h7m-7 4h5',
  expense: 'M4 6h16v14H4V6Zm0 0 3-3h11v3m-3 5h5v5h-5z',
  settings: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0-5v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4',
  backup: 'M7 18H5a4 4 0 0 1 0-8 7 7 0 0 1 14-1 4.5 4.5 0 0 1 0 9h-2m-5-7v10m-4-4 4 4 4-4',
  arrow: 'M5 12h14m-5-5 5 5-5 5',
  chevron: 'm9 5 7 7-7 7',
  check: 'm5 12 4 4L19 6',
  close: 'm6 6 12 12M6 18 18 6',
  sun: 'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0-5v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5',
  moon: 'M20 14A8 8 0 0 1 10 4a8 8 0 1 0 10 10Z',
  shield: 'm12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Zm-4 9 3 3 5-6',
  leaf: 'M5 19C0 6 11 3 21 4c0 13-8 18-16 15Zm0 0L16 9',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 4v5l3 2',
  copy: 'M9 9h11v12H9zM15 9V3H3v12h6',
  upload: 'M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6',
  trash: 'M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7',
} as const;
export type IconName = keyof typeof paths;
export function Icon({ name, ...props }: SVGProps<SVGSVGElement> & { name: IconName }) {
  return <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={paths[name]} /></svg>;
}
