// app/shaders/page.tsx
import Link from "next/link";
import { ALL_SLUGS, SHADERS } from "./data";

export default function ShadersIndex() {
  return (
    <main style={{ padding: 20 }}>
      <h1>All Shaders</h1>
      <ul>
        {ALL_SLUGS.map((slug) => (
          <li key={slug}>
            <Link href={`/shaders/${slug}`}>{SHADERS[slug].title}</Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
