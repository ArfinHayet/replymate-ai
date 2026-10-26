export function LoadingScreen() {
  return <div className="boot-screen" role="status">
    <div className="spinner" />
    <span>Checking access…</span>
  </div>;
}
