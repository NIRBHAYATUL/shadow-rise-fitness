import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import fitCss from "../fitrpg/ui/style.css?url";

const App = lazy(() => import("../fitrpg/ui/App"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard - Shadow Rise Fitness" },
      { name: "description", content: "Sung Jinwoo player status, cosmetic ranks and reviewed daily workout quests." },
      { property: "og:title", content: "Dashboard - Shadow Rise Fitness" },
      { property: "og:description", content: "Sung Jinwoo player status, cosmetic ranks and reviewed daily workout quests." },
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
