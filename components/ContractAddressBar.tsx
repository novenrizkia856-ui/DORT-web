"use client";

import { useState } from "react";
import { TOKEN, tokenExplorerUrl, tokenIsPublished } from "@/config/contracts";
import { shortenAddress } from "@/lib/format";

/**
 * Contract address bar. Sits above the navigation at the very top of the page.
 *
 * Everything here follows one value: the address in config/token.ts. Paste an
 * address there and this bar stops saying "Coming soon", shows the address,
 * enables the copy button and links through to the explorer. There is no second
 * switch to remember on launch day.
 */
export default function ContractAddressBar() {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!tokenIsPublished) return;

    const ok = await writeToClipboard(TOKEN.contractAddress);
    if (!ok) return; /* Never claim success we did not achieve. */

    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="cabar">
      {/* Low opacity amber sweep. Reads as anticipation, not as a broken bar. */}
      {!tokenIsPublished && <div className="cabar-shine" aria-hidden="true" />}

      <div className="cabar-in">
        <span className="cabar-lbl">Token contract</span>

        {tokenIsPublished ? (
          <a
            className="cabar-val"
            href={tokenExplorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            title={`${TOKEN.contractAddress} · open on the explorer`}
          >
            {/* The full address fits down to 600px. Below that it would be cut off mid
                character, so the shortened form takes over. The copy button always copies
                the whole thing regardless of which one is on screen. */}
            <span className="ca-full">{TOKEN.contractAddress}</span>
            <span className="ca-short">{shortenAddress(TOKEN.contractAddress)}</span>
          </a>
        ) : (
          <span className="cabar-val pending">Coming soon</span>
        )}

        <span className="cabar-wrapbtn">
          <button
            type="button"
            className={`cabar-copy${copied ? " done" : ""}`}
            onClick={copy}
            disabled={!tokenIsPublished}
            aria-label={
              tokenIsPublished
                ? "Copy the contract address"
                : "Copying is unavailable until an address is published"
            }
          >
            {copied ? <CheckIcon /> : <CopyIcon />}
          </button>
          {!tokenIsPublished && (
            <span className="cabar-tip" role="tooltip">
              No address to copy yet.
            </span>
          )}
        </span>
      </div>
    </div>
  );
}

/**
 * Async Clipboard first, with the legacy selection copy as a fallback for
 * browsers that refuse the permission or are not in a secure context.
 * Returns whether the text actually made it to the clipboard.
 */
async function writeToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    /* Fall through to the legacy path. */
  }

  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "0";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

function CopyIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="9" y="9" width="11" height="11" rx="2.5" stroke="currentColor" strokeWidth="2" />
      <path
        d="M5 15H4.5A1.5 1.5 0 0 1 3 13.5v-9A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5V5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 12.5 9.5 18 20 6.5"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
