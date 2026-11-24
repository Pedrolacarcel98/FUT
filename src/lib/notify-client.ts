export async function sendNotification(
  payload: Record<string, unknown>
): Promise<{ ok: boolean; sent?: number; skipped?: boolean; error?: string }> {
  try {
    const res = await fetch("/api/notifications/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    return data;
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error de red",
    };
  }
}
