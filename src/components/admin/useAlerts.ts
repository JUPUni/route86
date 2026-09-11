"use client";
import { useCallback, useRef, useState } from "react";
import { useLocalFlag } from "@/lib/use-hydrated";

/**
 * Store-side alerting: a synthesized two-tone chime (no audio file needed), browser
 * notifications, and a flashing tab title. Sound needs one user gesture to unlock.
 */
export function useAlerts() {
  const ctxRef = useRef<AudioContext | null>(null);
  const [soundOn, setSoundOn] = useLocalFlag("r86.sound");
  const [notifOn, setNotifOn] = useState(() => typeof Notification !== "undefined" && Notification.permission === "granted");
  const flashTimer = useRef<number | null>(null);

  const enableSound = useCallback(async () => {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!ctxRef.current) ctxRef.current = new Ctx();
    await ctxRef.current.resume();
    setSoundOn(true);
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      const p = await Notification.requestPermission();
      setNotifOn(p === "granted");
    }
    chime(ctxRef.current);
  }, [setSoundOn]);

  const disableSound = useCallback(() => {
    setSoundOn(false);
  }, [setSoundOn]);

  const alert = useCallback((title: string, body: string) => {
    if (soundOn) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!ctxRef.current) ctxRef.current = new Ctx();
      ctxRef.current.resume().then(() => chime(ctxRef.current!, 3)).catch(() => {});
    }
    if (notifOn && document.visibilityState !== "visible") {
      try { new Notification(title, { body, icon: "/icons/icon-192.png", tag: title }); } catch {}
    }
    const original = document.title;
    let on = false;
    if (flashTimer.current) window.clearInterval(flashTimer.current);
    flashTimer.current = window.setInterval(() => {
      document.title = on ? original : `🔔 ${title}`;
      on = !on;
    }, 900);
    const stop = () => {
      if (flashTimer.current) window.clearInterval(flashTimer.current);
      document.title = original;
      document.removeEventListener("visibilitychange", stop);
    };
    document.addEventListener("visibilitychange", stop);
    window.setTimeout(stop, 30000);
  }, [soundOn, notifOn]);

  return { soundOn, notifOn, enableSound, disableSound, alert };
}

function chime(ctx: AudioContext, times = 1) {
  const now = ctx.currentTime;
  for (let i = 0; i < times; i++) {
    for (const [freq, at] of [[880, 0], [1174.66, 0.18]] as const) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const t = now + i * 0.6 + at;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.4);
    }
  }
}
