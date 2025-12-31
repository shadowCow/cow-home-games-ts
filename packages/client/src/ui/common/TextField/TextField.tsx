import styles from './TextField.module.css';

export function TextField(props: {
  id?: string;
  type?: 'text' | 'password' | 'email';
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
}) {
  const type = props.type || 'text';

  return (
    <div className={styles.container}>
      {props.label && (
        <label htmlFor={props.id} className={styles.label}>
          {props.label}
          {props.required && <span className={styles.required}>*</span>}
        </label>
      )}
      <input
        id={props.id}
        type={type}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
        disabled={props.disabled}
        required={props.required}
        className={`${styles.input} ${props.error ? styles.inputError : ''}`}
      />
      {props.error && <div className={styles.error}>{props.error}</div>}
    </div>
  );
}
