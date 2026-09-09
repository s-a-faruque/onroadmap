import { Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { RoadmapState, RoadmapTask } from '../types';

interface TaskTableRow extends RoadmapTask {
  laneName: string;
}

interface TaskInventoryProps {
  roadmap: RoadmapState;
  onTaskChange: (taskId: string, updates: Partial<RoadmapTask>) => void;
  onDeleteTask: (taskId: string) => void;
  onClearTasks: () => void;
  onExport: () => void;
}

export function TaskInventory({ roadmap, onTaskChange, onDeleteTask, onClearTasks, onExport }: TaskInventoryProps) {
  const [labelDrafts, setLabelDrafts] = useState<Record<string, string>>({});
  const taskTableRows = useMemo<TaskTableRow[]>(
    () => [...roadmap.tasks]
      .map((task) => ({
        ...task,
        laneName: roadmap.lanes.find((lane) => lane.id === task.laneId)?.name ?? 'Unassigned',
      }))
      .sort((firstTask, secondTask) => firstTask.startDate.localeCompare(secondTask.startDate) || firstTask.title.localeCompare(secondTask.title)),
    [roadmap.lanes, roadmap.tasks],
  );

  useEffect(() => {
    setLabelDrafts((currentDrafts) => Object.fromEntries(
      roadmap.tasks.map((task) => [task.id, currentDrafts[task.id] ?? task.tags.join(', ')]),
    ));
  }, [roadmap.tasks]);

  return (
    <section className="task-table-panel" aria-label="Task inventory table">
      <div className="task-table-header">
        <div>
          <p className="eyebrow">Task inventory</p>
          <h2>All task items</h2>
        </div>
        <div className="task-table-actions">
          <span>{roadmap.tasks.length} tasks</span>
          <button type="button" className="clear-tasks" onClick={onClearTasks} disabled={roadmap.tasks.length === 0}>Clear all</button>
          <button type="button" className="download-task-table" onClick={onExport}>Download PDF</button>
        </div>
      </div>
      <div className="task-table-scroll">
        <table className="task-table">
          <thead>
            <tr>
              <th scope="col">Title</th>
              <th scope="col">Lane</th>
              <th scope="col">Start</th>
              <th scope="col">End</th>
              <th scope="col">Labels</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {taskTableRows.map((task) => (
              <tr key={task.id}>
                <td>
                  <input
                    className="task-table-input"
                    value={task.title}
                    aria-label={`Task title: ${task.title}`}
                    onChange={(event) => onTaskChange(task.id, { title: event.target.value })}
                  />
                </td>
                <td>
                  <select
                    className="task-table-select"
                    value={task.laneId}
                    aria-label={`Lane for ${task.title}`}
                    onChange={(event) => onTaskChange(task.id, { laneId: event.target.value })}
                  >
                    {roadmap.lanes.map((lane) => (
                      <option key={lane.id} value={lane.id}>{lane.name}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    type="date"
                    className="task-table-date"
                    value={task.startDate}
                    aria-label={`Start date for ${task.title}`}
                    onChange={(event) => onTaskChange(task.id, { startDate: event.target.value })}
                  />
                </td>
                <td>
                  <input
                    type="date"
                    className="task-table-date"
                    value={task.endDate}
                    aria-label={`End date for ${task.title}`}
                    onChange={(event) => onTaskChange(task.id, { endDate: event.target.value })}
                  />
                </td>
                <td>
                  <input
                    className="task-table-input"
                    value={labelDrafts[task.id] ?? task.tags.join(', ')}
                    placeholder="Label 1, Label 2"
                    aria-label={`Labels for ${task.title}`}
                    onChange={(event) => setLabelDrafts((currentDrafts) => ({ ...currentDrafts, [task.id]: event.target.value }))}
                    onBlur={() => onTaskChange(task.id, {
                      tags: (labelDrafts[task.id] ?? '')
                        .split(',')
                        .map((tag) => tag.trim())
                        .filter(Boolean),
                    })}
                  />
                </td>
                <td>
                  <button type="button" className="delete-task-button" onClick={() => onDeleteTask(task.id)} aria-label={`Delete ${task.title}`}>
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
