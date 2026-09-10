"use client";

import { useState } from "react";
import { TOKEN, tokenIsPublished } from "@/config/contracts";

/**
 * Contract address bar. Sits above the navigation at the very top of the page.
 *
 * Reads TOKEN.isLive and TOKEN.contractAddress from config/contracts.ts and
 * nothing else. Flipping isLive to true and filling contractAddress in that one
 * file is the only change needed to switch this bar from "Coming soon" to the
 * real address with a working copy button.
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
          <span className="cabar-val" title={TOKEN.contractAddress}>
            {TOKEN.contractAddress}
          </span>
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
