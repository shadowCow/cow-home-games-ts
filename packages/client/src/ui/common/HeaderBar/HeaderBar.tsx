import { FaUserCircle } from 'react-icons/fa';
import { User } from '../../../services/auth/User';
import styles from './HeaderBar.module.css';

export function HeaderBar(props: { user: User }) {
  return (
    <div className={styles.headerBar}>
      <span className={styles.username}>{props.user.username}</span>
      <FaUserCircle className={styles.userIcon} />
    </div>
  );
}
