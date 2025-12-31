import styles from './Button.module.css';

export function Button(props: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}) {
  const variant = props.variant || 'primary';
  const type = props.type || 'button';

  return (
    <button
      type={type}
      onClick={props.onClick}
      disabled={props.disabled}
      className={`${styles.button} ${styles[variant]}`}
    >
      {props.children}
    </button>
  );
}
