import { PointerEvent as ReactPointerEvent, RefObject, useMemo, useRef, useState } from 'react';
import { GripVertical, Plus, Trash2 } from 'lucide-react';
import { dateToDay, snapDay } from '../dateMath';
import type { RoadmapState, RoadmapTask, SnapMode, TimelineDesign, TimelineView } from '../types';

const MIN_LANE_HEIGHT = 86;
const MIN_LANE_LABEL_WIDTH = 150;
const MAX_LANE_LABEL_WIDTH = 360;
const DEFAULT_LANE_LABEL_WIDTH = 210;
const TASK_HEIGHT = 42;
const TASK_TOP = 18;
const TASK_GAP = 10;
const TASK_ROW_HEIGHT = TASK_HEIGHT + TASK_GAP;

export type DragMode = 'move' | 'resize-left' | 'resize-right';

export interface PositionedTask {
  task: RoadmapTask;
  startDay: number;
  endDay: number;
  rowIndex: number;
}

export interface LaneTaskLayout {
  height: number;
  tasks: PositionedTask[];
}

interface TaskCreationSession {
  laneId: string;
  startDay: number;
  currentDay: number;
  startClientX: number;
  startClientY: number;
  pointerId: number;
  didDrag: boolean;
}

interface RoadmapTimelineProps {
  roadmap: RoadmapState;
  timelineDesign: TimelineDesign;
  timelineRef: RefObject<HTMLDivElement | null>;
  timelineView: TimelineView;
  snapMode: SnapMode;
  timelineYear: number;
  timelineStartMonth: number;
  timelineMonthSpan: number;
  dayCount: number;
  dayWidth: number;
  timelineWidth: number;
  months: Array<{ label: string; startDay: number; days: number }>;
  quarters: Array<{ label: string; startDay: number; days: number }>;
  weeks: Array<{ label: string; startDay: number; days: number }>;
  days: Array<{ label: string; startDay: number; days: number }>;
  draggingTaskId: string | undefined;
  printFriendly: boolean;
  readOnly?: boolean;
  onStartDrag: (event: ReactPointerEvent, task: RoadmapTask, mode: DragMode) => void;
  onTaskChange: (taskId: string, updates: Partial<RoadmapTask>) => void;
  onDeleteTask: (taskId: string) => void;
  onLaneChange: (laneId: string, name: string) => void;
  onDeleteLane: (laneId: string) => void;
  onAddTask: (laneId: string) => void;
  onCreateTask: (laneId: string, startDay: number, endDay: number) => void;
}

function getLaneTaskLayouts(roadmap: RoadmapState, timelineYear: number, startMonth: number, monthSpan: number): Record<string, LaneTaskLayout> {
  return roadmap.lanes.reduce<Record<string, LaneTaskLayout>>((layouts, lane) => {
    const rowEndDays: number[] = [];
    const tasks = roadmap.tasks
      .filter((task) => task.laneId === lane.id)
      .map((task) => ({ task, startDay: dateToDay(task.startDate, timelineYear, startMonth, monthSpan), endDay: dateToDay(task.endDate, timelineYear, startMonth, monthSpan) }))
      .sort((firstTask, secondTask) => firstTask.startDay - secondTask.startDay || firstTask.endDay - secondTask.endDay)
      .map((taskLayout) => {
        const rowIndex = rowEndDays.findIndex((endDay) => taskLayout.startDay > endDay);
        const nextRowIndex = rowIndex === -1 ? rowEndDays.length : rowIndex;
        rowEndDays[nextRowIndex] = taskLayout.endDay;
        return { ...taskLayout, rowIndex: nextRowIndex };
      });
    const rowCount = Math.max(rowEndDays.length, 1);
    layouts[lane.id] = { height: Math.max(MIN_LANE_HEIGHT, TASK_TOP * 2 + rowCount * TASK_HEIGHT + (rowCount - 1) * TASK_GAP), tasks };
    return layouts;
  }, {});
}

export function RoadmapTimeline({
  roadmap, timelineDesign, timelineRef, timelineView, snapMode, timelineYear, timelineStartMonth, timelineMonthSpan,
  dayCount, dayWidth, timelineWidth, months, quarters, weeks, days, draggingTaskId,
  printFriendly, readOnly = false, onStartDrag, onTaskChange, onDeleteTask, onLaneChange, onDeleteLane, onAddTask, onCreateTask,
}: RoadmapTimelineProps) {
  const laneTaskLayouts = useMemo(() => getLaneTaskLayouts(roadmap, timelineYear, timelineStartMonth, timelineMonthSpan), [roadmap, timelineYear, timelineStartMonth, timelineMonthSpan]);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [laneLabelWidth, setLaneLabelWidth] = useState<number>(DEFAULT_LANE_LABEL_WIDTH);
  const [hoveredCell, setHoveredCell] = useState<{ laneId: string; day: number } | null>(null);
  const [creationPreview, setCreationPreview] = useState<TaskCreationSession | null>(null);
  const creationSessionRef = useRef<TaskCreationSession | null>(null);

  const getDayAtPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    const trackBounds = event.currentTarget.getBoundingClientRect();
    return Math.min(Math.max(Math.floor((event.clientX - trackBounds.left) / dayWidth), 0), dayCount - 1);
  };

  const getCreationRange = (session: TaskCreationSession, endDay: number, isDrag: boolean) => {
    if (!isDrag) {
      return { startDay: session.startDay, endDay: session.startDay };
    }

    const firstDay = snapDay(session.startDay, timelineYear, snapMode, timelineStartMonth, timelineMonthSpan);
    const lastDay = snapDay(endDay, timelineYear, snapMode, timelineStartMonth, timelineMonthSpan);
    return {
      startDay: Math.min(firstDay, lastDay),
      endDay: Math.max(firstDay, lastDay),
    };
  };

  const handleTrackPointerDown = (event: ReactPointerEvent<HTMLDivElement>, laneId: string) => {
    if (readOnly || printFriendly || event.button !== 0 || (event.target instanceof Element && event.target.closest('.task-pill'))) {
      return;
    }

    const startDay = getDayAtPointer(event);
    const session = {
      laneId,
      startDay,
      currentDay: startDay,
      startClientX: event.clientX,
      startClientY: event.clientY,
      pointerId: event.pointerId,
      didDrag: false,
    };
    creationSessionRef.current = session;
    setCreationPreview(session);
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  const handleTrackPointerMove = (event: ReactPointerEvent<HTMLDivElement>, laneId: string) => {
    if (readOnly || printFriendly) {
      return;
    }

    const session = creationSessionRef.current;
    const currentDay = getDayAtPointer(event);

    if (session?.pointerId === event.pointerId) {
      const nextSession = {
        ...session,
        currentDay,
        didDrag: session.didDrag || Math.hypot(event.clientX - session.startClientX, event.clientY - session.startClientY) > 4,
      };
      creationSessionRef.current = nextSession;
      setCreationPreview(nextSession);
      return;
    }

    if (event.target instanceof Element && event.target.closest('.task-pill')) {
      setHoveredCell(null);
      return;
    }

    setHoveredCell({ laneId, day: currentDay });
  };

  const finishTrackPointer = (event: ReactPointerEvent<HTMLDivElement>, cancelled = false) => {
    const session = creationSessionRef.current;
    if (!session || session.pointerId !== event.pointerId) {
      return;
    }

    creationSessionRef.current = null;
    setCreationPreview(null);
    if (cancelled) {
      return;
    }

    const endDay = getDayAtPointer(event);
    const isDrag = session.didDrag || Math.hypot(event.clientX - session.startClientX, event.clientY - session.startClientY) > 4;
    const range = getCreationRange(session, endDay, isDrag);
    onCreateTask(session.laneId, range.startDay, range.endDay);
  };

  const handleLaneLabelResize = (event: ReactPointerEvent) => {
    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const startWidth = laneLabelWidth;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const nextWidth = Math.min(Math.max(startWidth + (moveEvent.clientX - startX), MIN_LANE_LABEL_WIDTH), MAX_LANE_LABEL_WIDTH);
      setLaneLabelWidth(nextWidth);
    };

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  return (
    <section className={`timeline-card timeline-design-${timelineDesign}`} aria-label="Roadmap timeline">
      <div className="timeline-scroll">
        <div ref={timelineRef} className="timeline" style={{ width: laneLabelWidth + timelineWidth }}>
          <div className={`timeline-header ${timelineView === 'week' ? 'weekly-header' : ''} ${timelineView === 'day' ? 'daily-header' : ''}`}>
            <div className="lane-header" style={{ width: laneLabelWidth, flexBasis: laneLabelWidth }}>
              <span>Swimlanes</span>
              {!printFriendly && <button type="button" className="lane-resizer" aria-label="Resize lane labels" onPointerDown={handleLaneLabelResize} />}
            </div>
            <div className="date-header" style={{ width: timelineWidth }}>
              <div className="quarter-row">{quarters.map((quarter) => <div key={quarter.label} className="quarter-cell" style={{ left: quarter.startDay * dayWidth, width: quarter.days * dayWidth }}>{quarter.label}</div>)}</div>
              <div className="month-row">{months.map((month) => <div key={month.label} className="month-cell" style={{ left: month.startDay * dayWidth, width: month.days * dayWidth }}>{month.label}</div>)}</div>
              {timelineView === 'week' && <div className="week-row" aria-label="Weekly dates">{weeks.map((week) => <div key={week.startDay} className="week-cell" style={{ left: week.startDay * dayWidth, width: week.days * dayWidth }}>{week.label}</div>)}</div>}
              {timelineView === 'day' && <div className="day-row" aria-label="Daily dates">{days.map((day) => <div key={`${day.startDay}-${day.label}`} className="day-cell" style={{ left: day.startDay * dayWidth, width: day.days * dayWidth }}>{day.label}</div>)}</div>}
            </div>
          </div>
          <div className="timeline-body">
            <div className={`grid-lines ${timelineView === 'week' ? 'weekly-grid-lines' : ''} ${timelineView === 'day' ? 'daily-grid-lines' : ''}`} style={{ left: laneLabelWidth, width: timelineWidth }}>
              {timelineView === 'day'
                ? Array.from({ length: dayCount + 1 }, (_, index) => <span key={index} style={{ left: index * dayWidth }} />)
                : timelineView === 'week'
                  ? Array.from({ length: Math.ceil(dayCount / 7) + 1 }, (_, index) => <span key={index} style={{ left: index * 7 * dayWidth }} />)
                  : months.map((month) => <span key={month.label} style={{ left: month.startDay * dayWidth }} />)}
            </div>
            {roadmap.lanes.map((lane) => {
              const laneLayout = laneTaskLayouts[lane.id];
              return <div className="lane-row" key={lane.id} style={{ height: laneLayout?.height ?? MIN_LANE_HEIGHT }}>
                <div className="lane-label" style={{ width: laneLabelWidth, flexBasis: laneLabelWidth }}>
                  {!printFriendly
                    ? <input
                        value={lane.name}
                        title={lane.name}
                        name={`lane-${lane.id}`}
                        aria-label={`Lane title: ${lane.name}`}
                        onChange={(event) => onLaneChange(lane.id, event.target.value)}
                      />
                    : lane.name }
                  {!printFriendly && <button type="button" onClick={() => onAddTask(lane.id)} aria-label={`Add task to ${lane.name}`}><Plus size={15} /></button>}
                  {!printFriendly && <button type="button" className="delete-lane-button" onClick={() => onDeleteLane(lane.id)} disabled={roadmap.lanes.length === 1} aria-label={`Delete ${lane.name} lane`}><Trash2 size={15} /></button>}
                </div>
                <div
                  className={`lane-track ${!readOnly && !printFriendly ? 'lane-track-addable' : ''}`}
                  style={{ width: timelineWidth }}
                  onPointerDown={(event) => handleTrackPointerDown(event, lane.id)}
                  onPointerMove={(event) => handleTrackPointerMove(event, lane.id)}
                  onPointerUp={finishTrackPointer}
                  onPointerCancel={(event) => finishTrackPointer(event, true)}
                  onPointerLeave={() => { if (!creationSessionRef.current) setHoveredCell(null); }}
                >
                  {creationPreview?.laneId === lane.id && (() => {
                    const range = getCreationRange(creationPreview, creationPreview.currentDay, creationPreview.didDrag);
                    return <div
                      className="task-create-ghost task-create-selection"
                      aria-hidden="true"
                      style={{
                        left: range.startDay * dayWidth,
                        width: Math.max((range.endDay - range.startDay + 1) * dayWidth, 44),
                      }}
                    ><Plus size={14} /><span>Add task</span></div>;
                  })()}
                  {!readOnly && !printFriendly && !creationPreview && hoveredCell?.laneId === lane.id && <div
                    className="task-create-ghost task-create-hover"
                    aria-hidden="true"
                    style={{
                      left: Math.min(hoveredCell.day * dayWidth, Math.max(timelineWidth - 104, 0)),
                      width: Math.min(Math.max(dayWidth, 104), timelineWidth),
                    }}
                  ><Plus size={14} /><span>Add task</span></div>}
                  {(laneLayout?.tasks ?? []).map(({ task, startDay, endDay, rowIndex }) => {
                    const width = Math.max((endDay - startDay + 1) * dayWidth, 42);
                    const hasAdditionalLabels = task.tags.length > 1;
                    const isLabelsExpanded = expandedTaskId === task.id;
                    return <article className={`task-pill ${draggingTaskId === task.id ? 'dragging' : ''}`} key={task.id} title={task.tags.join(', ')} style={{ left: startDay * dayWidth, top: TASK_TOP + rowIndex * TASK_ROW_HEIGHT, width, borderColor: task.color, backgroundColor: timelineDesign === 'flow' ? `color-mix(in srgb, ${task.color} 18%, var(--paper))` : 'var(--paper)' }} onPointerDown={(event) => { if (!readOnly) onStartDrag(event, task, 'move'); }}>
                      {!printFriendly && <button type="button" className="resize-handle left" onPointerDown={(event) => { event.stopPropagation(); onStartDrag(event, task, 'resize-left'); }} aria-label={`Resize ${task.title} start`} />}
                      {!printFriendly && <GripVertical className="drag-grip" size={15} />}
                      <div className="task-content">
                        {printFriendly
                          ? <div className="print-friendly-task-title">{task.title}</div>
                          : <input value={task.title} onPointerDown={(event) => event.stopPropagation()} onChange={(event) => onTaskChange(task.id, { title: event.target.value })} aria-label="Task title" />}
                      </div>
                      {!printFriendly && task.tags.length > 0 && <span className="task-labels" aria-label={`Labels: ${task.tags.join(', ')}`}>
                        <span className="task-label">{task.tags[0]}</span>
                        {hasAdditionalLabels && <button
                          type="button"
                          className="task-label-count"
                          aria-expanded={isLabelsExpanded}
                          aria-label={`${task.tags.length - 1} additional label${task.tags.length === 2 ? '' : 's'}`}
                          onPointerDown={(event) => event.stopPropagation()}
                          onClick={() => setExpandedTaskId(isLabelsExpanded ? null : task.id)}
                        >+{task.tags.length - 1}</button>}
                        {isLabelsExpanded && <span className="task-label-popover" role="list" aria-label="Additional labels">
                          {task.tags.slice(1).map((tag, index) => <span key={`${tag}-${index}`} role="listitem">{tag}</span>)}
                        </span>}
                      </span>}
                      {!printFriendly && <span className="task-color-picker"><span className="task-color-swatch" style={{ background: task.color }} /><input className="task-color" type="color" value={task.color} onPointerDown={(event) => event.stopPropagation()} onChange={(event) => onTaskChange(task.id, { color: event.target.value })} aria-label="Task color" /></span>}
                      {!printFriendly && <button type="button" className="delete-task-button timeline-delete-task" onPointerDown={(event) => event.stopPropagation()} onClick={() => onDeleteTask(task.id)} aria-label={`Delete ${task.title}`}><Trash2 size={14} /></button>}
                      {!printFriendly && <button type="button" className="resize-handle right" onPointerDown={(event) => { event.stopPropagation(); onStartDrag(event, task, 'resize-right'); }} aria-label={`Resize ${task.title} end`} />}
                    </article>;
                  })}
                </div>
              </div>;
            })}
          </div>
        </div>
      </div>
    </section>
  );
}