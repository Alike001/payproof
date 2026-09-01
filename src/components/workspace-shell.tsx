import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./workspace-shell.module.css";

function BrandMark() {
  return (
    <span className={styles.brandMark} aria-hidden="true">
      <span />
      <span />
    </span>
  );
}

export function WorkspaceShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className={styles.page}>
      <div className={styles.testnetNotice} role="status">
        Base Sepolia testnet · Test USDC only · No real funds
      </div>
      <header className={styles.header}>
        <Link className={styles.brand} href="/" aria-label="PayProof home">
          <BrandMark /> PayProof
        </Link>
        <Link className={styles.homeLink} href="/">Back to home</Link>
      </header>
      <main className={styles.main} id="main-content">
        <section className={styles.intro}>
          <p>{eyebrow}</p>
          <h1>{title}</h1>
          <span>{description}</span>
        </section>
        {children}
      </main>
    </div>
  );
}
