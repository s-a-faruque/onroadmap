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
} from './dateMath';
import { appConfig } from './appConfig';
import { localRoadmapStore } from './storage';
import type { RoadmapState, RoadmapTask, SnapMode, TimelineView } from './types';
import { PlannerHeader } from './components/PlannerHeader';
import { DragMode, RoadmapTimeline } from './components/RoadmapTimeline';
import { LandingPage } from './components/LandingPage';
import { TaskInventory } from './components/TaskInventory';
import { Analytics } from '@vercel/analytics/react';

const TIMELINE_RANGE_STORAGE_KEY = 'onroadmap.timelineRange.v1';
const MAX_UNDO_STEPS = 50;

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

function createTask(year: number, startMonth: number, monthSpan: number, laneId: string, index: number): RoadmapTask {
  const startDay = 14 + index * 21;
  const endDay = startDay + 28;

  return {
    id: crypto.randomUUID(),
    title: 'New task',
    laneId,
    startDate: dayToDate(startDay, year, startMonth, monthSpan),
    endDate: dayToDate(endDay, year, startMonth, monthSpan),
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
  const [showLanding, setShowLanding] = useState(() => window.location.hash !== '#planner');
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
  const [timelineView, setTimelineView] = useState<TimelineView>('month');
  const [snapMode, setSnapMode] = useState<SnapMode>(appConfig.controls.defaultSnapMode);
  const [printFriendly, setPrintFriendly] = useState(false);
  const [dragSession, setDragSession] = useState<DragSession | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  const enabledSnapModes = appConfig.controls.snapModes;
  const activeSnapMode = enabledSnapModes.some((snapOption) => snapOption.value === snapMode)
    ? snapMode
    : appConfig.controls.defaultSnapMode;
  const activeTheme = appConfig.themes.options.find((theme) => theme.id === appConfig.themes.defaultTheme) ?? appConfig.themes.options[0];
  const timelineYear = configuredStartYear;
  const timelineRange = formatTimelineRange(timelineYear, timelineStartMonth, timelineMonthSpan);
  const dayCount = getYearDayCount(timelineYear, timelineStartMonth, timelineMonthSpan);
  const dayWidth = timelineView === 'week' ? 18 : 4.8;
  const timelineWidth = dayCount * dayWidth;
  const months = useMemo(() => monthSegments(timelineYear, timelineStartMonth, timelineMonthSpan), [timelineYear, timelineStartMonth, timelineMonthSpan]);
  const quarters = useMemo(() => quarterSegments(timelineYear, timelineStartMonth, timelineMonthSpan), [timelineYear, timelineStartMonth, timelineMonthSpan]);
  const weeks = useMemo(() => weekSegments(timelineYear, timelineStartMonth, timelineMonthSpan), [timelineYear, timelineStartMonth, timelineMonthSpan]);
  useEffect(() => {
    function handleHashChange() {
      setShowLanding(window.location.hash !== '#planner');
    }

    window.addEventListener('hashchange', handleHashChange);

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    localRoadmapStore.save(roadmap);
  }, [roadmap]);

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
      '--shadow': activeTheme.colors.shadow,
    }).forEach(([property, value]) => {
      document.documentElement.style.setProperty(property, value);
    });
  }, [activeTheme]);

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

  if (showLanding) {
    return <LandingPage onOpenPlanner={() => { window.location.hash = 'planner'; }} />;
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

  function addTask(laneId: string) {
    updateRoadmap((currentRoadmap) => ({
      ...currentRoadmap,
      tasks: [...currentRoadmap.tasks, createTask(timelineYear, timelineStartMonth, timelineMonthSpan, laneId, currentRoadmap.tasks.length)],
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
      const [canvas, logo] = await Promise.all([
        html2canvas(tableElement, {
          backgroundColor: activeTheme.colors.paper,
          scale: 2,
          useCORS: true,
        }),
        appConfig.branding.enabled ? loadLogoImage() : Promise.resolve(null),
      ]);
      const image = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 24;
      const titleHeight = 30;
      const logoSize = 22;
      const imageWidth = pageWidth - margin * 2;
      const imageHeight = Math.min((canvas.height * imageWidth) / canvas.width, pageHeight - margin * 2 - titleHeight);

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(16);
      pdf.setTextColor(23, 33, 29);
      if (logo) {
        pdf.addImage(logo, 'PNG', margin, margin - 4, logoSize, logoSize);
      }
      pdf.text(appConfig.branding.enabled ? `${appConfig.branding.name} task inventory` : 'Roadmap task inventory', margin + (logo ? logoSize + 10 : 0), margin + 16);
      pdf.addImage(image, 'PNG', margin, margin + titleHeight, imageWidth, imageHeight);
      pdf.save(`flash-roadmap-tasks-${timelineYear}.pdf`);
    } catch (error) {
      console.error('Unable to export task table PDF', error);
    }
  }

  async function exportRoadmapPdf() {
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
      const image = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 28;
      const titleHeight = 42;
      const logoSize = 26;
      const imageWidth = pageWidth - margin * 2;
      const imageHeight = Math.min(
        (canvas.height * imageWidth) / canvas.width,
        pageHeight - margin * 2 - titleHeight,
      );

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(107, 114, 128);
      const brandingOffset = logo ? logoSize + 12 : 0;
      pdf.text(roadmap.subtitle, margin + brandingOffset, margin + 11);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(18);
      pdf.setTextColor(23, 33, 29);
      if (logo) {
        pdf.addImage(logo, 'PNG', margin, margin - 6, logoSize, logoSize);
      }
      pdf.text(roadmap.title, margin + brandingOffset, margin + 32);
      pdf.addImage(image, 'PNG', margin, margin + titleHeight, imageWidth, imageHeight, undefined, 'FAST');
      const watermark = appConfig.controls.pdfWatermark;
      if (watermark.enabled) {
        const watermarkColumns = Math.max(watermark.columns, 1);
        const watermarkRows = Math.max(watermark.rows, 1);
        const watermarkGState = pdf.GState({ opacity: watermark.opacity });

        pdf.setGState(watermarkGState);
        pdf.setTextColor(120, 120, 120);
        pdf.setFontSize(watermark.fontSize);
        for (let row = 0; row < watermarkRows; row += 1) {
          for (let column = 0; column < watermarkColumns; column += 1) {
            pdf.text(
              watermark.text,
              (pageWidth * (column + 0.5)) / watermarkColumns,
              (pageHeight * (row + 0.5)) / watermarkRows,
              { align: 'center', angle: watermark.angle },
            );
          }
        }
        pdf.setGState(pdf.GState({ opacity: 1 }));
      }
      pdf.setTextColor(23, 33, 29);
      pdf.setDrawColor(156, 163, 175);
      pdf.setLineWidth(1);
      pdf.rect(margin, margin + titleHeight, imageWidth, imageHeight);
      pdf.rect(14, 14, pageWidth - 28, pageHeight - 28);
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
        fileInputRef={fileInputRef}
        getMonthInputValue={getMonthInputValue}
        printFriendly={printFriendly}
        onTitleChange={(title) => updateRoadmap((currentRoadmap) => ({ ...currentRoadmap, title }))}
        onSubtitleChange={(subtitle) => updateRoadmap((currentRoadmap) => ({ ...currentRoadmap, subtitle }))}
        onTimelineStartChange={updateTimelineStart}
        onTimelineEndChange={updateTimelineEnd}
        onViewChange={setTimelineView}
        onSnapModeChange={setSnapMode}
        onTogglePrintFriendly={() => setPrintFriendly((current) => !current)}
        onUndo={undoRoadmap}
        canUndo={undoStackRef.current.length > 0}
        onAddLane={addLane}
        onExport={exportRoadmap}
        onExportPdf={exportRoadmapPdf}
        onImport={importRoadmap}
      />
      <RoadmapTimeline
        roadmap={roadmap}
        timelineRef={timelineRef}
        timelineView={timelineView}
        timelineYear={timelineYear}
        timelineStartMonth={timelineStartMonth}
        timelineMonthSpan={timelineMonthSpan}
        dayCount={dayCount}
        dayWidth={dayWidth}
        timelineWidth={timelineWidth}
        months={months}
        quarters={quarters}
        weeks={weeks}
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
      />
      <TaskInventory roadmap={roadmap} onTaskChange={updateTask} onDeleteTask={deleteTask} onClearTasks={clearTasks} onExport={exportTaskTable} />
      <Analytics />
    </main>
  );
}

export default App;
