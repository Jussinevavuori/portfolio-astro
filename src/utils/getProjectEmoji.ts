import type { CollectionEntry } from "astro:content";

export function getProjectEmoji(type: CollectionEntry<"projects">["data"]["type"]) {
  switch (type) {
    case "client":
      return "💼";
    case "personal":
      return "🔨";
    case "school":
      return "🎓";
  }
}
