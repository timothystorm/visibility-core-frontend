import { useVisibilityContext } from '@fedex/context';
import { lazy, Suspense } from 'react';

const LazyRemoteSlot = lazy(() => import('./remotes/RemoteSlot').then((m) => ({ default: m.RemoteSlot })));

/**
 * The main application component that displays portal and visibility contexts
 * and loads all remote slot components.
 * @constructor
 */
export function App() {
  const visibilityContext = useVisibilityContext();

  return (
    <>
      <h1>Visibility Host</h1>
      <Suspense fallback={<div>Loading remote...</div>}>
        <LazyRemoteSlot remoteName="status"></LazyRemoteSlot>
      </Suspense>

      <pre style={{fontSize: 'x-small', color: 'lightgrey'}}>
        visibilityContext: <code>{JSON.stringify(visibilityContext)}</code>
      </pre>
    </>
  );
}

export default App;
