import { ChangeEvent, PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Download, FileDown, GripVertical, Plus, Upload } from 'lucide-react';
import {
  dateToDay,
  dayToDate,
  getTimelineEnd,
  getTimelineStart,
  getYearDayCount,
  monthSegments,
  quarterSegments,
  snapDay,
} from './dateMath';
import { appConfig } from './appConfig';
import { localRoadmapStore } from './storage';
import type { RoadmapState, RoadmapTask, SnapMode, TimelineView } from './types';

const TIMELINE_RANGE_STORAGE_KEY = 'onroadmap.timelineRange.v1';

const MIN_LANE_HEIGHT = 86;
const LANE_LABEL_WIDTH = 168;
const TASK_HEIGHT = 46;
const TASK_TOP = 18;
const TASK_GAP = 10;
const TASK_ROW_HEIGHT = TASK_HEIGHT + TASK_GAP;
const CURRENT_YEAR = new Date().getFullYear();
const COLORS = ['#f25f5c', '#247ba0', '#70c1b3', '#f3b562', '#7f5af0', '#2cb67d'];

type DragMode = 'move' | 'resize-left' | 'resize-right';

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

interface PositionedTask {
  task: RoadmapTask;
  startDay: number;
  endDay: number;
  rowIndex: number;
}

interface LaneTaskLayout {
  height: number;
  tasks: PositionedTask[];
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

function getLaneTaskLayouts(roadmap: RoadmapState, timelineYear: number, startMonth: number, monthSpan: number): Record<string, LaneTaskLayout> {
  return roadmap.lanes.reduce<Record<string, LaneTaskLayout>>((layouts, lane) => {
    const rowEndDays: number[] = [];
    const tasks = roadmap.tasks
      .filter((task) => task.laneId === lane.id)
      .map((task) => ({
        task,
        startDay: dateToDay(task.startDate, timelineYear, startMonth, monthSpan),
        endDay: dateToDay(task.endDate, timelineYear, startMonth, monthSpan),
      }))
      .sort((firstTask, secondTask) => firstTask.startDay - secondTask.startDay || firstTask.endDay - secondTask.endDay)
      .map((taskLayout) => {
        const rowIndex = rowEndDays.findIndex((endDay) => taskLayout.startDay > endDay);
        const nextRowIndex = rowIndex === -1 ? rowEndDays.length : rowIndex;

        rowEndDays[nextRowIndex] = taskLayout.endDay;

        return { ...taskLayout, rowIndex: nextRowIndex };
      });
    const rowCount = Math.max(rowEndDays.length, 1);

    layouts[lane.id] = {
      height: Math.max(MIN_LANE_HEIGHT, TASK_TOP * 2 + rowCount * TASK_HEIGHT + (rowCount - 1) * TASK_GAP),
      tasks,
    };

    return layouts;
  }, {});
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
  const [timelineRangeSelection, setTimelineRangeSelection] = useState(getInitialTimelineRange);
  const timelineStartMonth = timelineRangeSelection.start.monthIndex;
  const configuredStartYear = timelineRangeSelection.start.year;
  const timelineMonthSpan = getMonthSpanFromRange(timelineRangeSelection);
  const [roadmap, setRoadmap] = useState<RoadmapState>(() => localRoadmapStore.load() ?? createInitialState(configuredStartYear, timelineStartMonth, timelineMonthSpan));
  const [timelineView, setTimelineView] = useState<TimelineView>('month');
  const [snapMode, setSnapMode] = useState<SnapMode>(appConfig.controls.defaultSnapMode);
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
  const laneTaskLayouts = useMemo(() => getLaneTaskLayouts(roadmap, timelineYear, timelineStartMonth, timelineMonthSpan), [roadmap, timelineYear, timelineStartMonth, timelineMonthSpan]);

  useEffect(() => {
    localRoadmapStore.save(roadmap);
  }, [roadmap]);

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
      setRoadmap((currentRoadmap) => {
        const horizontalDelta = Math.round((event.clientX - activeDragSession.startClientX) / dayWidth);
        const verticalDelta = Math.round((event.clientY - activeDragSession.startClientY) / MIN_LANE_HEIGHT);
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
      });
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

  function startDrag(event: ReactPointerEvent, task: RoadmapTask, mode: DragMode) {
    event.currentTarget.setPointerCapture(event.pointerId);
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
    setRoadmap((currentRoadmap) => ({
      ...currentRoadmap,
      tasks: currentRoadmap.tasks.map((task) => (task.id === taskId ? { ...task, ...updates } : task)),
    }));
  }

  function addLane() {
    const laneName = `Lane ${roadmap.lanes.length + 1}`;
    const lane = { id: crypto.randomUUID(), name: laneName };

    setRoadmap((currentRoadmap) => ({
      ...currentRoadmap,
      lanes: [...currentRoadmap.lanes, lane],
      tasks: [...currentRoadmap.tasks, createTask(timelineYear, timelineStartMonth, timelineMonthSpan, lane.id, currentRoadmap.tasks.length)],
    }));
  }

  function addTask(laneId: string) {
    setRoadmap((currentRoadmap) => ({
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
      const canvas = await html2canvas(timelineElement, {
        backgroundColor: activeTheme.colors.paper,
        scale: 2,
        useCORS: true,
        width: timelineElement.scrollWidth,
        height: timelineElement.scrollHeight,
        windowWidth: timelineElement.scrollWidth,
        windowHeight: timelineElement.scrollHeight,
      });
      const image = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 28;
      const titleHeight = 28;
      const imageWidth = pageWidth - margin * 2;
      const imageHeight = Math.min(
        (canvas.height * imageWidth) / canvas.width,
        pageHeight - margin * 2 - titleHeight,
      );

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(16);
      pdf.text(`onroadmap ${timelineRange}`, margin, margin + 2);
      pdf.addImage(image, 'PNG', margin, margin + titleHeight, imageWidth, imageHeight, undefined, 'FAST');
      pdf.save(`onroadmap-${timelineYear}.pdf`);
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

      setRoadmap(nextRoadmap);
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

  return (
    <main className="app-shell">
      <section className="topbar" aria-label="Roadmap controls">
        <div>
          <p className="eyebrow">CSDS :: Web & Content Team roadmap</p>
          <h1>Roadmap</h1>
        </div>

        <div className="controls">
          <div className="timeline-range-picker" aria-label="Timeline range">
            <label className="year-field">
              <span>From</span>
              <input type="month" value={getMonthInputValue(timelineRangeSelection.start)} onChange={(event) => updateTimelineStart(event.target.value)} />
            </label>
            <label className="year-field">
              <span>To</span>
              <input type="month" value={getMonthInputValue(timelineRangeSelection.end)} onChange={(event) => updateTimelineEnd(event.target.value)} />
            </label>
          </div>

          <div className="segmented" aria-label="Timeline view">
            {(['month', 'week'] as TimelineView[]).map((view) => (
              <button
                key={view}
                className={timelineView === view ? 'active' : ''}
                type="button"
                onClick={() => setTimelineView(view)}
              >
                {view}
              </button>
            ))}
          </div>

          {enabledSnapModes.length > 0 && (
            <select value={activeSnapMode} onChange={(event) => setSnapMode(event.target.value as SnapMode)}>
              {enabledSnapModes.map((snapOption) => (
                <option key={snapOption.value} value={snapOption.value}>
                  {snapOption.label}
                </option>
              ))}
            </select>
          )}

          <button type="button" className="icon-button" onClick={addLane} title="Add lane" aria-label="Add lane">
            <Plus size={18} />
          </button>
          {appConfig.controls.enableJsonExport && (
            <button type="button" className="icon-button" onClick={exportRoadmap} title="Export JSON" aria-label="Export JSON">
              <Download size={18} />
            </button>
          )}
          {appConfig.controls.enablePdfDownload && (
            <button type="button" className="icon-button" onClick={exportRoadmapPdf} title="Download PDF" aria-label="Download PDF">
              <FileDown size={18} />
            </button>
          )}
          {appConfig.controls.enableJsonImport && (
            <>
              <button
                type="button"
                className="icon-button"
                onClick={() => fileInputRef.current?.click()}
                title="Import JSON"
                aria-label="Import JSON"
              >
                <Upload size={18} />
              </button>
              <input ref={fileInputRef} className="hidden-input" type="file" accept="application/json" onChange={importRoadmap} />
            </>
          )}
        </div>
      </section>

      <section className="timeline-card" aria-label="Roadmap timeline">
        <div className="timeline-scroll">
          <div ref={timelineRef} className="timeline" style={{ width: LANE_LABEL_WIDTH + timelineWidth }}>
            <div className="timeline-header">
              <div className="lane-header">Swimlanes</div>
              <div className="date-header" style={{ width: timelineWidth }}>
                <div className="quarter-row">
                  {quarters.map((quarter) => (
                    <div
                      key={quarter.label}
                      className="quarter-cell"
                      style={{ left: quarter.startDay * dayWidth, width: quarter.days * dayWidth }}
                    >
                      {quarter.label}
                    </div>
                  ))}
                </div>
                <div className="month-row">
                {months.map((month) => (
                  <div
                    key={month.label}
                    className="month-cell"
                    style={{ left: month.startDay * dayWidth, width: month.days * dayWidth }}
                  >
                    {month.label}
                  </div>
                ))}
                </div>
              </div>
            </div>

            <div className="timeline-body">
              <div className="grid-lines" style={{ left: LANE_LABEL_WIDTH, width: timelineWidth }}>
                {timelineView === 'week'
                  ? Array.from({ length: Math.ceil(dayCount / 7) + 1 }, (_, index) => (
                      <span key={index} style={{ left: index * 7 * dayWidth }} />
                    ))
                  : months.map((month) => <span key={month.label} style={{ left: month.startDay * dayWidth }} />)}
              </div>

              {roadmap.lanes.map((lane) => {
                const laneLayout = laneTaskLayouts[lane.id];
                const laneTasks = laneLayout?.tasks ?? [];
                const laneHeight = laneLayout?.height ?? MIN_LANE_HEIGHT;

                return (
                  <div className="lane-row" key={lane.id} style={{ height: laneHeight }}>
                    <div className="lane-label">
                      <input
                        value={lane.name}
                        onChange={(event) =>
                          setRoadmap((currentRoadmap) => ({
                            ...currentRoadmap,
                            lanes: currentRoadmap.lanes.map((currentLane) =>
                              currentLane.id === lane.id ? { ...currentLane, name: event.target.value } : currentLane,
                            ),
                          }))
                        }
                      />
                      <button type="button" onClick={() => addTask(lane.id)} aria-label={`Add task to ${lane.name}`}>
                        <Plus size={15} />
                      </button>
                    </div>

                    <div className="lane-track" style={{ width: timelineWidth }}>
                      {laneTasks.map(({ task, startDay, endDay, rowIndex }) => {
                        const left = startDay * dayWidth;
                        const width = Math.max((endDay - startDay + 1) * dayWidth, 42);
                        const top = TASK_TOP + rowIndex * TASK_ROW_HEIGHT;

                        return (
                          <article
                            className={`task-pill ${dragSession?.taskId === task.id ? 'dragging' : ''}`}
                            key={task.id}
                            style={{ left, top, width, borderColor: task.color }}
                            onPointerDown={(event) => startDrag(event, task, 'move')}
                          >
                            <button
                              type="button"
                              className="resize-handle left"
                              onPointerDown={(event) => {
                                event.stopPropagation();
                                startDrag(event, task, 'resize-left');
                              }}
                              aria-label={`Resize ${task.title} start`}
                            />
                            <GripVertical className="drag-grip" size={15} />
                            <div className="task-content">
                              <input
                                value={task.title}
                                onPointerDown={(event) => event.stopPropagation()}
                                onChange={(event) => updateTask(task.id, { title: event.target.value })}
                                aria-label="Task title"
                              />
                              <div className="task-meta">
                                <span className="color-dot" style={{ background: task.color }} />
                                <input
                                  value={task.tags.join(', ')}
                                  onPointerDown={(event) => event.stopPropagation()}
                                  onChange={(event) =>
                                    updateTask(task.id, {
                                      tags: event.target.value
                                        .split(',')
                                        .map((tag) => tag.trim())
                                        .filter(Boolean),
                                    })
                                  }
                                  aria-label="Task tags"
                                />
                              </div>
                            </div>
                            <input
                              className="task-color"
                              type="color"
                              value={task.color}
                              onPointerDown={(event) => event.stopPropagation()}
                              onChange={(event) => updateTask(task.id, { color: event.target.value })}
                              aria-label="Task color"
                            />
                            <button
                              type="button"
                              className="resize-handle right"
                              onPointerDown={(event) => {
                                event.stopPropagation();
                                startDrag(event, task, 'resize-right');
                              }}
                              aria-label={`Resize ${task.title} end`}
                            />
                          </article>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default App;
