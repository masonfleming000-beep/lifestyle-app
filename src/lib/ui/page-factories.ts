import type { PageConfig, SectionConfig, UIAction } from './types';
import { createActions } from './actions';

export function section(config: SectionConfig): SectionConfig {
  return {
    open: true,
    actions: createActions(config.actions),
    itemActions: createActions(config.itemActions),
    ...config,
  };
}

export function page(config: PageConfig): PageConfig {
  return {
    actions: createActions(config.actions),
    hero: config.hero
      ? {
          ...config.hero,
          actions: createActions(config.hero.actions),
        }
      : undefined,
    sections: config.sections.map(section),
    ...config,
  };
}

export function action(id: string, label: string, kind: UIAction['kind'], handler?: string): UIAction {
  return { id, label, kind, handler };
}
