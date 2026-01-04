import styles from './RemoteErrorComponent.module.css';
import { useVisibilityContext } from '@fedex/context';
import { RemoteError } from '../remotes/remoteError';

export default function RemoteErrorComponent({ remote, error }: { remote: string; error: RemoteError }) {
  const context = useVisibilityContext();
  const isDev = context.env === 'development';
  const message = isDev ? error.message : 'This section is temporarily unavailable.';
  return (
    <div className={styles.container}>
      <strong className={styles.title}>./{remote} failed to load</strong>
      <div className={styles.message}>{message}</div>
      {isDev && <p>$ You are in DEV env, this is expected</p>}
    </div>
  );
}
