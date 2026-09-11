import { getStore } from "@netlify/blobs";

export type StudyNote = {
  id: string; chapter: number; section: number; authorName: string;
  authorEmail: string; emailHash: string; ipHash: string; content: string;
  status: "pending" | "approved" | "rejected"; createdAt: string;
  moderatedAt?: string; moderatorEmail?: string;
};
export function notesStore() {
  return getStore({ name: "confesion-study-notes", consistency: "strong" });
}
export async function listNotes(): Promise<StudyNote[]> {
  const store = notesStore();
  const notes: StudyNote[] = [];
  for await (const page of store.list({ prefix: "notes/", paginate: true })) {
    for (let offset = 0; offset < page.blobs.length; offset += 20) {
      const batch = await Promise.all(page.blobs.slice(offset, offset + 20)
        .map(({ key }) => store.get(key, { type: "json" }) as Promise<StudyNote | null>));
      notes.push(...batch.filter((note): note is StudyNote => note !== null));
    }
  }
  return notes.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
