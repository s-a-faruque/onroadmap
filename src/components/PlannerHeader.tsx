import { ChangeEvent, RefObject, useEffect, useState } from 'react';
import { ChevronDown, Download, FileDown, LayoutTemplate, Moon, PanelsTopLeft, Plus, Printer, Sun, Undo2, Upload, X } from 'lucide-react';
import { appConfig } from '../appConfig';
import { AuthControls } from './AuthControls';
import { CloudPlansControls } from './CloudPlansControls';
import type { RoadmapTemplate } from '../templates';
import type { RoadmapState, SnapMode, TimelineDesign, TimelineView } from '../types';

interface PlannerHeaderProps {
  roadmap: RoadmapState;
  timelineRangeSelection: { start: { year: number; monthIndex: number }; end: { year: number; monthIndex: number } };
  timelineView: TimelineView;
  activeSnapMode: SnapMode;
  pdfPagesWide: number;
  fileInputRef: RefObject<HTMLInputElement | null>;
  getMonthInputValue: (month: { year: number; monthIndex: number }) => string;
  templateOptions: RoadmapTemplate[];
  selectedTemplateId: string;
  onTemplateChange: (templateId: string) => void;
  onApplyTemplate: (templateId: string, startValue: string) => void;
  selectedThemeId: string;
  onToggleTheme: () => void;
  timelineDesign: TimelineDesign;
  onToggleTimelineDesign: () => void;
  printFriendly: boolean;
  onTitleChange: (title: string) => void;
  onSubtitleChange: (subtitle: string) => void;
  onTimelineStartChange: (value: string) => void;
  onTimelineEndChange: (value: string) => void;
  onViewChange: (view: TimelineView) => void;
  onSnapModeChange: (snapMode: SnapMode) => void;
  onPdfPagesWideChange: (pagesWide: number) => void;
  onTogglePrintFriendly: () => void;
  onUndo: () => void;
  canUndo: boolean;
  onAddTask: () => void;
  onAddLane: () => void;
  onExport: () => void;
  onExportPdf: () => void;
  onImport: (event: ChangeEvent<HTMLInputElement>) => void;
  onCloudLoad: (roadmap: RoadmapState) => void;
}

export function PlannerHeader({
  roadmap,
  timelineRangeSelection,
  timelineView,
  activeSnapMode,
  pdfPagesWide,
  fileInputRef,
  getMonthInputValue,
  templateOptions,
  selectedTemplateId,
  onTemplateChange,
  onApplyTemplate,
  selectedThemeId,
  onToggleTheme,
  timelineDesign,
  onToggleTimelineDesign,
  printFriendly,
  onTitleChange,
  onSubtitleChange,
  onTimelineStartChange,
  onTimelineEndChange,
  onViewChange,
  onSnapModeChange,
  onPdfPagesWideChange,
  onTogglePrintFriendly,
  onUndo,
  canUndo,
  onAddTask,
  onAddLane,
  onExport,
  onExportPdf,
  onImport,
  onCloudLoad,
}: PlannerHeaderProps) {
  const enabledSnapModes = appConfig.controls.snapModes;
  const [showTemplateDrawer, setShowTemplateDrawer] = useState(false);

  useEffect(() => {
    if (!showTemplateDrawer) {
      return;
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setShowTemplateDrawer(false);
      }
    }

    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [showTemplateDrawer]);

  const selectedTemplate = templateOptions.find((template) => template.id === selectedTemplateId) ?? templateOptions[0];

  return (
    <>
      <nav className="planner-nav" aria-label="Planner navigation">
        {appConfig.branding.enabled && <div className="brand-lockup">
          <img className="brand-logo" src={appConfig.branding.logo} alt={`${appConfig.branding.name} logo`} />
          <span>{appConfig.branding.name}</span>
        </div>}
        <div className="planner-nav-links">
          <button 
            className="planner-nav-action" 
            type="button" 
            onClick={() => window.location.hash = ''}
          >
            Overview
          </button>
          <a className="planner-nav-action" href="/templates">
            Templates
          </a>
          <AuthControls variant="planner" />
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
          <button
            type="button"
            className="icon-button planner-theme-toggle"
            onClick={onToggleTheme}
            title={`Switch to ${selectedThemeId === 'midnight' ? 'Cool light' : 'Midnight'} theme`}
            aria-label={`Switch to ${selectedThemeId === 'midnight' ? 'Cool light' : 'Midnight'} theme`}
          >
            {selectedThemeId === 'midnight' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button
            type="button"
            className="icon-button planner-design-toggle"
            onClick={onToggleTimelineDesign}
            title={`Switch to ${timelineDesign === 'classic' ? 'Flow' : 'Classic'} timeline design`}
            aria-label={`Switch to ${timelineDesign === 'classic' ? 'Flow' : 'Classic'} timeline design`}
            aria-pressed={timelineDesign === 'flow'}
          >
            <PanelsTopLeft size={18} />
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
          <CloudPlansControls roadmap={roadmap} onLoad={onCloudLoad} />
          <button type="button" className="template-drawer-trigger" onClick={() => setShowTemplateDrawer(true)} aria-haspopup="dialog" aria-expanded={showTemplateDrawer}>
            <LayoutTemplate size={17} />
            <span>Templates</span>
            <strong>{selectedTemplate.name}</strong>
          </button>

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
            {(['month', 'week', 'day'] as TimelineView[]).map((view) => (
              <button key={view} className={timelineView === view ? 'active' : ''} type="button" onClick={() => onViewChange(view)}>
                {view}
              </button>
            ))}
          </div>

          <button type="button" className="icon-button" onClick={onUndo} disabled={!canUndo} title="Undo" aria-label="Undo"><Undo2 size={18} /></button>
          {!printFriendly && <button type="button" className="primary-add-task-button" onClick={onAddTask} title="Add task"><Plus size={18} /><span>Add task</span></button>}
          {!printFriendly && <button type="button" className="icon-button add-lane-button" onClick={onAddLane} title="Add swimlane" aria-label="Add swimlane"><Plus size={18} /><span>Add swimlane</span></button>}
          <details className="export-menu">
            <summary className="export-menu-trigger" aria-label="Export and print options">
              <Printer size={16} />
              <span>Export / Print</span>
              <ChevronDown size={15} />
            </summary>
            <div className="export-menu-content">
              <label className="setting-toggle export-menu-row" title="Remove editing controls from the timeline for printing">
                <input type="checkbox" checked={printFriendly} onChange={onTogglePrintFriendly} />
                <span><Printer size={15} /> Print preview</span>
              </label>
              {enabledSnapModes.length > 0 && (
                <label className="export-menu-row export-menu-select">
                  <span>Snap tasks</span>
                  <select className="snap-mode-select" value={activeSnapMode} onChange={(event) => onSnapModeChange(event.target.value as SnapMode)}>
                    {enabledSnapModes.map((snapOption) => <option key={snapOption.value} value={snapOption.value}>{snapOption.label}</option>)}
                  </select>
                </label>
              )}
              {appConfig.controls.enableJsonImport && (
                <>
                  <button type="button" className="export-menu-action" onClick={() => fileInputRef.current?.click()}><Upload size={16} /><span>Import JSON</span></button>
                  <input ref={fileInputRef} className="hidden-input" type="file" accept="application/json" onChange={onImport} />
                </>
              )}
              {appConfig.controls.enableJsonExport && <button type="button" className="export-menu-action" onClick={onExport}><Download size={16} /><span>Export JSON</span></button>}
              {appConfig.controls.enablePdfDownload && (
                <>
                  <label className="export-menu-row export-menu-select">
                    <span>PDF pages wide</span>
                    <select aria-label="PDF pages wide" value={pdfPagesWide} onChange={(event) => onPdfPagesWideChange(Number(event.target.value))}>
                      {[1, 2, 3, 4].map((pagesWide) => <option key={pagesWide} value={pagesWide}>{pagesWide} page{pagesWide === 1 ? '' : 's'} wide</option>)}
                    </select>
                  </label>
                  <button type="button" className="export-menu-action" onClick={onExportPdf}><FileDown size={16} /><span>Download PDF</span></button>
                </>
              )}
            </div>
          </details>
        </div>
      </section>
      {showTemplateDrawer && (
        <div className="template-drawer-layer">
          <button type="button" className="template-drawer-backdrop" onClick={() => setShowTemplateDrawer(false)} aria-label="Close templates" />
          <aside className="template-drawer" role="dialog" aria-modal="true" aria-labelledby="template-drawer-title">
            <div className="template-drawer-header">
              <div>
                <p className="eyebrow">Roadmap starter kits</p>
                <h2 id="template-drawer-title">Templates</h2>
              </div>
              <button type="button" className="icon-button" onClick={() => setShowTemplateDrawer(false)} title="Close templates" aria-label="Close templates"><X size={19} /></button>
            </div>
            <p className="template-drawer-intro">Choose a starting point, then tune the roadmap to fit your work.</p>
            <div className="template-card-list">
              {templateOptions.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  className={`template-card${template.id === selectedTemplateId ? ' selected' : ''}`}
                  onClick={() => onTemplateChange(template.id)}
                  aria-pressed={template.id === selectedTemplateId}
                >
                  <span className="template-preview" aria-hidden="true">
                    {template.lanes.map((lane, laneIndex) => (
                      <span className="template-preview-row" key={lane.id}>
                        <span className="template-preview-label">{lane.name}</span>
                        <span className="template-preview-track">
                          {template.tasks.filter((task) => task.laneId === lane.id).map((task) => (
                            <span
                              className="template-preview-task"
                              key={task.title}
                              style={{ left: `${Math.min(task.startDay / (template.monthSpan * 30) * 100, 92)}%`, width: `${Math.max(Math.min(task.duration / (template.monthSpan * 30) * 100, 48), 8)}%`, backgroundColor: task.color }}
                            />
                          ))}
                        </span>
                        <span className="template-preview-index">{String(laneIndex + 1).padStart(2, '0')}</span>
                      </span>
                    ))}
                  </span>
                  <span className="template-card-copy">
                    <strong>{template.name}</strong>
                    <span>{template.lanes.length} lanes / {template.monthSpan} months</span>
                  </span>
                  {template.id === selectedTemplateId && <span className="template-card-check">Selected</span>}
                </button>
              ))}
            </div>
            <div className="template-drawer-footer">
              <label className="year-field">
                <span>Start</span>
                <input type="month" value={getMonthInputValue(timelineRangeSelection.start)} onChange={(event) => onTimelineStartChange(event.target.value)} />
              </label>
              <button type="button" className="template-load-button" onClick={() => { onApplyTemplate(selectedTemplateId, getMonthInputValue(timelineRangeSelection.start)); setShowTemplateDrawer(false); }}>
                Use template
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}