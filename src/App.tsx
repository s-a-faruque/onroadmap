import { ChangeEvent, PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  dateToDay,
  dayToDate,
  getTimelineEnd,
  getTimelineStart,
  getYearDayCount,
  monthSegments,
  quarterSegments,
  snapDay,
  weekSegments,
  daySegments,
} from './dateMath';
import { appConfig } from './appConfig';
import { localRoadmapStore } from './storage';
import { loadPublicRoadmap } from './cloudRoadmapStore';
import type { RoadmapState, RoadmapTask, SnapMode, TimelineDesign, TimelineView } from './types';
import { PlannerHeader } from './components/PlannerHeader';
import { DragMode, RoadmapTimeline } from './components/RoadmapTimeline';
import { LandingPageTW } from './components/LandingPageTW';
import { TemplatesPage } from './components/TemplatesPage';
import { TaskInventory } from './components/TaskInventory';
import { Analytics } from '@vercel/analytics/react';
import { ROADMAP_TEMPLATES, buildRoadmapFromTemplate } from './templates';

const TIMELINE_RANGE_STORAGE_KEY = 'onroadmap.timelineRange.v1';
const THEME_STORAGE_KEY = 'onroadmap.theme.v1';
const TIMELINE_DESIGN_STORAGE_KEY = 'onroadmap.timelineDesign.v1';
const MAX_UNDO_STEPS = 50;

function getSharedTokenFromLocation() {
  const sharedPathMatch = window.location.pathname.match(/^\/shared\/([^/]+)\/?$/);
  if (sharedPathMatch) {
    return decodeURIComponent(sharedPathMatch[1]);
  }

  if (window.location.hash.startsWith('#shared=')) {
    return window.location.hash.slice('#shared='.length);
  }

  return null;
}

function redirectLegacyShareUrl(sharedToken: string) {
  window.history.replaceState({}, '', `/shared/${encodeURIComponent(sharedToken)}`);
}

const CURRENT_YEAR = new Date().getFullYear();
const COLORS = ['#f25f5c', '#247ba0', '#70c1b3', '#f3b562', '#7f5af0', '#2cb67d'];

interface DragSession {
  mode: DragMode;
  taskId: string;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  originalStartDay: number;
  originalEndDay: number;
  originalLaneIndex: number;
}

interface TimelineMonth {
  year: number;
  monthIndex: number;
}

interface TimelineRange {
  start: TimelineMonth;
  end: TimelineMonth;
}

function createInitialState(year: number, startMonth: number, monthSpan: number): RoadmapState {
  return {
    title: 'Roadmap',
    subtitle: 'ACME Engineering Team',
    year,
    lanes: [
      { id: 'engineering', name: 'Engineering' },
      { id: 'updating', name: 'Updating' },
      { id: 'security', name: 'Security' },
    ],
    tasks: [
      {
        id: 'task-1',
        title: 'Frontend foundation',
        laneId: 'engineering',
        startDate: dayToDate(7, year, startMonth, monthSpan),
        endDate: dayToDate(73, year, startMonth, monthSpan),
        color: '#247ba0',
        tags: ['Frontend', 'Q1 Core'],
      },
      {
        id: 'task-2',
        title: 'Content refresh cycle',
        laneId: 'updating',
        startDate: dayToDate(91, year, startMonth, monthSpan),
        endDate: dayToDate(165, year, startMonth, monthSpan),
        color: '#f3b562',
        tags: ['Docs', 'Release'],
      },
      {
        id: 'task-3',
        title: 'Threat model review',
        laneId: 'security',
        startDate: dayToDate(189, year, startMonth, monthSpan),
        endDate: dayToDate(275, year, startMonth, monthSpan),
        color: '#2cb67d',
        tags: ['Security', 'Design'],
      },
    ],
  };
}

function normalizeRoadmap(roadmap: RoadmapState): RoadmapState {
  return {
    ...roadmap,
    title: roadmap.title?.trim() || 'Roadmap',
    subtitle: roadmap.subtitle?.trim() || 'ACME Engineering Team',
  };
}

function createTask(year: number, startMonth: number, monthSpan: number, laneId: string, index: number, startDay?: number, endDay?: number): RoadmapTask {
  const taskStartDay = startDay ?? 14 + index * 21;
  const taskEndDay = endDay ?? taskStartDay + 28;

  return {
    id: crypto.randomUUID(),
    title: 'New task',
    laneId,
    startDate: dayToDate(taskStartDay, year, startMonth, monthSpan),
    endDate: dayToDate(taskEndDay, year, startMonth, monthSpan),
    color: COLORS[index % COLORS.length],
    tags: ['Label'],
  };
}

function formatTimelineRange(year: number, startMonth: number, monthSpan: number) {
  const start = getTimelineStart(year, startMonth);
  const end = getTimelineEnd(year, startMonth, monthSpan);
  const formatOptions: Intl.DateTimeFormatOptions = { month: 'short', year: 'numeric', timeZone: 'UTC' };

  return `${start.toLocaleString('en', formatOptions)} - ${end.toLocaleString('en', formatOptions)}`;
}

function getTimelineMonthSpan(startYear: number) {
  const endYear = appConfig.timeline.endYear;

  if (endYear && endYear >= startYear) {
    return (endYear - startYear + 1) * 12;
  }

  return Math.max(appConfig.timeline.monthSpan, 1);
}

function getConfiguredTimelineRange(): TimelineRange {
  const startYear = appConfig.timeline.startYear || CURRENT_YEAR;
  const startMonth = Math.min(Math.max(appConfig.timeline.startMonth - 1, 0), 11);
  const end = getTimelineEnd(startYear, startMonth, getTimelineMonthSpan(startYear));

  return {
    start: { year: startYear, monthIndex: startMonth },
    end: { year: end.getUTCFullYear(), monthIndex: end.getUTCMonth() },
  };
}

function getInitialTimelineRange() {
  const storedRange = window.localStorage.getItem(TIMELINE_RANGE_STORAGE_KEY);

  if (storedRange) {
    try {
      const parsedRange = JSON.parse(storedRange) as TimelineRange;

      if (Number.isInteger(parsedRange.start.year) && Number.isInteger(parsedRange.end.year)) {
        return parsedRange;
      }
    } catch {
      return getConfiguredTimelineRange();
    }
  }

  return getConfiguredTimelineRange();
}

function getMonthInputValue(month: TimelineMonth) {
  return `${month.year}-${String(month.monthIndex + 1).padStart(2, '0')}`;
}

function parseMonthInputValue(value: string): TimelineMonth {
  const [year, month] = value.split('-').map(Number);

  return { year, monthIndex: month - 1 };
}

function getMonthSpanFromRange(range: TimelineRange) {
  const startValue = range.start.year * 12 + range.start.monthIndex;
  const endValue = range.end.year * 12 + range.end.monthIndex;

  return Math.max(endValue - startValue + 1, 1);
}

function isValidTimelineRange(range: TimelineRange) {
  const startValue = range.start.year * 12 + range.start.monthIndex;
  const endValue = range.end.year * 12 + range.end.monthIndex;

  return endValue >= startValue;
}

function App() {
  const initialSharedToken = getSharedTokenFromLocation();
  if (window.location.hash.startsWith('#shared=') && initialSharedToken) {
    redirectLegacyShareUrl(initialSharedToken);
  }
  const sharedToken = getSharedTokenFromLocation();
  const [showLanding, setShowLanding] = useState(() => !sharedToken && window.location.hash !== '#planner');
  const [isReadOnlyShare, setIsReadOnlyShare] = useState(Boolean(sharedToken));
  const [sharedLoadError, setSharedLoadError] = useState('');
  const [timelineRangeSelection, setTimelineRangeSelection] = useState(getInitialTimelineRange);
  const timelineStartMonth = timelineRangeSelection.start.monthIndex;
  const configuredStartYear = timelineRangeSelection.start.year;
  const timelineMonthSpan = getMonthSpanFromRange(timelineRangeSelection);
  const [roadmap, setRoadmap] = useState<RoadmapState>(() => {
    const storedRoadmap = localRoadmapStore.load();

    return storedRoadmap ? normalizeRoadmap(storedRoadmap) : createInitialState(configuredStartYear, timelineStartMonth, timelineMonthSpan);
  });
  const roadmapRef = useRef(roadmap);
  const undoStackRef = useRef<RoadmapState[]>([]);
  const [timelineView, setTimelineView] = useState<TimelineView>('week');
  const [snapMode, setSnapMode] = useState<SnapMode>(appConfig.controls.defaultSnapMode);
  const [printFriendly, setPrintFriendly] = useState(false);
  const [selectedThemeId, setSelectedThemeId] = useState(() => {
    const storedThemeId = window.localStorage.getItem(THEME_STORAGE_KEY);
    return storedThemeId && appConfig.themes.options.some((theme) => theme.id === storedThemeId)
      ? storedThemeId
      : appConfig.themes.defaultTheme;
  });
  const [timelineDesign, setTimelineDesign] = useState<TimelineDesign>(() => (
    window.localStorage.getItem(TIMELINE_DESIGN_STORAGE_KEY) === 'flow' ? 'flow' : 'classic'
  ));
  const [pdfPagesWide, setPdfPagesWide] = useState(1);
  const [dragSession, setDragSession] = useState<DragSession | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  const enabledSnapModes = appConfig.controls.snapModes;
  const activeSnapMode = enabledSnapModes.some((snapOption) => snapOption.value === snapMode)
    ? snapMode
    : appConfig.controls.defaultSnapMode;
  const activeTheme = appConfig.themes.options.find((theme) => theme.id === selectedThemeId)
    ?? appConfig.themes.options.find((theme) => theme.id === appConfig.themes.defaultTheme)
    ?? appConfig.themes.options[0];
  const timelineYear = configuredStartYear;
  const timelineRange = formatTimelineRange(timelineYear, timelineStartMonth, timelineMonthSpan);
  const dayCount = getYearDayCount(timelineYear, timelineStartMonth, timelineMonthSpan);
  const dayWidth = timelineView === 'week' ? 18 : timelineView === 'day' ? 13.8 : 4.8;
  const timelineWidth = dayCount * dayWidth;
  const months = useMemo(() => monthSegments(timelineYear, timelineStartMonth, timelineMonthSpan), [timelineYear, timelineStartMonth, timelineMonthSpan]);
  const quarters = useMemo(() => quarterSegments(timelineYear, timelineStartMonth, timelineMonthSpan), [timelineYear, timelineStartMonth, timelineMonthSpan]);
  const weeks = useMemo(() => weekSegments(timelineYear, timelineStartMonth, timelineMonthSpan), [timelineYear, timelineStartMonth, timelineMonthSpan]);
  const days = useMemo(() => daySegments(timelineYear, timelineStartMonth, timelineMonthSpan), [timelineYear, timelineStartMonth, timelineMonthSpan]);
  useEffect(() => {
    function syncRoute() {
      const isTemplatesPage = window.location.pathname.replace(/\/+$/, '') === '/templates';
      const nextSharedToken = getSharedTokenFromLocation();
      if (window.location.hash.startsWith('#shared=') && nextSharedToken) {
        redirectLegacyShareUrl(nextSharedToken);
      }
      setIsReadOnlyShare(Boolean(nextSharedToken));
      setShowLanding(!isTemplatesPage && !nextSharedToken && window.location.hash !== '#planner');
    }

    window.addEventListener('hashchange', syncRoute);
    window.addEventListener('popstate', syncRoute);

    return () => {
      window.removeEventListener('hashchange', syncRoute);
      window.removeEventListener('popstate', syncRoute);
    };
  }, []);

  useEffect(() => {
    if (!sharedToken) {
      return;
    }

    setSharedLoadError('');
    loadPublicRoadmap(sharedToken)
      .then((plan) => {
        const publicRoadmap = normalizeRoadmap(plan.payload);
        roadmapRef.current = publicRoadmap;
        setRoadmap(publicRoadmap);
      })
      .catch((error) => {
        setSharedLoadError(error instanceof Error ? error.message : 'Unable to load shared plan.');
      });
  }, [sharedToken]);

  useEffect(() => {
    if (!isReadOnlyShare) {
      localRoadmapStore.save(roadmap);
    }
  }, [roadmap, isReadOnlyShare]);

  useEffect(() => {
    function handleUndoShortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z' && !event.shiftKey) {
        event.preventDefault();
        undoRoadmap();
      }
    }

    window.addEventListener('keydown', handleUndoShortcut);
    return () => window.removeEventListener('keydown', handleUndoShortcut);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(TIMELINE_RANGE_STORAGE_KEY, JSON.stringify(timelineRangeSelection));
  }, [timelineRangeSelection]);

  useEffect(() => {
    Object.entries({
      '--app-bg': activeTheme.colors.appBackground,
      '--ink': activeTheme.colors.ink,
      '--ink-rgb': activeTheme.colors.inkRgb,
      '--muted': activeTheme.colors.muted,
      '--paper': activeTheme.colors.paper,
      '--paper-rgb': activeTheme.colors.paperRgb,
      '--line': activeTheme.colors.line,
      '--line-rgb': activeTheme.colors.lineRgb,
      '--track': activeTheme.colors.track,
      '--accent': activeTheme.colors.accent,
      '--green': activeTheme.colors.green,
      '--green-rgb': activeTheme.colors.greenRgb,
      '--shadow': activeTheme.colors.shadow,
    }).forEach(([property, value]) => {
      document.documentElement.style.setProperty(property, value);
    });
  }, [activeTheme]);

  useEffect(() => {
    window.localStorage.setItem(THEME_STORAGE_KEY, selectedThemeId);
  }, [selectedThemeId]);

  useEffect(() => {
    window.localStorage.setItem(TIMELINE_DESIGN_STORAGE_KEY, timelineDesign);
  }, [timelineDesign]);

  useEffect(() => {
    if (!dragSession) {
      return;
    }

    const activeDragSession = dragSession;

    function handlePointerMove(event: PointerEvent) {
      updateRoadmap((currentRoadmap) => {
        const horizontalDelta = Math.round((event.clientX - activeDragSession.startClientX) / dayWidth);
        const verticalDelta = Math.round((event.clientY - activeDragSession.startClientY) / 86);
        const nextLaneIndex = Math.min(
          Math.max(activeDragSession.originalLaneIndex + verticalDelta, 0),
          currentRoadmap.lanes.length - 1,
        );

        return {
          ...currentRoadmap,
          tasks: currentRoadmap.tasks.map((task) => {
            if (task.id !== activeDragSession.taskId) {
              return task;
            }

            const taskDuration = activeDragSession.originalEndDay - activeDragSession.originalStartDay;
            let nextStartDay = activeDragSession.originalStartDay;
            let nextEndDay = activeDragSession.originalEndDay;

            if (activeDragSession.mode === 'move') {
              nextStartDay = snapDay(activeDragSession.originalStartDay + horizontalDelta, timelineYear, activeSnapMode, timelineStartMonth, timelineMonthSpan);
              nextEndDay = nextStartDay + taskDuration;

              if (nextEndDay > dayCount - 1) {
                nextEndDay = dayCount - 1;
                nextStartDay = Math.max(0, nextEndDay - taskDuration);
              }
            }

            if (activeDragSession.mode === 'resize-left') {
              nextStartDay = Math.min(
                snapDay(activeDragSession.originalStartDay + horizontalDelta, timelineYear, activeSnapMode, timelineStartMonth, timelineMonthSpan),
                activeDragSession.originalEndDay - 1,
              );
            }

            if (activeDragSession.mode === 'resize-right') {
              nextEndDay = Math.max(
                snapDay(activeDragSession.originalEndDay + horizontalDelta, timelineYear, activeSnapMode, timelineStartMonth, timelineMonthSpan),
                activeDragSession.originalStartDay + 1,
              );
            }

            return {
              ...task,
              laneId: currentRoadmap.lanes[nextLaneIndex].id,
              startDate: dayToDate(nextStartDay, timelineYear, timelineStartMonth, timelineMonthSpan),
              endDate: dayToDate(nextEndDay, timelineYear, timelineStartMonth, timelineMonthSpan),
            };
          }),
        };
      }, false);
    }

    function handlePointerUp(event: PointerEvent) {
      if (event.pointerId === activeDragSession.pointerId) {
        setDragSession(null);
      }
    }

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [activeSnapMode, dayCount, dayWidth, dragSession, timelineMonthSpan, timelineStartMonth, timelineYear]);

  if (window.location.pathname.replace(/\/+$/, '') === '/templates') {
    return (
      <TemplatesPage
        templates={ROADMAP_TEMPLATES}
        initialStartValue={getMonthInputValue(timelineRangeSelection.start)}
        onUseTemplate={(templateId, startValue) => {
          applyTemplate(templateId, startValue);
          window.history.pushState({}, '', '/#planner');
          setShowLanding(false);
        }}
      />
    );
  }

  if (showLanding) {
    return <LandingPageTW onOpenPlanner={() => { window.location.hash = 'planner'; }} />;
  }

  if (isReadOnlyShare) {
    return (
      <main className="app-shell shared-roadmap-shell">
        <section className="shared-roadmap-banner" aria-label="Shared roadmap">
          <div>
            <p>Shared view</p>
            <strong>{roadmap.title}</strong>
          </div>
          <div className="shared-roadmap-controls">
            <div className="segmented" aria-label="Timeline view">
              {(['month', 'week', 'day'] as TimelineView[]).map((view) => (
                <button key={view} className={timelineView === view ? 'active' : ''} type="button" onClick={() => setTimelineView(view)}>
                  {view}
                </button>
              ))}
            </div>
            {appConfig.controls.enablePdfDownload && (
              <label className="pdf-page-break-control">
                <span>PDF pages wide</span>
                <select aria-label="PDF pages wide" value={pdfPagesWide} onChange={(event) => setPdfPagesWide(Number(event.target.value))}>
                  {[1, 2, 3, 4].map((pagesWide) => <option key={pagesWide} value={pagesWide}>{pagesWide} page{pagesWide === 1 ? '' : 's'} wide</option>)}
                </select>
              </label>
            )}
            {appConfig.controls.enablePdfDownload && (
              <button type="button" className="icon-button pdf-download-button" onClick={exportRoadmapPdf}>PDF</button>
            )}
            {sharedLoadError ? <span role="alert">{sharedLoadError}</span> : <span>Read-only</span>}
          </div>
        </section>
        <RoadmapTimeline
          roadmap={roadmap}
          timelineDesign={timelineDesign}
          timelineRef={timelineRef}
          timelineView={timelineView}
          snapMode={activeSnapMode}
          timelineYear={timelineYear}
          timelineStartMonth={timelineStartMonth}
          timelineMonthSpan={timelineMonthSpan}
          dayCount={dayCount}
          dayWidth={dayWidth}
          timelineWidth={timelineWidth}
          months={months}
          quarters={quarters}
          weeks={weeks}
          days={days}
          draggingTaskId={undefined}
          printFriendly={true}
          readOnly={true}
          onStartDrag={() => undefined}
          onTaskChange={() => undefined}
          onDeleteTask={() => undefined}
          onLaneChange={() => undefined}
          onDeleteLane={() => undefined}
          onAddTask={() => undefined}
          onCreateTask={() => undefined}
        />
      </main>
    );
  }

  function startDrag(event: ReactPointerEvent, task: RoadmapTask, mode: DragMode) {
    event.currentTarget.setPointerCapture(event.pointerId);
    recordUndoStep();
    const laneIndex = roadmap.lanes.findIndex((lane) => lane.id === task.laneId);

    setDragSession({
      mode,
      taskId: task.id,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      originalStartDay: dateToDay(task.startDate, timelineYear, timelineStartMonth, timelineMonthSpan),
      originalEndDay: dateToDay(task.endDate, timelineYear, timelineStartMonth, timelineMonthSpan),
      originalLaneIndex: laneIndex,
    });
  }

  function updateTask(taskId: string, updates: Partial<RoadmapTask>) {
    updateRoadmap((currentRoadmap) => ({
      ...currentRoadmap,
      tasks: currentRoadmap.tasks.map((task) => (task.id === taskId ? { ...task, ...updates } : task)),
    }));
  }

  function deleteTask(taskId: string) {
    const task = roadmap.tasks.find((currentTask) => currentTask.id === taskId);

    if (!task || !window.confirm(`Delete ${task.title || 'this task'}?`)) {
      return;
    }

    updateRoadmap((currentRoadmap) => ({
      ...currentRoadmap,
      tasks: currentRoadmap.tasks.filter((currentTask) => currentTask.id !== taskId),
    }));
  }

  function clearTasks() {
    if (roadmap.tasks.length === 0 || !window.confirm('Clear all tasks from this roadmap?')) {
      return;
    }

    updateRoadmap((currentRoadmap) => ({ ...currentRoadmap, tasks: [] }));
  }

  function addLane() {
    const laneName = `Lane ${roadmap.lanes.length + 1}`;
    const lane = { id: crypto.randomUUID(), name: laneName };

    updateRoadmap((currentRoadmap) => ({
      ...currentRoadmap,
      lanes: [...currentRoadmap.lanes, lane],
      tasks: [...currentRoadmap.tasks, createTask(timelineYear, timelineStartMonth, timelineMonthSpan, lane.id, currentRoadmap.tasks.length)],
    }));
  }

  function deleteLane(laneId: string) {
    const lane = roadmap.lanes.find((currentLane) => currentLane.id === laneId);
    const taskCount = roadmap.tasks.filter((task) => task.laneId === laneId).length;

    if (!lane || roadmap.lanes.length === 1 || !window.confirm(`Delete ${lane.name} and its ${taskCount} task${taskCount === 1 ? '' : 's'}?`)) {
      return;
    }

    updateRoadmap((currentRoadmap) => ({
      ...currentRoadmap,
      lanes: currentRoadmap.lanes.filter((currentLane) => currentLane.id !== laneId),
      tasks: currentRoadmap.tasks.filter((task) => task.laneId !== laneId),
    }));
  }

  function addTask(laneId: string, startDay?: number, endDay?: number) {
    updateRoadmap((currentRoadmap) => ({
      ...currentRoadmap,
      tasks: [...currentRoadmap.tasks, createTask(timelineYear, timelineStartMonth, timelineMonthSpan, laneId, currentRoadmap.tasks.length, startDay, endDay)],
    }));
  }

  function exportRoadmap() {
    const payload = JSON.stringify(roadmap, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `onroadmap-${timelineYear}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function loadLogoImage() {
    return new Promise<HTMLImageElement>((resolve, reject) => {
      const logo = new Image();
      logo.onload = () => resolve(logo);
      logo.onerror = () => reject(new Error('Unable to load roadmap logo'));
      logo.src = appConfig.branding.logo;
    });
  }

  async function exportTaskTable() {
    const tableElement = document.querySelector('.task-table-panel') as HTMLElement | null;

    if (!tableElement) {
      return;
    }

    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);
      const tableWidth = Math.max(
        tableElement.scrollWidth,
        tableElement.querySelector('table')?.scrollWidth ?? 0,
      );
      const [canvas, logo] = await Promise.all([
        html2canvas(tableElement, {
          backgroundColor: activeTheme.colors.paper,
          scale: 2,
          useCORS: true,
          width: tableWidth,
          onclone: (documentClone) => {
            const clonedPanel = documentClone.querySelector('.task-table-panel') as HTMLElement | null;
            const clonedTableScroll = clonedPanel?.querySelector('.task-table-scroll') as HTMLElement | null;

            if (clonedPanel && clonedTableScroll) {
              clonedPanel.style.width = `${tableWidth}px`;
              clonedTableScroll.style.overflow = 'visible';
            }
          },
        }),
        appConfig.branding.enabled ? loadLogoImage() : Promise.resolve(null),
      ]);
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 24;
      const logoSize = 22;
      const brandingOffset = logo ? logoSize + 10 : 0;
      const titleX = margin + brandingOffset;
      const titleWidth = pageWidth - margin * 2 - brandingOffset;
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(16);
      const titleLines = pdf.splitTextToSize(
        appConfig.branding.enabled ? `${appConfig.branding.name} task inventory` : 'Roadmap task inventory',
        titleWidth,
      );
      const titleHeight = Math.max(30, titleLines.length * 19 + 8);
      const availableWidth = pageWidth - margin * 2;
      const availableHeight = pageHeight - margin * 2 - titleHeight;
      const imageScale = Math.min(availableWidth / canvas.width, availableHeight / canvas.height);
      const imageWidth = canvas.width * imageScale;
      const imageHeight = canvas.height * imageScale;
      const image = canvas.toDataURL('image/png');

      pdf.setTextColor(23, 33, 29);
      if (logo) {
        pdf.addImage(logo, 'PNG', margin, margin - 4, logoSize, logoSize);
      }
      pdf.text(titleLines, titleX, margin + 16);
      pdf.addImage(image, 'PNG', margin + (availableWidth - imageWidth) / 2, margin + titleHeight, imageWidth, imageHeight);
      pdf.save(`flash-roadmap-tasks-${timelineYear}.pdf`);
    } catch (error) {
      console.error('Unable to export task table PDF', error);
    }
  }

  async function exportRoadmapPdf() {
    setPrintFriendly(true);
    await new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve()));
    });

    const timelineElement = timelineRef.current;

    if (!timelineElement) {
      return;
    }

    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);
      const [canvas, logo] = await Promise.all([
        html2canvas(timelineElement, {
          backgroundColor: activeTheme.colors.paper,
          scale: 2,
          useCORS: true,
          width: timelineElement.scrollWidth,
          height: timelineElement.scrollHeight,
          windowWidth: timelineElement.scrollWidth,
          windowHeight: timelineElement.scrollHeight,
        }),
        appConfig.branding.enabled ? loadLogoImage() : Promise.resolve(null),
      ]);
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 28;
      const logoSize = 26;
      const brandingOffset = logo ? logoSize + 12 : 0;
      const textX = margin + brandingOffset;
      const textWidth = pageWidth - margin * 2 - brandingOffset;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(107, 114, 128);
      const subtitleLines = pdf.splitTextToSize(roadmap.subtitle || ' ', textWidth);
      pdf.text(subtitleLines, textX, margin + 11);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(18);
      pdf.setTextColor(23, 33, 29);
      const titleLines = pdf.splitTextToSize(roadmap.title || ' ', textWidth);
      const titleY = margin + 32 + Math.max(subtitleLines.length - 1, 0) * 11;
      const titleHeight = Math.max(42, titleY - margin + (titleLines.length - 1) * 21 + 10);
      const availableWidth = pageWidth - margin * 2;
      const availableHeight = pageHeight - margin * 2 - titleHeight;
      const watermark = appConfig.controls.pdfWatermark;
      const pageColumns = pdfPagesWide;
      const sourcePageWidth = canvas.width / pageColumns;
      const imageScale = availableWidth / sourcePageWidth;
      const sourcePageHeight = availableHeight / imageScale;
      const pageRows = Math.ceil(canvas.height / sourcePageHeight);

      for (let row = 0; row < pageRows; row += 1) {
        for (let column = 0; column < pageColumns; column += 1) {
          if (row > 0 || column > 0) {
            pdf.addPage();
          }
          if (logo) {
            pdf.addImage(logo, 'PNG', margin, margin - 6, logoSize, logoSize);
          }
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(9);
          pdf.setTextColor(107, 114, 128);
          pdf.text(subtitleLines, textX, margin + 11);
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(18);
          pdf.setTextColor(23, 33, 29);
          pdf.text(titleLines, textX, titleY);

          const sourceX = column * sourcePageWidth;
          const sourceY = row * sourcePageHeight;
          const sourceWidth = Math.min(sourcePageWidth, canvas.width - sourceX);
          const sourceHeight = Math.min(sourcePageHeight, canvas.height - sourceY);
          const pageCanvas = document.createElement('canvas');
          pageCanvas.width = Math.ceil(sourceWidth);
          pageCanvas.height = Math.ceil(sourceHeight);
          const pageContext = pageCanvas.getContext('2d');

          if (!pageContext) {
            throw new Error('Unable to create PDF page canvas');
          }

          pageContext.drawImage(canvas, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, pageCanvas.width, pageCanvas.height);
          const imageWidth = sourceWidth * imageScale;
          const imageHeight = sourceHeight * imageScale;
          const imageX = margin;
          const imageY = margin + titleHeight;
          pdf.addImage(pageCanvas.toDataURL('image/png'), 'PNG', imageX, imageY, imageWidth, imageHeight, undefined, 'FAST');

          if (watermark.enabled) {
            const watermarkColumns = Math.max(watermark.columns, 1);
            const watermarkRows = Math.max(watermark.rows, 1);
            pdf.setGState(pdf.GState({ opacity: watermark.opacity }));
            pdf.setTextColor(120, 120, 120);
            pdf.setFontSize(watermark.fontSize);
            for (let watermarkRow = 0; watermarkRow < watermarkRows; watermarkRow += 1) {
              for (let watermarkColumn = 0; watermarkColumn < watermarkColumns; watermarkColumn += 1) {
                pdf.text(
                  watermark.text,
                  (pageWidth * (watermarkColumn + 0.5)) / watermarkColumns,
                  (pageHeight * (watermarkRow + 0.5)) / watermarkRows,
                  { align: 'center', angle: watermark.angle },
                );
              }
            }
            pdf.setGState(pdf.GState({ opacity: 1 }));
          }

          pdf.setDrawColor(156, 163, 175);
          pdf.setLineWidth(1);
          pdf.rect(imageX, imageY, imageWidth, imageHeight);
          pdf.rect(14, 14, pageWidth - 28, pageHeight - 28);
        }
      }
      pdf.save(`flash-roadmap-${timelineYear}.pdf`);
    } catch (error) {
      console.error('Unable to export roadmap PDF', error);
    }
  }

  function importRoadmap(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    file.text().then((text) => {
      const nextRoadmap = JSON.parse(text) as RoadmapState;

      if (!nextRoadmap.year || !Array.isArray(nextRoadmap.lanes) || !Array.isArray(nextRoadmap.tasks)) {
        throw new Error('Invalid roadmap payload');
      }

      updateRoadmap(() => normalizeRoadmap(nextRoadmap));
      event.target.value = '';
    });
  }

  function updateTimelineStart(value: string) {
    const nextStart = parseMonthInputValue(value);

    setTimelineRangeSelection((currentRange) => {
      const nextRange = { ...currentRange, start: nextStart };

      return isValidTimelineRange(nextRange) ? nextRange : { start: nextStart, end: nextStart };
    });
  }

  function updateTimelineEnd(value: string) {
    const nextEnd = parseMonthInputValue(value);

    setTimelineRangeSelection((currentRange) => {
      const nextRange = { ...currentRange, end: nextEnd };

      return isValidTimelineRange(nextRange) ? nextRange : { start: nextEnd, end: nextEnd };
    });
  }

  function applyTemplate(templateId: string, startValue: string) {
    const template = ROADMAP_TEMPLATES.find((candidate) => candidate.id === templateId) ?? ROADMAP_TEMPLATES[0];
    const nextStart = parseMonthInputValue(startValue);
    const nextEnd = {
      year: nextStart.year,
      monthIndex: ((nextStart.monthIndex + template.monthSpan - 1) % 12 + 12) % 12,
    };
    const nextEndYear = nextStart.year + Math.floor((nextStart.monthIndex + template.monthSpan - 1) / 12);

    setTimelineRangeSelection({
      start: nextStart,
      end: { year: nextEndYear, monthIndex: nextEnd.monthIndex },
    });
    updateRoadmap(() => buildRoadmapFromTemplate(template, nextStart.year, nextStart.monthIndex), true);
  }

  function recordUndoStep() {
    undoStackRef.current = [...undoStackRef.current.slice(-(MAX_UNDO_STEPS - 1)), roadmapRef.current];
  }

  function updateRoadmap(updater: (currentRoadmap: RoadmapState) => RoadmapState, recordHistory = true) {
    if (recordHistory) {
      recordUndoStep();
    }
    const nextRoadmap = updater(roadmapRef.current);
    roadmapRef.current = nextRoadmap;
    setRoadmap(nextRoadmap);
  }

  function undoRoadmap() {
    const previousRoadmap = undoStackRef.current.pop();

    if (!previousRoadmap) {
      return;
    }

    roadmapRef.current = previousRoadmap;
    setRoadmap(previousRoadmap);
  }

  return (
    <main className="app-shell">
      <PlannerHeader
        roadmap={roadmap}
        timelineRangeSelection={timelineRangeSelection}
        timelineView={timelineView}
        activeSnapMode={activeSnapMode}
        pdfPagesWide={pdfPagesWide}
        fileInputRef={fileInputRef}
        getMonthInputValue={getMonthInputValue}
        selectedThemeId={selectedThemeId}
        onToggleTheme={() => setSelectedThemeId((currentThemeId) => currentThemeId === 'midnight' ? 'cool-light' : 'midnight')}
        timelineDesign={timelineDesign}
        onToggleTimelineDesign={() => setTimelineDesign((currentDesign) => currentDesign === 'classic' ? 'flow' : 'classic')}
        printFriendly={printFriendly}
        onTitleChange={(title) => updateRoadmap((currentRoadmap) => ({ ...currentRoadmap, title }))}
        onSubtitleChange={(subtitle) => updateRoadmap((currentRoadmap) => ({ ...currentRoadmap, subtitle }))}
        onTimelineStartChange={updateTimelineStart}
        onTimelineEndChange={updateTimelineEnd}
        onViewChange={setTimelineView}
        onSnapModeChange={setSnapMode}
        onPdfPagesWideChange={setPdfPagesWide}
        onTogglePrintFriendly={() => setPrintFriendly((current) => !current)}
        onUndo={undoRoadmap}
        canUndo={undoStackRef.current.length > 0}
        onAddTask={() => {
          const defaultLane = roadmap.lanes[0];
          if (defaultLane) {
            addTask(defaultLane.id);
          }
        }}
        onAddLane={addLane}
        onExport={exportRoadmap}
        onExportPdf={exportRoadmapPdf}
        onImport={importRoadmap}
        onCloudLoad={(cloudRoadmap) => updateRoadmap(() => normalizeRoadmap(cloudRoadmap), false)}
      />
      <RoadmapTimeline
        roadmap={roadmap}
        timelineDesign={timelineDesign}
        timelineRef={timelineRef}
        timelineView={timelineView}
        snapMode={activeSnapMode}
        timelineYear={timelineYear}
        timelineStartMonth={timelineStartMonth}
        timelineMonthSpan={timelineMonthSpan}
        dayCount={dayCount}
        dayWidth={dayWidth}
        timelineWidth={timelineWidth}
        months={months}
        quarters={quarters}
        weeks={weeks}
        days={days}
        draggingTaskId={dragSession?.taskId}
        printFriendly={printFriendly}
        onStartDrag={startDrag}
        onTaskChange={updateTask}
        onDeleteTask={deleteTask}
        onLaneChange={(laneId, name) => updateRoadmap((currentRoadmap) => ({
          ...currentRoadmap,
          lanes: currentRoadmap.lanes.map((lane) => lane.id === laneId ? { ...lane, name } : lane),
        }))}
        onDeleteLane={deleteLane}
        onAddTask={addTask}
        onCreateTask={addTask}
      />
      <TaskInventory roadmap={roadmap} onTaskChange={updateTask} onDeleteTask={deleteTask} onClearTasks={clearTasks} onExport={exportTaskTable} />
      <Analytics />
    </main>
  );
}

export default App;
