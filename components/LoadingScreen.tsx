/**
 * LoadingScreen — branded full-page loading state with logo pulse animation.
 * Use this instead of text-based "Memuat..." states across the app.
 */
export default function LoadingScreen({ message }: { message?: string }) {
  return (
    <div className="loading-screen">
      <div className="loading-screen__inner">
        <img
          src="/logo-icon.svg"
          alt="UC Connect"
          className="loading-screen__logo"
        />
        <p className="loading-screen__text">{message ?? "Memuat..."}</p>
        <div className="loading-screen__bar">
          <div className="loading-screen__bar-fill" />
        </div>
      </div>
    </div>
  );
}
