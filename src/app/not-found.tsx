import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="glass max-w-sm p-8 text-center">
        <p className="font-display text-5xl font-bold gradient-text">404</p>
        <p className="mt-3 font-display text-lg font-semibold">This page doesn't exist</p>
        <Link href="/board" className="btn-primary mt-6">
          Go to Matches
        </Link>
      </div>
    </div>
  );
}
