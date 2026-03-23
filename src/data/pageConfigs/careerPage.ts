import type { ConfigDrivenPage } from "../../types/ui";

export const careerPageConfig: ConfigDrivenPage = {
  meta: {
    title: "Career | Lifestyle App",
    description: "Career hub",
  },
  hero: {
    kicker: "Career",
    title: "Build once. Curate later.",
    description:
      "Use the information side to add, organize, and manage your career content. Use the portfolio side to show only the pieces you want public-facing.",
  },
  sections: [
    {
      kind: "quick-links",
      key: "career-links",
      columns: 2,
      items: [
        {
          href: "/career/portfolio",
          title: "Portfolio",
          text: "Public-facing view. Only displays the items you choose to show.",
        },
        {
          href: "/career/information",
          title: "Information",
          text:
            "Add and manage projects, work experience, school development, story, stats, timeline, STAR moments, and more.",
        },
      ],
    },
    {
      kind: "static-list",
      key: "career-how-it-works",
      title: "How this works",
      surface: "card",
      items: [
        "Add content in the Information page.",
        "Mark items as visible in portfolio when you want them public.",
        "Portfolio automatically reads and displays only selected content.",
        "Each section uses a layout that fits what it contains.",
      ],
    },
  ],
};
