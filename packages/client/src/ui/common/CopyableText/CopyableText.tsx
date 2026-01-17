import { useState } from "react";
import { Button } from "../Button/Button";
import styles from "./CopyableText.module.css";

export function CopyableText(props: {
  label: string;
  text: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(props.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  };

  return (
    <div className={styles.section}>
      <h2 className={styles.label}>{props.label}</h2>
      <div className={styles.container}>
        <p className={styles.text}>{props.text}</p>
        <Button onClick={handleCopy}>
          {copied ? "Copied!" : "Copy"}
        </Button>
      </div>
    </div>
  );
}
