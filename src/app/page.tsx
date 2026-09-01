import Link from "next/link";
import styles from "./home.module.css";

const steps = [
  {
    number: "01",
    title: "Create in your currency",
    description:
      "Set the work, amount, due date, and receiving wallet in NGN, USD, EUR, or GBP.",
  },
  {
    number: "02",
    title: "Your client pays test USDC",
    description:
      "They open one public link, see the live quote, and pay on Base Sepolia.",
  },
  {
    number: "03",
    title: "Telegraph checks the payment",
    description:
      "PayProof checks the real transaction and turns the same link into a verified receipt.",
  },
];

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <path d="M4 10h12M11 5l5 5-5 5" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <path d="m5 10.5 3.1 3L15.5 6" />
    </svg>
  );
}

function BrandMark() {
  return (
    <span className={styles.brandMark} aria-hidden="true">
      <span />
      <span />
    </span>
  );
}

export default function Home() {
  return (
    <div className={styles.page}>
      <div className={styles.testnetNotice} role="status">
        <span className={styles.noticeDot} />
        Base Sepolia testnet · Test USDC only · No real funds
      </div>

      <header className={styles.header}>
        <Link className={styles.brand} href="/" aria-label="PayProof home">
          <BrandMark />
          PayProof
        </Link>
        <nav className={styles.nav} aria-label="Main navigation">
          <a href="#how-it-works">How it works</a>
          <Link className={styles.navSecondary} href="/dashboard">
            View my invoices
          </Link>
          <Link className={styles.navPrimary} href="/invoices/new">
            Create an invoice
          </Link>
        </nav>
      </header>

      <main id="main-content">
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>Invoices people understand. Proof both sides can trust.</p>
            <h1>Invoice locally. Get paid in USDC. Prove it happened.</h1>
            <p className={styles.lede}>
              Create an invoice in a familiar currency. Your client pays the
              converted amount in test USDC, and Telegraph checks the real Base
              Sepolia transaction—not a screenshot.
            </p>
            <div className={styles.heroActions}>
              <Link className={styles.primaryAction} href="/invoices/new">
                Create an invoice
                <ArrowIcon />
              </Link>
              <Link className={styles.secondaryAction} href="/dashboard">
                View my invoices
              </Link>
            </div>
            <p className={styles.helperText}>No password. Your wallet is your account.</p>
          </div>

          <div className={styles.proofStage} aria-label="Example PayProof invoice and receipt">
            <div className={styles.stageGlow} />
            <article className={styles.invoiceCard}>
              <div className={styles.cardTopline}>
                <span className={styles.cardBrand}>
                  <BrandMark />
                  PAYPROOF
                </span>
                <span className={styles.exampleLabel}>EXAMPLE</span>
              </div>
              <div className={styles.invoiceHeading}>
                <div>
                  <p>INVOICE</p>
                  <strong>PP-1048</strong>
                </div>
                <span className={styles.verifiedPill}>
                  <CheckIcon />
                  Verified
                </span>
              </div>
              <div className={styles.invoiceMeta}>
                <div>
                  <span>Service</span>
                  <strong>Brand identity design</strong>
                </div>
                <div>
                  <span>Due</span>
                  <strong>7 Sep 2026</strong>
                </div>
              </div>
              <div className={styles.amountRow}>
                <div>
                  <span>Invoice amount</span>
                  <strong>₦250,000.00</strong>
                </div>
                <div>
                  <span>Paid</span>
                  <strong>167.42 test USDC</strong>
                </div>
              </div>
              <div className={styles.verificationBox}>
                <div className={styles.verificationTitle}>
                  <span className={styles.checkCircle}>
                    <CheckIcon />
                  </span>
                  <div>
                    <strong>Payment independently checked</strong>
                    <span>Telegraph matched the transaction to this invoice</span>
                  </div>
                </div>
                <ul>
                  <li><CheckIcon /> Correct USDC token</li>
                  <li><CheckIcon /> Exact quoted amount</li>
                  <li><CheckIcon /> Correct recipient</li>
                  <li><CheckIcon /> Successful transaction</li>
                </ul>
              </div>
              <div className={styles.cardFooter}>
                <span>Base Sepolia</span>
                <span>0x7a21…91bf</span>
              </div>
            </article>
          </div>
        </section>

        <section className={styles.howItWorks} id="how-it-works">
          <div className={styles.sectionIntro}>
            <p className={styles.eyebrow}>One link from invoice to receipt</p>
            <h2>A payment flow both people can follow.</h2>
          </div>
          <div className={styles.steps}>
            {steps.map((step) => (
              <article className={styles.step} key={step.number}>
                <span>{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.trustStrip}>
          <div>
            <p className={styles.eyebrow}>Built for a safer test</p>
            <h2>PayProof never holds your funds.</h2>
          </div>
          <p>
            Payment goes directly from the client&apos;s wallet to the freelancer&apos;s
            wallet. PayProof uses Telegraph intelligence to verify what happened
            on Base Sepolia and shows the evidence on one reusable receipt link.
          </p>
        </section>
      </main>

      <footer className={styles.footer}>
        <span className={styles.brand}><BrandMark /> PayProof</span>
        <span>Built on Base Sepolia with Telegraph · Testnet only</span>
      </footer>
    </div>
  );
}
