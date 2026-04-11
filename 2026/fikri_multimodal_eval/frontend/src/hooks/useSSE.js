import { useCallback, useRef, useState } from "react";
export function useSSE() {
    const [events, setEvents] = useState([]);
    const [running, setRunning] = useState(false);
    const abortRef = useRef(null);
    const start = useCallback(async (url, body) => {
        setEvents([]);
        setRunning(true);
        abortRef.current = new AbortController();
        try {
            const resp = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
                signal: abortRef.current.signal,
            });
            const reader = resp.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";
            while (true) {
                const { done, value } = await reader.read();
                if (done)
                    break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() || "";
                for (const line of lines) {
                    if (line.startsWith("data: ")) {
                        try {
                            const event = JSON.parse(line.slice(6));
                            setEvents((prev) => [...prev, event]);
                        }
                        catch {
                            // skip malformed
                        }
                    }
                }
            }
        }
        catch (e) {
            if (e.name !== "AbortError") {
                setEvents((prev) => [
                    ...prev,
                    { type: "error", message: String(e) },
                ]);
            }
        }
        finally {
            setRunning(false);
        }
    }, []);
    const stop = useCallback(() => {
        abortRef.current?.abort();
        setRunning(false);
    }, []);
    return { events, running, start, stop };
}
