import Link from "next/link";

export default function AuthCodeError() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-20 text-center">
      <h1 className="text-2xl font-bold">Sign-in didn&apos;t complete</h1>
      <p className="text-muted-foreground max-w-md">
        Something went wrong finishing your sign-in. This usually clears up on a
        second try.
      </p>
      <Link
        href="/login"
        className="bg-primary text-primary-foreground inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium hover:opacity-90"
      >
        Back to sign in
      </Link>
    </main>
  );
}
