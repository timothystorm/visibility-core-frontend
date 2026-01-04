import { useVisibilityContext } from '@fedex/context';

/**
 * The main application component that displays the visibility context.
 */
export function App() {
  const visibilityContext = useVisibilityContext();
  return (
    <>
      <h3 className="status_header">Status Remote</h3>
      <pre style={{ fontSize: 'x-small', color: 'lightgrey' }}>
        visibilityContext: <code>{JSON.stringify(visibilityContext)}</code>
      </pre>
    </>
  );
}

export default App;
