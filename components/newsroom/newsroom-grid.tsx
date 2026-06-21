"use client";

import { useState } from "react";
import Link from "next/link";
import type { NewsArticle, NewsTopic } from "@/lib/newsroom-data";
import { newsTopics } from "@/lib/newsroom-data";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });
}

export function ArticleCard({ article }: { article: NewsArticle }) {
  return (
    <Link href={`/newsroom/${article.slug}`} className="group block">
      <div className={`relative aspect-[1.4] overflow-hidden rounded-2xl bg-gradient-to-br ${article.heroTone}`}>
        <span className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('/newsroom/${article.slug}.svg')` }} />
      </div>
      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#8a6a3f]">{article.topic}</p>
      <h3 className="mt-1 font-semibold leading-snug transition group-hover:underline">{article.title}</h3>
      <p className="mt-2 text-sm text-black/55">{formatDate(article.date)}</p>
    </Link>
  );
}

export function NewsroomGrid({ articles }: { articles: NewsArticle[] }) {
  const [topic, setTopic] = useState<"All" | NewsTopic>("All");
  const filtered = topic === "All" ? articles : articles.filter((article) => article.topic === topic);

  return (
    <div>
      <div className="no-scrollbar touch-scroll flex gap-2 overflow-x-auto pb-1">
        {(["All", ...newsTopics] as const).map((entry) => (
          <button
            key={entry}
            type="button"
            onClick={() => setTopic(entry)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
              topic === entry ? "bg-black text-white" : "border border-black/15 text-black/70 hover:bg-black/[0.04]"
            }`}
          >
            {entry}
          </button>
        ))}
      </div>
      <div className="mt-6 grid gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-4">
        {filtered.map((article) => (
          <ArticleCard key={article.slug} article={article} />
        ))}
      </div>
    </div>
  );
}
