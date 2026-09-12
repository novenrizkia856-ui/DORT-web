import ContractAddressBar from "@/components/ContractAddressBar";
import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import Progress from "@/components/Progress";
import Reveal from "@/components/Reveal";
import CountUp from "@/components/CountUp";
import Faq from "@/components/Faq";
import MetricStrip from "@/components/MetricStrip";
import { ExposureBar, ExpiryChart, RememberCompare, TrustSurface } from "@/components/Visuals";
import { CONTRACTS, NETWORK } from "@/config/contracts";
import { shortenAddress as shorten } from "@/lib/format";

export default function Page() {
  return (
    <>
      <Progress />
      <a className="skip" href="#how">
        Skip to content
      </a>

      {/* Section 5.1 · above the navigation, top of the page */}
      <ContractAddressBar />

      {/* Section 5.2 */}
      <Nav />

      {/* Section 5.3 */}
      <Hero />

      {/* Section 5.4 · The Problem */}
      <section id="problem" className="plain">
        <div className="wrap">
          <Reveal className="sec-head">
            <div className="eyebrow">The approval problem</div>
            <h2>
              A permission you granted once can still empty your wallet years later.
            </h2>
            <p>
              Token approvals do not expire. They sit on chain, usually unlimited, long after the
              app that asked for them is forgotten.
            </p>
          </Reveal>

          <div className="pstats">
            <Reveal delay={0}>
              <div className="pstat">
                <div className="pk">Since 2020</div>
                <div className="pv">
                  <CountUp to={362} />
                  <span className="u">million dollars</span>
                </div>
                <p>Lost to attacks that abused token approvals.</p>
              </div>
            </Reveal>
            <Reveal delay={80}>
              <div className="pstat">
                <div className="pk">In a single year</div>
                <div className="pv">
                  Hundreds
                  <span className="u">of millions</span>
                </div>
                <p>Drained by wallet drainers in one year alone.</p>
              </div>
            </Reveal>
            <Reveal delay={160}>
              <div className="pstat">
                <div className="pk">One mistake</div>
                <div className="pv">
                  Tens
                  <span className="u">of millions</span>
                </div>
                <p>Lost by a single wallet to one careless signature.</p>
              </div>
            </Reveal>
          </div>

          <Reveal delay={240}>
            <p className="pnote">
              Each of these began the same way. Someone granted a permission once, and nothing ever
              took it back.
            </p>
          </Reveal>

          <Reveal delay={300}>
            <ExposureBar />
          </Reveal>

          <Reveal delay={360}>
            <div className="ctarow">
              <a className="btn btn-fill btn-lg" href="#how">
                See how an expiry fixes this <span aria-hidden="true">→</span>
              </a>
              <span className="cnote">Five steps. One of them is new.</span>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Section 5.5 · How It Works */}
      <section id="how" className="quiet">
        <div className="wrap">
          <Reveal className="sec-head wide">
            <div className="eyebrow">How it works</div>
            <h2>
              Five steps. Only one of them is <span className="v">new</span>.
            </h2>
            <p>
              You approve tokens the way you already do. DORT adds a single free signature that
              decides when the permission should stop.
            </p>
          </Reveal>

          <Reveal delay={80}>
            <div className="steps">
              {[
                {
                  n: 1,
                  h: "Approve a token as usual",
                  tag: "Standard",
                  cls: "",
                  sub: "Grant the approval the app asks for. Nothing about this step changes.",
                  cost: "NORMAL GAS",
                },
                {
                  n: 2,
                  h: "Sign one message choosing when it ends",
                  tag: "Free",
                  cls: "free",
                  sub: "Name the moment the approval should stop. Signing happens off chain and costs nothing.",
                  cost: "0 GAS",
                },
                {
                  n: 3,
                  h: "Confirm once to start the timer",
                  tag: "Once",
                  cls: "",
                  sub: "One transaction records the expiry on chain. From there the clock runs on its own.",
                  cost: "ONE TX",
                },
                {
                  n: 4,
                  h: "The approval removes itself",
                  tag: "Automatic",
                  cls: "auto",
                  sub: "When the time arrives the allowance is set to zero. You do not have to be there.",
                  cost: "KEEPER PAID",
                },
                {
                  n: 5,
                  h: "Approve again if you still need it",
                  tag: "Optional",
                  cls: "",
                  sub: "Nothing is locked away. Granting a fresh approval is the same single step as before.",
                  cost: "YOUR CHOICE",
                },
              ].map((s) => (
                <div className={`step${s.n === 4 ? " auto" : ""}`} key={s.n}>
                  <div className="step-num">{s.n}</div>
                  <div>
                    <div className="step-h">
                      {s.h}
                      <span className={`step-tag${s.cls ? ` ${s.cls}` : ""}`}>{s.tag}</span>
                    </div>
                    <p className="step-sub">{s.sub}</p>
                  </div>
                  <div className="step-cost">{s.cost}</div>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={160}>
            <ExpiryChart />
          </Reveal>

          <Reveal delay={200}>
            <MetricStrip
              tone="signal"
              items={[
                { value: 0, kicker: "To choose an expiry", label: "Gas to sign the message. It happens off chain.", unit: "gas" },
                { value: 1, kicker: "To arm the timer", label: "One transaction, then the clock runs on its own.", unit: "tx" },
                { value: 0, kicker: "When the time arrives", label: "Actions from you. A keeper executes it.", unit: "steps" },
              ]}
            />
          </Reveal>

          <Reveal delay={260}>
            <div className="ctarow">
              <a className="btn btn-accent btn-lg" href="/app">
                Protect an approval <span aria-hidden="true">→</span>
              </a>
              <a className="btn btn-line btn-lg" href="#security">
                See the security model
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Section 5.6 · Why It Is Different */}
      <section id="different">
        <div className="wrap">
          <Reveal className="sec-head wide">
            <div className="eyebrow">Why it is different</div>
            <h2>
              Not a dashboard. Not a wallet feature. A permission that <span className="v">carries
              its own end date</span>.
            </h2>
            <p>
              Other answers to this problem ask you to remember, to switch wallets, or to wait for a
              standard. DORT works on ordinary wallets today.
            </p>
          </Reveal>

          <Reveal delay={80}>
            <div className="vs">
              <div className="vrow vh">
                <div className="what">On an old approval</div>
                <div className="them">The usual answer</div>
                <div className="us">DORT</div>
              </div>
              {[
                [
                  "Getting it removed",
                  "You have to remember to go and revoke it",
                  <>
                    <b>It ends on the schedule you set</b>, with no action from you
                  </>,
                ],
                [
                  "Where the rule lives",
                  "On a separate site you have to visit",
                  <>
                    <b>On chain</b>, recorded next to the approval itself
                  </>,
                ],
                [
                  "Wallet support",
                  "Needs one wallet vendor's smart account system",
                  <>
                    <b>Any ordinary wallet</b>, with nothing new to install
                  </>,
                ],
                [
                  "What it waits on",
                  "A standard proposal that is still unfinished",
                  <>
                    <b>The approve call that already exists</b> on every ERC 20
                  </>,
                ],
                [
                  "Your funds",
                  "Some tools ask for broad access of their own",
                  <>
                    <b>Never held by the protocol</b>, at any point
                  </>,
                ],
              ].map(([what, them, us], i) => (
                <div className="vrow" key={i}>
                  <div className="what">{what}</div>
                  <div className="them">{them}</div>
                  <div className="us">{us}</div>
                </div>
              ))}
            </div>
          </Reveal>

          <div className="pillars">
            {[
              {
                k: "Ordinary wallets",
                h: "No smart account needed",
                p: "It works with the wallet you already use. There is nothing new to install or migrate.",
              },
              {
                k: "No dashboard",
                h: "Nothing to remember",
                p: "The end date travels with the approval. You never visit a site to revoke anything.",
              },
              {
                k: "No custody",
                h: "Your tokens stay yours",
                p: "The protocol records an expiry and executes it. It never takes control of your funds.",
              },
            ].map((c, i) => (
              <Reveal key={c.k} delay={i * 80}>
                <div className="pil">
                  <div className="pk">{c.k}</div>
                  <h4>{c.h}</h4>
                  <p>{c.p}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={240}>
            <RememberCompare />
          </Reveal>

          <Reveal delay={280}>
            <MetricStrip
              tone="accent"
              items={[
                { value: 0, kicker: "Dashboards", label: "Sites you have to visit and keep checking." },
                { value: 0, kicker: "New wallets", label: "Smart accounts or migrations to go through." },
                { value: 1, kicker: "Signature", label: "One free message decides when it ends." },
              ]}
            />
          </Reveal>

          <Reveal delay={320}>
            <div className="ctarow">
              <a className="btn btn-fill btn-lg" href="#security">
                How the contract is built <span aria-hidden="true">→</span>
              </a>
              <span className="cnote">No owner key. No upgrade path.</span>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Section 5.7 · Security And Trust */}
      <section id="security" className="quiet">
        <div className="wrap">
          <Reveal className="sec-head wide">
            <div className="eyebrow">Security</div>
            <h2>Nothing to trust beyond the code.</h2>
            <p>
              The registry is immutable once deployed. There is no owner key, no admin function and
              no upgrade path.
            </p>
          </Reveal>

          <div className="sec-grid">
            <Reveal delay={0}>
              <div className="slist">
                {[
                  [
                    "No owner key",
                    "No address holds special power over the registry. There is no privileged role to compromise.",
                  ],
                  [
                    "No admin functions",
                    "Nothing can pause, alter or reverse an expiry once it has been recorded.",
                  ],
                  [
                    "No upgrade path",
                    "The deployed code is final. What you read on chain is exactly what runs.",
                  ],
                  [
                    "No custody of funds",
                    "The registry records permissions. It never moves or holds your tokens.",
                  ],
                  [
                    "Permissionless execution",
                    "Anyone can trigger an expiry that is due, for a small reward. There is no gatekeeper.",
                  ],
                ].map(([k, v]) => (
                  <div className="sitem" key={k}>
                    <span className="sitem-ic" aria-hidden="true">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M12 2.8 4.6 6v6c0 4.4 3.1 8.2 7.4 9.2 4.3-1 7.4-4.8 7.4-9.2V6Z"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M8.7 12.2 11 14.5l4.4-4.6"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                    <div>
                      <div className="sitem-k">{k}</div>
                      <p className="sitem-v">{v}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>

            <Reveal delay={80}>
              <div className="saside">
                <div className="saside-h">Deployment</div>
                <dl>
                  <div className="row">
                    <dt>{CONTRACTS.registry.label}</dt>
                    <dd className={CONTRACTS.registry.address ? "on" : "pending"}>
                      {CONTRACTS.registry.address
                        ? shorten(CONTRACTS.registry.address)
                        : "Not deployed"}
                    </dd>
                  </div>
                  <div className="row">
                    <dt>{CONTRACTS.lens.label}</dt>
                    <dd className={CONTRACTS.lens.address ? "on" : "pending"}>
                      {CONTRACTS.lens.address ? shorten(CONTRACTS.lens.address) : "Not deployed"}
                    </dd>
                  </div>
                  <div className="row">
                    <dt>Network</dt>
                    <dd>{NETWORK.name}</dd>
                  </div>
                  <div className="row">
                    <dt>Mainnet chain id</dt>
                    <dd>{NETWORK.chainIdMainnet}</dd>
                  </div>
                  <div className="row">
                    <dt>Testnet chain id</dt>
                    <dd>{NETWORK.chainIdTestnet}</dd>
                  </div>
                  <div className="row">
                    <dt>Gas token</dt>
                    <dd>{NETWORK.nativeGasToken}</dd>
                  </div>
                </dl>
                <p className="saside-note">
                  Both contracts are live and immutable. The registry holds nothing except the
                  bounties attached to jobs that are still open.
                </p>
              </div>
            </Reveal>
          </div>

          <Reveal delay={160}>
            <TrustSurface />
          </Reveal>

          <Reveal delay={200}>
            <MetricStrip
              tone="accent"
              items={[
                { value: 0, kicker: "Owner keys", label: "No address holds power over the registry." },
                { value: 0, kicker: "Admin functions", label: "Nothing can pause, alter or reverse an expiry." },
                { value: 0, kicker: "Upgrade paths", label: "The deployed code is final once it ships." },
              ]}
            />
          </Reveal>

          <Reveal delay={260}>
            <div className="ctarow">
              <a className="btn btn-accent btn-lg" href="/app">
                Open the app <span aria-hidden="true">→</span>
              </a>
              <a
                className="btn btn-line btn-lg"
                href={`${NETWORK.explorerMainnet}/address/${CONTRACTS.registry.address}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Read the contract on chain
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Section 5.10 · FAQ */}
      <section id="faq">
        <div className="wrap">
          <Reveal className="sec-head">
            <div className="eyebrow">Questions</div>
            <h2>Answers, briefly.</h2>
          </Reveal>
          <Reveal delay={80}>
            <Faq />
          </Reveal>

          <Reveal delay={140}>
            <div className="ctarow">
              <a className="btn btn-line btn-lg" href="/docs">
                Still have a question? Read the docs
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Closing call to action */}
      <section className="closing">
        <div className="cwrap">
          <Reveal>
            <h2>Give every approval an end date.</h2>
            <p>
              DORT is live on Robinhood Chain. Read how it works, or read the contract for
              yourself.
            </p>
            <div className="ctarow">
              <a className="btn btn-accent btn-lg" href="/app">
                Open the app <span aria-hidden="true">→</span>
              </a>
              <a
                className="btn btn-line btn-lg"
                href={`${NETWORK.explorerMainnet}/address/${CONTRACTS.registry.address}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Read the contract on chain
              </a>
            </div>
            <div className="cfoot">Built for {NETWORK.name}</div>
          </Reveal>
        </div>
      </section>

      {/* Section 5.11 · Footer */}
      <footer>
        <div className="wrap">
          <div className="foot-grid">
            <div className="foot-brand">
              <img
                className="wm"
                src="/brand/lockup-ink.png"
                alt="DORT"
                width={480}
                height={152}
              />
              <p>
                Every token approval gets an end date you choose, on Robinhood Chain.
              </p>
            </div>
            <div>
              <h5>Protocol</h5>
              <a href="#how">How it works</a>
              <a href="#different">Why DORT</a>
              <a href="#security">Security</a>
            </div>
            <div>
              <h5>Elsewhere</h5>
              <a href="/docs">Documentation</a>
              <a href="#github">GitHub</a>
              <a href="#social">Follow along</a>
            </div>
          </div>
          <div className="foot-bot">
            <span>DORT. Approvals that expire.</span>
            <span className="mono">Built for {NETWORK.name}.</span>
          </div>
        </div>
      </footer>
    </>
  );
}
