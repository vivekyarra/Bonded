/** Re-mounts on every navigation, so each screen glides in like a native app. */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-rise">{children}</div>;
}
