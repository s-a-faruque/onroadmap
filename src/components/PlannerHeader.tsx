import { ChangeEvent, RefObject, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, FileDown, Plus, Upload } from 'lucide-react';
import { appConfig } from '../appConfig';
import type { RoadmapState, SnapMode, TimelineView } from '../types';

interface PlannerHeaderProps {
  roadmap: RoadmapState;
  timelineRangeSelection: { start: { year: number; monthIndex: number }; end: { year: number; monthIndex: number } };
  timelineView: TimelineView;
  activeSnapMode: SnapMode;
  fileInputRef: RefObject<HTMLInputElement | null>;
  getMonthInputValue: (month: { year: number; monthIndex: number }) => string;
  showTaskLabels: boolean;
  showColorPicker: boolean;
  showDeleteButton: boolean;
  onTitleChange: (title: string) => void;
  onSubtitleChange: (subtitle: string) => void;
  onTimelineStartChange: (value: string) => void;
  onTimelineEndChange: (value: string) => void;
  onViewChange: (view: TimelineView) => void;
  onSnapModeChange: (snapMode: SnapMode) => void;
  onToggleTaskLabels: () => void;
  onToggleColorPicker: () => void;
  onToggleDeleteButton: () => void;
  onAddLane: () => void;
  onExport: () => void;
  onExportPdf: () => void;
  onImport: (event: ChangeEvent<HTMLInputElement>) => void;
}

export function PlannerHeader({
  roadmap,
  timelineRangeSelection,
  timelineView,
  activeSnapMode,
  fileInputRef,
  getMonthInputValue,
  showTaskLabels,
  showColorPicker,
  showDeleteButton,
  onTitleChange,
  onSubtitleChange,
  onTimelineStartChange,
  onTimelineEndChange,
  onViewChange,
  onSnapModeChange,
  onToggleTaskLabels,
  onToggleColorPicker,
  onToggleDeleteButton,
  onAddLane,
  onExport,
  onExportPdf,
  onImport,
}: PlannerHeaderProps) {
  const enabledSnapModes = appConfig.controls.snapModes;
  const [showMoreControls, setShowMoreControls] = useState(() => window.matchMedia('(min-width: 761px)').matches);

  return (
    <>
      <nav className="planner-nav" aria-label="Planner navigation">
        <div className="brand-lockup">
          <img className="brand-logo" src="/route.png" alt="Onroadmap logo" />
          <span>flash roadmap</span>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button 
            className="planner-nav-action" 
            type="button" 
            onClick={() => window.location.hash = ''}
          >
            Overview
          </button>
          <button 
            className="planner-nav-action" 
            type="button" 
            onClick={() => {
              if (window.Tally) {
                window.Tally.openPopup('KYjMLX');
              }
            }}
          >
            Feedback
          </button>
        </div>
      </nav>
      <section className="topbar" aria-label="Roadmap controls">
        <div>
          <p className="eyebrow">
            <input className="roadmap-subtitle" value={roadmap.subtitle} onChange={(event) => onSubtitleChange(event.target.value)} aria-label="Roadmap subtitle" />
          </p>
          <h1>
            <input className="roadmap-title" value={roadmap.title} onChange={(event) => onTitleChange(event.target.value)} aria-label="Roadmap title" />
          </h1>
        </div>

        <div className="controls">
          <div className="timeline-range-picker" aria-label="Timeline range">
            <label className="year-field">
              <span>From</span>
              <input type="month" value={getMonthInputValue(timelineRangeSelection.start)} onChange={(event) => onTimelineStartChange(event.target.value)} />
            </label>
            <label className="year-field">
              <span>To</span>
              <input type="month" value={getMonthInputValue(timelineRangeSelection.end)} onChange={(event) => onTimelineEndChange(event.target.value)} />
            </label>
          </div>

          <div className="segmented" aria-label="Timeline view">
            {(['month', 'week'] as TimelineView[]).map((view) => (
              <button key={view} className={timelineView === view ? 'active' : ''} type="button" onClick={() => onViewChange(view)}>
                {view}
              </button>
            ))}
          </div>

          <button type="button" className="icon-button add-lane-button" onClick={onAddLane} title="Add swimlane" aria-label="Add swimlane"><Plus size={18} /><span>Add swimlane</span></button>
          <details className="more-controls" open={showMoreControls} onToggle={(event) => setShowMoreControls(event.currentTarget.open)}>
            <summary title={showMoreControls ? 'Hide more controls' : 'Show more controls'} aria-label={showMoreControls ? 'Hide more controls' : 'Show more controls'}><ChevronRight size={20} /></summary>
            <div className="more-controls-content">
              <div className="timeline-settings" aria-label="Timeline settings">
                <label className="setting-toggle">
                  <input type="checkbox" checked={showTaskLabels} onChange={onToggleTaskLabels} />
                  <span>Labels</span>
                </label>
                <label className="setting-toggle">
                  <input type="checkbox" checked={showColorPicker} onChange={onToggleColorPicker} />
                  <span>Color picker</span>
                </label>
                <label className="setting-toggle">
                  <input type="checkbox" checked={showDeleteButton} onChange={onToggleDeleteButton} />
                  <span>Delete</span>
                </label>
              </div>
              {enabledSnapModes.length > 0 && (
                <select className="snap-mode-select" value={activeSnapMode} onChange={(event) => onSnapModeChange(event.target.value as SnapMode)}>
                  {enabledSnapModes.map((snapOption) => <option key={snapOption.value} value={snapOption.value}>{snapOption.label}</option>)}
                </select>
              )}
              <div className="file-actions" aria-label="File actions">
                {appConfig.controls.enableJsonImport && (
                  <>
                    <button type="button" className="icon-button" onClick={() => fileInputRef.current?.click()} title="Import JSON" aria-label="Import JSON"><Upload size={18} /><span>Import</span></button>
                    <input ref={fileInputRef} className="hidden-input" type="file" accept="application/json" onChange={onImport} />
                  </>
                )}
                {appConfig.controls.enableJsonExport && <button type="button" className="icon-button" onClick={onExport} title="Export JSON" aria-label="Export JSON"><Download size={18} /><span>Export</span></button>}
                {appConfig.controls.enablePdfDownload && <button type="button" className="icon-button pdf-download-button" onClick={onExportPdf} title="Download PDF" aria-label="Download PDF"><FileDown size={18} /><span>PDF</span></button>}
              </div>
            </div>
          </details>
        </div>
      </section>
    </>
  );
}