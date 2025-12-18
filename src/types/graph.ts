import type { Person } from './person';

export interface GraphNode extends Person {
  isPartnerGroup?: boolean;
  husband?: Person;
  wife?: Person;
  children: GraphNode[];
  lineageMemberId?: string;
}

export interface ConsistencyIssue {
  type: 'error' | 'warning';
  message: string;
  entityId?: string;
}

export interface PathStep {
    personId: string;
    relation: string;
}
