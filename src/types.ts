export type TimelineView = 'month' | 'week';
export type SnapMode = 'day' | 'week' | 'month';

export interface RoadmapLane {
  id: string;
  name: string;
}

export interface RoadmapTask {
  id: string;
  title: string;
  laneId: string;
  startDate: string;
  endDate: string;
  color: string;
  tags: string[];
}

export interface RoadmapState {
  title: string;
  subtitle: string;
  year: number;
  lanes: RoadmapLane[];
  tasks: RoadmapTask[];
}
