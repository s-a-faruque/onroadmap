import type { RoadmapLane, RoadmapState } from './types';
import { dayToDate } from './dateMath';

export interface RoadmapTemplateTask {
  laneId: string;
  title: string;
  startDay: number;
  duration: number;
  color: string;
  tags: string[];
}

export interface RoadmapTemplate {
  id: string;
  name: string;
  title: string;
  subtitle: string;
  monthSpan: number;
  lanes: RoadmapLane[];
  tasks: RoadmapTemplateTask[];
}

const templateFiles = import.meta.glob<RoadmapTemplate>('./templates/*.json', {
  eager: true,
  import: 'default',
});

export const ROADMAP_TEMPLATES = Object.values(templateFiles).sort((left, right) => left.name.localeCompare(right.name));

export function addMonthsToMonth(month: { year: number; monthIndex: number }, offset: number) {
  const total = month.year * 12 + month.monthIndex + offset;

  return {
    year: Math.floor(total / 12),
    monthIndex: ((total % 12) + 12) % 12,
  };
}

export function buildRoadmapFromTemplate(template: RoadmapTemplate, year: number, startMonth: number): RoadmapState {
  const monthSpan = Math.max(template.monthSpan, 1);
  const safeStartMonth = Math.min(Math.max(startMonth, 0), 11);

  return {
    title: template.title,
    subtitle: template.subtitle,
    year,
    lanes: template.lanes.map((lane) => ({ ...lane })),
    tasks: template.tasks.map((task, index) => ({
      id: `${template.id}-task-${index + 1}`,
      title: task.title,
      laneId: task.laneId,
      startDate: dayToDate(task.startDay, year, safeStartMonth, monthSpan),
      endDate: dayToDate(task.startDay + Math.max(task.duration, 1), year, safeStartMonth, monthSpan),
      color: task.color,
      tags: task.tags,
    })),
  };
}
