import { createFileRoute } from "@tanstack/react-router";
import FamilyFeud from "@/components/FamilyFeud";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "حارة البطل - لعبة العائلات التفاعلية" },
      {
        name: "description",
        content:
          "حارة البطل: لعبة العائلات التفاعلية بالعربية - 50 سؤال جاهز، أضف أسئلتك وأغانيك المفضلة، واستمتع مع أصدقائك.",
      },
      { property: "og:title", content: "حارة البطل" },
      {
        property: "og:description",
        content: "لعبة عائلية تفاعلية مع كتالوج أسئلة جاهز، أسئلة مخصصة، وأغاني من اختيارك.",
      },
    ],
  }),
  component: () => <FamilyFeud />,
});
