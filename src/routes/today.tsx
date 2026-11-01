import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import fitCss from "../fitrpg/ui/style.css?url";

const App = lazy(() => import("../fitrpg/ui/App"));

export const Route = createFileRoute("/today")({
  head: () => ({
    meta: [
      { title: "Today's Workout - Shadow Rise Fitness" },
      { name: "description", content: "Reviewed daily room workouts with confirmed completion and safe server saving." },
      { property: "og:title", content: "Today’s Workout - Shadow Rise Fitness" },
      { property: "og:description", content: "Reviewed daily room workouts with confirmed completion and safe server saving." },
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
        <App page="today" />
      </Suspense>
    </ClientOnly>
  );
}
