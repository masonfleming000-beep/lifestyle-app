import type { NoteCollectionItem, QuoteCollectionItem, RendererPageConfig } from "../../types/ui";

export const homePageKey = "home";
export const homeNavViewStorageKey = "home-nav-view";

export const homeNavCards = [
  { href: "/today", title: "Today", text: "Daily dashboard, routines, and priorities." },
  { href: "/fitness", title: "Fitness", text: "Training hub for running and lifting." },
  { href: "/nutrition", title: "Nutrition", text: "Macros, food reminders, and tracking." },
  { href: "/mind", title: "Mind", text: "Recovery, yoga, and calming techniques." },
  { href: "/education", title: "Education", text: "Classes, school goals, and planning." },
  { href: "/work", title: "Work", text: "Tasks, meetings, sections, and deadlines." },
  { href: "/career", title: "Career", text: "Professional direction, projects, and skills." },
  { href: "/hobbies", title: "Hobbies", text: "Personal interests and development." },
] as const;

export const defaultQuotes = [
  {
    text: "Life is like riding a bicycle. To keep your balance, you must keep moving.",
    author: "Albert Einstein",
  },
  {
    text: "Be true to what you do.",
    author: "Personal reminder",
  },
  {
    text: "Believe you can, and you're halfway there.",
    author: "Theodore Roosevelt",
  },
] as const satisfies readonly QuoteCollectionItem[];

export const defaultMorals = [
  { title: "Integrity", text: "Do what is right without a promised recognition." },
  { title: "Karma", text: "Treat others how you would want to be treated." },
  { title: "Respect", text: "Respect does not need to be earned but can be lost." },
  { title: "Purpose", text: "Work at things that genuinely matter to you." },
  { title: "Focus", text: "Do not be influenced to do things by people that do not align with oneself." },
  { title: "Health", text: "Exercise your body and mind as much as needed and stay connected to nature." },
  { title: "Confidence", text: "Trust in yourself and strengthen your confidence slowly through practice." },
] as const satisfies readonly NoteCollectionItem[];

export interface HomeState {
  quotes: QuoteCollectionItem[];
  morals: NoteCollectionItem[];
  removedDefaultQuotes: string[];
  removedDefaultMorals: string[];
}

export const homeHeroActions = [
  { label: "Open Today", href: "/today", variant: "primary" },
  { label: "Career Hub", href: "/career", variant: "secondary" },
] as const;

export const homePageConfig: RendererPageConfig = {
  hero: {
    kicker: "Home",
    title: "Your life, organized simply.",
    description: "Use this page as the main hub. Tap into each area below.",
  },
  sections: [
    {
      kind: "quick-links",
      key: "navigate",
      title: "Navigate",
      subtitle: "Choose a section.",
      items: [...homeNavCards],
      columns: 2,
      containerId: "nav-cards",
      containerClassName: "quick-links-grid--grid",
      actions: [
        {
          label: "Grid",
          id: "home-nav-grid-btn",
          variant: "secondary",
          className: "view-btn is-active",
          dataAction: "grid",
        },
        {
          label: "List",
          id: "home-nav-list-btn",
          variant: "secondary",
          className: "view-btn",
          dataAction: "list",
        },
      ],
    },
    {
      kind: "card-collection",
      key: "quotes",
      title: "Featured Quotes",
      subtitle: "Open when you want perspective.",
      open: true,
      listId: "quotes-list",
      cardVariant: "quote",
      items: [...defaultQuotes],
      emptyText: "No quotes yet. Add one above.",
      form: {
        id: "quote-form",
        fields: [
          {
            id: "quote-text",
            name: "quoteText",
            label: "Quote text",
            placeholder: "Quote text",
            required: true,
            hiddenLabel: true,
            inputClassName: "text-input",
          },
          {
            id: "quote-author",
            name: "quoteAuthor",
            label: "Author or reminder source",
            placeholder: "Author or reminder source",
            hiddenLabel: true,
            inputClassName: "text-input",
          },
        ],
        actions: [{ label: "Add Quote", type: "submit", variant: "primary" }],
      },
      actions: [
        { label: "Restore Default Quotes", id: "restore-quotes-btn", variant: "secondary" },
      ],
    },
    {
      kind: "card-collection",
      key: "reminders",
      title: "Core Reminders",
      subtitle: "Keep these tucked away until needed.",
      open: false,
      listId: "reminders-list",
      cardVariant: "note",
      items: [...defaultMorals],
      emptyText: "No reminders yet. Add one above.",
      form: {
        id: "reminder-form",
        fields: [
          {
            id: "reminder-title",
            name: "reminderTitle",
            label: "Reminder title",
            placeholder: "Reminder title",
            required: true,
            hiddenLabel: true,
            inputClassName: "text-input",
          },
          {
            id: "reminder-text",
            name: "reminderText",
            type: "textarea",
            label: "Reminder details",
            placeholder: "Reminder details",
            required: true,
            hiddenLabel: true,
            rows: 4,
            inputClassName: "text-input",
          },
        ],
        actions: [{ label: "Add Reminder", type: "submit", variant: "primary" }],
      },
      actions: [
        { label: "Restore Default Reminders", id: "restore-reminders-btn", variant: "secondary" },
      ],
    },
  ],
};

export const homeClientConfig = {
  pageKey: homePageKey,
  navViewStorageKey: homeNavViewStorageKey,
  defaults: {
    quotes: [...defaultQuotes],
    morals: [...defaultMorals],
    removedDefaultQuotes: [],
    removedDefaultMorals: [],
  } satisfies HomeState,
  sections: {
    navigation: {
      containerId: "nav-cards",
      gridButtonId: "home-nav-grid-btn",
      listButtonId: "home-nav-list-btn",
    },
    quotes: {
      listId: "quotes-list",
      formId: "quote-form",
      textInputId: "quote-text",
      secondaryInputId: "quote-author",
      restoreButtonId: "restore-quotes-btn",
      emptyText: "No quotes yet. Add one above.",
    },
    morals: {
      listId: "reminders-list",
      formId: "reminder-form",
      textInputId: "reminder-title",
      secondaryInputId: "reminder-text",
      restoreButtonId: "restore-reminders-btn",
      emptyText: "No reminders yet. Add one above.",
    },
  },
};
