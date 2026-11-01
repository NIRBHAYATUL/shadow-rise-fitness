import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import fitCss from "../fitrpg/ui/style.css?url";

const App = lazy(() => import("../fitrpg/ui/App"));

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings - Shadow Rise Fitness" },
      { name: "description", content: "Shadow Rise Fitness motion preferences and account controls." },
      { property: "og:title", content: "System Settings - Shadow Rise Fitness" },
      { property: "og:description", content: "Shadow Rise Fitness motion preferences and account controls." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "stylesheet", href: fitCss }],
  }),
  component: Page,
});

function Page() {
  return (
    <ClientOnly fallback={<main className="sys" />}>
      <Suspense fallback={<main className="sys" />}>
        <App page="settings" />
      </Suspense>
    </ClientOnly>
  );
}
