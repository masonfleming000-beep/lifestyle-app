import type { ButtonVariant, UIAction } from './types';

export const actionVariantByKind: Record<string, ButtonVariant> = {
  add: 'secondary',
  edit: 'secondary',
  save: 'primary',
  delete: 'danger',
  remove: 'danger',
  restore: 'secondary',
  clear: 'danger',
  search: 'secondary',
  upload: 'secondary',
  show: 'secondary',
  hide: 'secondary',
  start: 'primary',
  reset: 'secondary',
  apply: 'primary',
  'toggle-layout': 'secondary',
  'change-password': 'secondary',
  'refresh-preview': 'secondary',
  custom: 'secondary',
};

export function createAction(action: UIAction): UIAction {
  return {
    scope: 'section',
    size: 'md',
    variant: action.variant ?? actionVariantByKind[action.kind] ?? 'secondary',
    ...action,
  };
}

export function createActions(actions: UIAction[] = []): UIAction[] {
  return actions.map(createAction);
}
