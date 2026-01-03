import { RemoteError } from './remoteError';
import styles from './RemoteErrorComponent.module.css';

const isDev = import.meta.env.DEV;

export default function RemoteErrorComponent({ remote, error }: { remote: string; error: RemoteError }) {
  const message = isDev ? error.message : 'This section is temporarily unavailable.';
  return (
    <div className={styles.container}>
      <strong className={styles.title}>./{remote} failed to load</strong>
      <div className={styles.messag}>{message}</div>
      {isDev && <p>$ You are in DEV env, this is expected</p>}
    </div>
  );
}
