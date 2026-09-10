import type { Metadata } from "next";
import DocPage from "@/components/docs/DocPage";
import { findItem } from "@/lib/docs-nav";

export const metadata: Metadata = {
  title: findItem("")?.title ?? "Documentation",
};

export default function DocsIndex() {
  return <DocPage slug="" />;
}
