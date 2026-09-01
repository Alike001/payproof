import Link from "next/link";
import styles from "./authenticated-preview.module.css";

export function AuthenticatedPreview({
  address,
  kind,
}: {
  address: string;
  kind: "dashboard" | "invoice";
}) {
  return (
    <section className={styles.panel} aria-label="Authenticated creator area">
      <span className={styles.ready}>Creator access confirmed</span>
      <h2>{kind === "invoice" ? "Your invoice form comes next" : "Your invoice history comes next"}</h2>
      <p>
        PayProof will use <strong>{address}</strong> as the receiving wallet.
        It will come from this verified session—not from an editable form field.
      </p>
      <div className={styles.actions}>
        {kind === "invoice" ? (
          <Link href="/dashboard">View my invoices</Link>
        ) : (
          <Link href="/invoices/new">Create an invoice</Link>
        )}
      </div>
    </section>
  );
}
