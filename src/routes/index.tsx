import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import fitCss from "../fitrpg/ui/style.css?url";

const App = lazy(() => import("../fitrpg/ui/App"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Room Fitness RPG" },
      { name: "description", content: "Level up your hunter with daily home workout quests." },
      { property: "og:title", content: "Room Fitness RPG" },
      { property: "og:description", content: "Level up your hunter with daily home workout quests." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "stylesheet", href: fitCss }],
  }),
  component: Index,
});

function Index() {
  return (
    <ClientOnly fallback={<main className="sys" />}>
      <Suspense fallback={<main className="sys" />}>
        <App />
      </Suspense>
    </ClientOnly>
  );
}
