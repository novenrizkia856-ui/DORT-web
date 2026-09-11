import type { Metadata } from "next";
import Link from "next/link";
import Dapp from "@/components/app/Dapp";
import "../dapp.css";

export const metadata: Metadata = {
  title: "DORT App · Give an approval an end date",
  description:
    "Connect a wallet, pick a token approval, and choose when it should end. The permission removes itself when the time arrives.",
};

export default function AppPage() {
  return (
    <main className="dapp">
      <header className="dapp-head">
        <Link className="dapp-brand" href="/" aria-label="DORT home">
          <img src="/brand/lockup-ink.png" alt="DORT" width={480} height={152} />
        </Link>
        <Link className="dapp-back" href="/">
          Back to the site
        </Link>
      </header>

      <div className="dapp-wrap">
        <div className="dapp-intro">
          <div className="eyebrow">The app</div>
          <h1>Give an approval an end date.</h1>
          <p>
            Approve a token the way you always do. Sign one free message here. The permission
            removes itself when the time comes.
          </p>
        </div>

        <Dapp />
      </div>
    </main>
  );
}
