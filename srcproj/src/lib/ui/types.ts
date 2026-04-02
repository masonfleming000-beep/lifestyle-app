export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'icon';
export type ButtonSize = 'sm' | 'md';
export type ActionScope = 'page' | 'section' | 'item';

export type ActionKind =
  | 'add'
  | 'edit'
  | 'save'
  | 'delete'
  | 'remove'
  | 'restore'
  | 'clear'
  | 'search'
  | 'upload'
  | 'show'
  | 'hide'
  | 'start'
  | 'reset'
  | 'apply'
  | 'toggle-layout'
  | 'change-password'
  | 'refresh-preview'
  | 'custom';

export interface ConfirmConfig {
  title?: string;
  message: string;
}

export interface UIAction {
  id: string;
  kind: ActionKind;
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  scope?: ActionScope;
  icon?: string;
  disabled?: boolean;
  submit?: boolean;
  confirm?: ConfirmConfig;
  handler?: string;
  attrs?: Record<string, string | number | boolean>;
}

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'select'
  | 'checkbox'
  | 'date'
  | 'search'
  | 'file'
  | 'tags';

export interface SelectOption {
  label: string;
  value: string;
}

export interface FieldConfig {
  id: string;
  name: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  value?: string | number | boolean | string[];
  helpText?: string;
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
  accept?: string;
  multiple?: boolean;
  options?: SelectOption[];
}

export interface EmptyStateConfig {
  title?: string;
  description: string;
  action?: UIAction;
}

export type SectionType =
  | 'collection'
  | 'detail-grid'
  | 'form'
  | 'stats'
  | 'timeline'
  | 'media'
  | 'routine'
  | 'tasks'
  | 'calendar'
  | 'workout-history'
  | 'nutrition-targets'
  | 'settings'
  | 'custom';

export interface CollectionItemData {
  id: string;
  title: string;
  description?: string;
  meta?: string[];
  done?: boolean;
  visible?: boolean;
}

export interface SectionConfig {
  id: string;
  type: SectionType;
  title: string;
  subtitle?: string;
  kicker?: string;
  open?: boolean;
  mode?: 'list' | 'checklist' | 'grid';
  dataKey?: string;
  actions?: UIAction[];
  itemActions?: UIAction[];
  fields?: FieldConfig[];
  items?: CollectionItemData[];
  emptyState?: EmptyStateConfig;
}

export interface PageHeroConfig {
  kicker?: string;
  title: string;
  description?: string;
  actions?: UIAction[];
}

export interface PageConfig {
  id: string;
  route: string;
  title: string;
  hero?: PageHeroConfig;
  actions?: UIAction[];
  sections: SectionConfig[];
}
