import styles from './List.module.css';

export function List<T>(props: {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  selectedIndex?: number;
  onSelectItem?: (index: number) => void;
}) {
  return (
    <ul className={styles.list}>
      {props.items.map((item, index) => (
        <li
          key={index}
          className={`${styles.listItem} ${index === props.selectedIndex ? styles.selected : ''}`}
          onClick={() => props.onSelectItem?.(index)}
        >
          {props.renderItem(item, index)}
        </li>
      ))}
    </ul>
  );
}
