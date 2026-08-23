import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    // The app opens straight into the workspace; the _authenticated gate
    // sends signed-out visitors to /auth.
    throw redirect({ to: "/dashboard" });
  },
  head: () => ({
    meta: [
      { title: "EduOS — Learning Intelligence for Tutoring Centers" },
      {
        name: "description",
        content:
          "Role-based dashboards, learner profiles, and mastery tracking for modern tutoring centers.",
      },
      { property: "og:title", content: "EduOS — Learning Intelligence for Tutoring Centers" },
      {
        property: "og:description",
        content:
          "Role-based dashboards, learner profiles, and mastery tracking for modern tutoring centers.",
      },
    ],
  }),
});
