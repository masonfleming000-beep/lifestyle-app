export type ActionVariant = "primary" | "secondary" | "danger";
export type ActionAlign = "start" | "end" | "between";
export type CardSurface = "card" | "expandable";
export type GridColumns = 1 | 2 | 3;
export type EditableCollectionMode = "list" | "checklist";

export interface PageMetaConfig {
  title: string;
  description?: string;
}

export interface HeroConfig {
  kicker?: string;
  title: string;
  description?: string;
}

export interface ActionItemConfig {
  label: string;
  id?: string;
  href?: string;
  type?: "button" | "submit" | "reset";
  variant?: ActionVariant;
  disabled?: boolean;
  className?: string;
  dataAction?: string;
}

export interface QuickLinkItemConfig {
  href: string;
  title: string;
  text?: string;
}

export interface BaseSectionConfig {
  key: string;
  title?: string;
  subtitle?: string;
  kicker?: string;
  surface?: CardSurface;
  open?: boolean;
}

export interface QuickLinksNodeConfig {
  kind: "quick-links";
  key: string;
  columns?: GridColumns;
  items: QuickLinkItemConfig[];
}

export interface ActionsNodeConfig {
  kind: "actions";
  key: string;
  align?: ActionAlign;
  wrap?: boolean;
  actions: ActionItemConfig[];
}

export interface EditableCollectionSectionConfig extends BaseSectionConfig {
  kind: "editable-collection";
  mode: EditableCollectionMode;
  listId: string;
  editButtonId: string;
  emptyText?: string;
}

export interface TargetSectionConfig extends BaseSectionConfig {
  kind: "target";
  containerId: string;
  bodyClass?: string;
}

export interface StaticListSectionConfig extends BaseSectionConfig {
  kind: "static-list";
  items: Array<string | { text: string; title?: string }>;
}

export type LeafSectionConfig =
  | EditableCollectionSectionConfig
  | TargetSectionConfig
  | StaticListSectionConfig;

export interface GroupNodeConfig {
  kind: "group";
  key: string;
  columns?: GridColumns;
  children: LeafSectionConfig[];
}

export type PageNodeConfig =
  | QuickLinksNodeConfig
  | ActionsNodeConfig
  | GroupNodeConfig
  | LeafSectionConfig;

export interface ConfigDrivenPage {
  meta: PageMetaConfig;
  hero: HeroConfig;
  sections: PageNodeConfig[];
}

export interface ChecklistItem {
  text: string;
  done?: boolean;
}

export interface EditableCollectionState {
  items: Array<string | ChecklistItem>;
  removedDefaults?: string[];
}

export interface EditableCollectionsPageState {
  collections: Record<string, EditableCollectionState>;
  [key: string]: unknown;
}

export type RendererFieldType = "text" | "url" | "email" | "number" | "search" | "textarea";

export interface RendererFieldConfig {
  id: string;
  name: string;
  type?: RendererFieldType;
  label?: string;
  placeholder?: string;
  helpText?: string;
  required?: boolean;
  className?: string;
  inputClassName?: string;
  hiddenLabel?: boolean;
  rows?: number;
}

export interface RendererFormConfig {
  id: string;
  className?: string;
  hidden?: boolean;
  fields: RendererFieldConfig[];
  actions?: ActionItemConfig[];
}

export interface RendererHelperTextConfig {
  id: string;
  text: string;
  className?: string;
  hidden?: boolean;
}

export interface RendererActionGroupConfig {
  id?: string;
  className?: string;
  hidden?: boolean;
  align?: ActionAlign;
  actions: ActionItemConfig[];
}

interface RendererBaseSectionConfig {
  key: string;
  id?: string;
  title: string;
  subtitle?: string;
  kicker?: string;
}

export interface RendererChecklistSectionConfig extends RendererBaseSectionConfig {
  kind: "checklist";
  listId: string;
  form?: RendererFormConfig;
  actions?: ActionItemConfig[];
  items?: Array<string | ChecklistItem>;
  emptyText?: string;
  mode?: EditableCollectionMode;
  sectionClassName?: string;
  listDataKey?: string;
}

export interface RendererEmbedSectionConfig extends RendererBaseSectionConfig {
  kind: "embed";
  actions?: ActionItemConfig[];
  form?: RendererFormConfig;
  helperText?: RendererHelperTextConfig;
  auxiliaryActions?: RendererActionGroupConfig;
  containerId: string;
  containerClassName?: string;
  sectionClassName?: string;
}

export interface RendererGroupSectionConfig {
  kind: "group";
  key: string;
  columns?: GridColumns;
  children: Array<RendererChecklistSectionConfig | RendererEmbedSectionConfig>;
}

export type RendererSectionConfig =
  | RendererChecklistSectionConfig
  | RendererEmbedSectionConfig
  | RendererGroupSectionConfig;

export interface RendererPageConfig {
  hero: HeroConfig;
  sections: RendererSectionConfig[];
}
