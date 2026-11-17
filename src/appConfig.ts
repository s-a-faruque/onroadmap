import type { SnapMode } from './types';

interface SnapModeOption {
  value: SnapMode;
  label: string;
}

export interface ThemeOption {
  id: string;
  label: string;
  colors: {
    appBackground: string;
    ink: string;
    inkRgb: string;
    muted: string;
    paper: string;
    paperRgb: string;
    line: string;
    lineRgb: string;
    track: string;
    accent: string;
    green: string;
    greenRgb: string;
    shadow: string;
  };
}

interface RoadmapAppConfig {
  branding: {
    enabled: boolean;
    name: string;
    logo: string;
  };
  timeline: {
    startYear: number;
    endYear?: number;
    startMonth: number;
    monthSpan: number;
    allowYearSelection: boolean;
  };
  themes: {
    defaultTheme: string;
    options: ThemeOption[];
  };
  controls: {
    snapModes: SnapModeOption[];
    defaultSnapMode: SnapMode;
    enableJsonExport: boolean;
    enableJsonImport: boolean;
    enablePdfDownload: boolean;
    pdfWatermark: {
      enabled: boolean;
      text: string;
      opacity: number;
      fontSize: number;
      angle: number;
      columns: number;
      rows: number;
    };
  };
}

export const appConfig: RoadmapAppConfig = {
  branding: {
    enabled: true,
    name: 'flash roadmap',
    logo: '/route.png',
  },
  timeline: {
    startYear: 2026,
    endYear: 2026,
    startMonth: 4,
    monthSpan: 12,
    allowYearSelection: false,
  },
  themes: {
    defaultTheme: 'cool-light',
    options: [
      {
        id: 'cool-light',
        label: 'Cool light',
        colors: {
          appBackground: '#ffffff',
          ink: '#1b2430',
          inkRgb: '27, 36, 48',
          muted: '#607080',
          paper: '#ffffff',
          paperRgb: '255, 255, 255',
          line: '#d8e0e8',
          lineRgb: '216, 224, 232',
          track: '#eef3f7',
          accent: '#b85f3d',
          green: '#2f6372',
          greenRgb: '47, 99, 114',
          shadow: '0 24px 60px rgba(31, 44, 58, 0.13)',
        },
      },
      {
        id: 'midnight',
        label: 'Midnight',
        colors: {
          appBackground: '#111820',
          ink: '#e7edf3',
          inkRgb: '231, 237, 243',
          muted: '#a2b0bf',
          paper: '#1b2632',
          paperRgb: '27, 38, 50',
          line: '#354555',
          lineRgb: '53, 69, 85',
          track: '#263442',
          accent: '#f0a36b',
          green: '#75b8a5',
          greenRgb: '117, 184, 165',
          shadow: '0 24px 60px rgba(0, 0, 0, 0.32)',
        },
      },
    ],
  },
  controls: {
    snapModes: [
      { value: 'day', label: 'Snap day' },
      { value: 'week', label: 'Snap week' },
      { value: 'month', label: 'Snap month' },
    ],
    defaultSnapMode: 'week',
    enableJsonExport: true,
    enableJsonImport: true,
    enablePdfDownload: true,
    pdfWatermark: {
      enabled: false,
      text: 'On Roadmap',
      opacity: 0.08,
      fontSize: 42,
      angle: 45,
      columns: 3,
      rows: 2,
    },
  },
};
