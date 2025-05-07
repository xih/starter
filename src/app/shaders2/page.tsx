// app/shaders/page.tsx
import Link from "next/link";
import { ALL_SLUGS, SHADERS } from "./data";
import FamilyDrawer from "~/components/FamilyDrawer";

export default function ShadersIndex() {
  return (
    <main style={{ padding: 20 }}>
      <h1>All Shaderssss</h1>

      <ul>
        {ALL_SLUGS.map((slug) => (
          <li key={slug}>
            <Link href={`/shaders2/${slug}`}>{SHADERS[slug].title}</Link>
          </li>
        ))}
      </ul>
      <FamilyDrawer />
    </main>
  );
}
