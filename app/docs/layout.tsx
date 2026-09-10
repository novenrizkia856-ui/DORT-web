import type { Metadata } from "next";
import Link from "next/link";
import { DocsSidebar } from "@/components/docs/DocsShell";
import "../docs.css";

export const metadata: Metadata = {
  title: {
    default: "DORT Documentation",
    template: "%s · DORT Docs",
  },
  description:
    "How DORT gives an ERC 20 approval a self chosen expiry date, and how to build on it.",
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="docs">
      <header className="docs-head">
        <div className="docs-head-in">
          <Link className="docs-brand" href="/">
            DORT
          </Link>
          <span className="docs-brand-tag">Docs</span>
          <nav className="docs-head-nav">
            <Link href="/app">Open the app</Link>
            <a
              href="https://robinhoodchain.blockscout.com/address/0x638a279363f28f7c25aa3c5132eb5b99e198e1f1"
              target="_blank"
              rel="noopener noreferrer"
            >
              Contract
            </a>
          </nav>
        </div>
      </header>

      <div className="docs-body">
        <DocsSidebar />
        {children}
      </div>
    </div>
  );
}
