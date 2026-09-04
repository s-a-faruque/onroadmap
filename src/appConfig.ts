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
    shadow: string;
  };
}

interface RoadmapAppConfig {
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
          shadow: '0 24px 60px rgba(31, 44, 58, 0.13)',
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
