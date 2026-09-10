import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DocPage from "@/components/docs/DocPage";
import { FLAT, findItem } from "@/lib/docs-nav";
import { docExists } from "@/lib/docs";

/** Every documentation page is a static file. Nothing is rendered on demand. */
export function generateStaticParams() {
  return FLAT.filter((i) => i.slug !== "").map((i) => ({ slug: i.slug.split("/") }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const item = findItem(slug.join("/"));
  return { title: item?.title ?? "Documentation", description: item?.blurb };
}

export default async function DocsCatchAll({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const joined = slug.join("/");
  if (!findItem(joined) || !docExists(joined)) notFound();
  return <DocPage slug={joined} />;
}
