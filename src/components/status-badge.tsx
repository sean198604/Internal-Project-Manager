// Badge tones mapped to the semantic meaning of derived project states
import { Badge } from '@/components/ui/primitives';

export type Status =
  | 'DRAFT'
  | 'PLANNED'
  | 'IN_PROGRESS'
  | 'WAITING_ACCEPTANCE'
  | 'COMPLETED'
  | 'ARCHIVED'
  | 'ON_HOLD'
  | 'CANCELLED'
  | 'MERGED';

export function statusTone(status: Status): React.ComponentProps<typeof Badge>['tone'] {
  switch (status) {
    case 'IN_PROGRESS':
      return 'blue';
    case 'WAITING_ACCEPTANCE':
      return 'amber';
    case 'COMPLETED':
      return 'green';
    case 'ARCHIVED':
      return 'slate';
    case 'ON_HOLD':
      return 'orange';
    case 'CANCELLED':
      return 'red';
    case 'MERGED':
      return 'violet';
    case 'DRAFT':
      return 'neutral';
    case 'PLANNED':
      return 'sky';
  }
}

export const STATUS_LABEL: Record<Status, string> = {
  DRAFT: '草稿',
  PLANNED: '待开始',
  IN_PROGRESS: '进行中',
  WAITING_ACCEPTANCE: '待验收',
  COMPLETED: '已完成',
  ARCHIVED: '已归档',
  ON_HOLD: '暂停',
  CANCELLED: '取消',
  MERGED: '合并',
};

export function StatusBadge({ status }: { status: Status }) {
  return <Badge tone={statusTone(status)} dot>{STATUS_LABEL[status]}</Badge>;
}

export type HealthStatus = 'NORMAL' | 'AT_RISK' | 'DELAYED' | 'ON_HOLD';

export function healthTone(h: HealthStatus): React.ComponentProps<typeof Badge>['tone'] {
  switch (h) {
    case 'NORMAL':
      return 'green';
    case 'AT_RISK':
      return 'amber';
    case 'DELAYED':
      return 'red';
    case 'ON_HOLD':
      return 'orange';
  }
}

export const HEALTH_LABEL: Record<HealthStatus, string> = {
  NORMAL: '正常',
  AT_RISK: '有风险',
  DELAYED: '延期',
  ON_HOLD: '暂停',
};

export function HealthBadge({ health }: { health: HealthStatus }) {
  return <Badge tone={healthTone(health)} dot>{HEALTH_LABEL[health]}</Badge>;
}

export const PRIORITY_LABEL: Record<string, string> = {
  P0: 'P0',
  P1: 'P1',
  P2: 'P2',
  P3: 'P3',
};

export function PriorityBadge({ priority }: { priority: string }) {
  const tone: React.ComponentProps<typeof Badge>['tone'] =
    priority === 'P0' ? 'red' : priority === 'P1' ? 'amber' : priority === 'P3' ? 'neutral' : 'blue';
  return <Badge tone={tone}>{priority}</Badge>;
}
