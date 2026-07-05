import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { ProfileForm } from "@/components/account/profile-form";

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("handle, display_name, avatar_url")
    .eq("id", user.id)
    .single();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-16">
      <h1 className="text-3xl font-bold tracking-tight">Your account</h1>

      <ProfileForm
        handle={profile?.handle ?? ""}
        displayName={profile?.display_name ?? ""}
      />

      <div className="border-border bg-card rounded-xl border p-5 text-sm">
        <span className="text-muted-foreground">Email: </span>
        <span className="font-medium">{user.email}</span>
        <p className="text-muted-foreground mt-1 text-xs">
          Your email is private and never shown on your public profile.
        </p>
      </div>

      <div className="flex items-center gap-4">
        <SignOutButton />
        {profile?.handle && (
          <Link
            href={`/users/${profile.handle}`}
            className="text-muted-foreground hover:text-foreground text-sm"
          >
            View public profile
          </Link>
        )}
      </div>
    </main>
  );
}
