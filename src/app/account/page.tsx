import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/auth/sign-out-button";

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

      <div className="border-border bg-card flex flex-col gap-2 rounded-xl border p-5">
        <div className="text-sm">
          <span className="text-muted-foreground">Handle: </span>
          <span className="font-medium">@{profile?.handle ?? "—"}</span>
        </div>
        <div className="text-sm">
          <span className="text-muted-foreground">Name: </span>
          <span className="font-medium">
            {profile?.display_name ?? "—"}
          </span>
        </div>
        <div className="text-sm">
          <span className="text-muted-foreground">Email: </span>
          <span className="font-medium">{user.email}</span>
        </div>
      </div>

      <div>
        <SignOutButton />
      </div>
    </main>
  );
}
