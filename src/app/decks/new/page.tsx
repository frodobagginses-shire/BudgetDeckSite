import { NewDeckForm } from "@/components/decks/new-deck-form";

export default function NewDeckPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-6 py-12">
      <h1 className="text-2xl font-bold tracking-tight">New deck</h1>
      <NewDeckForm />
    </main>
  );
}
