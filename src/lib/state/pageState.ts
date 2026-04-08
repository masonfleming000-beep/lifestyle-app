export async function loadRemotePageState<T>(pageKey: string): Promise<T | null> {
  try {
    const res = await fetch(`/api/state?pageKey=${encodeURIComponent(pageKey)}`, {
      credentials: "include",
      cache: "no-store",
    });

    if (!res.ok) return null;
    const data = await res.json();
    return (data?.state ?? null) as T | null;
  } catch (error) {
    console.error("Failed to load state:", error);
    return null;
  }
}

export async function saveRemotePageState<T>(pageKey: string, state: T): Promise<void> {
  try {
    await fetch("/api/state", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageKey, state }),
    });
  } catch (error) {
    console.error("Failed to save state:", error);
  }
}
