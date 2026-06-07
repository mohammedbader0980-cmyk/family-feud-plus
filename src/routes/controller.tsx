import { createFileRoute } from "@tanstack/react-router";
import FeudController from "@/components/FeudController";

export const Route = createFileRoute("/controller")({
  head: () => ({
    meta: [
      { title: "وحدة التحكم - حارة البطل" },
      { name: "description", content: "وحدة تحكم الجوال للعبة حارة البطل" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1" },
    ],
  }),
  component: () => <FeudController />,
});
