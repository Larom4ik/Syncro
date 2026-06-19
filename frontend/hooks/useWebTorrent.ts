"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useWebTorrent(magnet: string | null) {
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const clientRef = useRef<{ destroy: () => void } | null>(null);

  const cleanup = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.destroy();
      clientRef.current = null;
    }
    setStreamUrl(null);
    setProgress(0);
  }, []);

  useEffect(() => {
    if (!magnet) {
      cleanup();
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const WebTorrent = (await import("webtorrent")).default;
        const client = new WebTorrent();
        clientRef.current = client;

        client.add(magnet, (torrent) => {
          if (cancelled) return;

          const file = torrent.files.find((f) =>
            /\.(mp4|mkv|webm|avi)$/i.test(f.name)
          ) || torrent.files[0];

          if (!file) {
            setError("В торренте не найден видеофайл");
            setLoading(false);
            return;
          }

          file.renderTo(
            "video",
            { autoplay: false, controls: false },
            (_err, elem) => {
              if (cancelled || !elem) return;
              const url = (elem as HTMLVideoElement).src;
              setStreamUrl(url);
              setLoading(false);
            }
          );

          torrent.on("download", () => {
            if (torrent.length > 0) {
              setProgress(Math.round((torrent.downloaded / torrent.length) * 100));
            }
          });
        });
      } catch (err) {
        if (!cancelled) {
          setError((err as Error).message);
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [magnet, cleanup]);

  return { streamUrl, progress, error, loading };
}
