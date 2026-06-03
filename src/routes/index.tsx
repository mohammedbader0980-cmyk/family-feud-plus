import { createFileRoute } from "@tanstack/react-router";
import FamilyFeud from "@/components/FamilyFeud";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "صراع العائلات - لعبة Family Feud العربية" },
      {
        name: "description",
        content:
          "لعبة صراع العائلات التفاعلية بالعربية - 50 سؤال جاهز، أضف أسئلتك، احفظ مجموعاتك، والعب مع أصدقائك.",
      },
      { property: "og:title", content: "صراع العائلات - Family Feud" },
      {
        property: "og:description",
        content: "لعبة عائلية تفاعلية مع كتالوج أسئلة جاهز وإمكانية إضافة أسئلتك الخاصة.",
      },
    ],
  }),
  component: () => <FamilyFeud />,
});
