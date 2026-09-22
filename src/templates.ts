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

export const ROADMAP_TEMPLATES: RoadmapTemplate[] = [
  {
    id: 'learning-ai-rag',
    name: 'Learning AI and RAG',
    title: 'Learning AI and RAG',
    subtitle: 'Self-paced AI product roadmap',
    monthSpan: 9,
    lanes: [
      { id: 'learn', name: 'Learn' },
      { id: 'build', name: 'Build' },
      { id: 'ship', name: 'Ship' },
    ],
    tasks: [
      { laneId: 'learn', title: 'Python + SQL foundations', startDay: 0, duration: 24, color: '#247ba0', tags: ['Python', 'Data'] },
      { laneId: 'learn', title: 'LLM fundamentals', startDay: 20, duration: 28, color: '#70c1b3', tags: ['AI', 'Models'] },
      { laneId: 'build', title: 'Prompt engineering lab', startDay: 42, duration: 24, color: '#f3b562', tags: ['Prompting', 'Labs'] },
      { laneId: 'build', title: 'RAG architecture', startDay: 70, duration: 36, color: '#7f5af0', tags: ['Retrieval', 'RAG'] },
      { laneId: 'build', title: 'Evaluation and safety', startDay: 110, duration: 28, color: '#2cb67d', tags: ['Eval', 'Safety'] },
      { laneId: 'ship', title: 'Capstone app launch', startDay: 148, duration: 34, color: '#f25f5c', tags: ['Portfolio', 'Demo'] },
    ],
  },
  {
    id: 'devops-mastery',
    name: 'DevOps mastery',
    title: 'DevOps mastery',
    subtitle: 'Modern platform engineering roadmap',
    monthSpan: 8,
    lanes: [
      { id: 'foundation', name: 'Foundation' },
      { id: 'automation', name: 'Automation' },
      { id: 'reliability', name: 'Reliability' },
    ],
    tasks: [
      { laneId: 'foundation', title: 'Linux + networking fundamentals', startDay: 0, duration: 20, color: '#247ba0', tags: ['Linux', 'Networking'] },
      { laneId: 'foundation', title: 'Containers and orchestration', startDay: 24, duration: 28, color: '#70c1b3', tags: ['Docker', 'Kubernetes'] },
      { laneId: 'automation', title: 'CI/CD pipeline design', startDay: 48, duration: 26, color: '#f3b562', tags: ['CI', 'Delivery'] },
      { laneId: 'automation', title: 'Infrastructure as code', startDay: 78, duration: 32, color: '#7f5af0', tags: ['Terraform', 'IaC'] },
      { laneId: 'reliability', title: 'Observability and alerts', startDay: 112, duration: 28, color: '#2cb67d', tags: ['Monitoring', 'SRE'] },
      { laneId: 'reliability', title: 'Disaster recovery drill', startDay: 146, duration: 24, color: '#f25f5c', tags: ['Resilience', 'Ops'] },
    ],
  },
  {
    id: 'ecommerce-system',
    name: 'Build an ecommerce system',
    title: 'Build an ecommerce system',
    subtitle: 'Commerce platform product roadmap',
    monthSpan: 10,
    lanes: [
      { id: 'product', name: 'Product' },
      { id: 'platform', name: 'Platform' },
      { id: 'growth', name: 'Growth' },
    ],
    tasks: [
      { laneId: 'product', title: 'Customer research and flows', startDay: 0, duration: 24, color: '#247ba0', tags: ['UX', 'Research'] },
      { laneId: 'platform', title: 'Catalog and cart service', startDay: 26, duration: 30, color: '#70c1b3', tags: ['Catalog', 'API'] },
      { laneId: 'platform', title: 'Payments and checkout', startDay: 58, duration: 32, color: '#f3b562', tags: ['Payments', 'Checkout'] },
      { laneId: 'growth', title: 'Search, recommendations, and promos', startDay: 88, duration: 32, color: '#7f5af0', tags: ['Discovery', 'Growth'] },
      { laneId: 'platform', title: 'Fulfillment and inventory', startDay: 122, duration: 28, color: '#2cb67d', tags: ['Ops', 'Inventory'] },
      { laneId: 'growth', title: 'Launch and optimization', startDay: 156, duration: 30, color: '#f25f5c', tags: ['Launch', 'Retention'] },
    ],
  },
];

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
