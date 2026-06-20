"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useIdentity } from "@/hooks/useIdentity";
import { Input } from "@/components/shared/Input";
import { buildGrid, tickParticles, drawParticles } from "./_particles";
import s from "./home.module.css";

const SPACING = 48;

export default function Home() {
  const router = useRouter();
  const { identity, ready, login, isLoggedIn } = useIdentity();
  const [nickname, setNickname] = useState("");

  const canvasRef     = useRef<HTMLCanvasElement>(null);
  const mouseRef      = useRef({ x: -9999, y: -9999 });
  const cursorRingRef = useRef<HTMLDivElement>(null);
  const cursorDotRef  = useRef<HTMLDivElement>(null);
  const startRef      = useRef<number | null>(null);

  /* ── particle canvas ── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let particles = buildGrid(window.innerWidth, window.innerHeight, SPACING);
    let animId: number;

    function resize() {
      canvas!.width  = window.innerWidth;
      canvas!.height = window.innerHeight;
      particles = buildGrid(window.innerWidth, window.innerHeight, SPACING);
      startRef.current = null;
    }

    resize();
    window.addEventListener("resize", resize);

    function loop(ts: number) {
      if (!startRef.current) startRef.current = ts;
      const elapsed = (ts - startRef.current) / 1000;

      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      tickParticles(particles, mouseRef.current.x, mouseRef.current.y, {
        repelRadius:   130,
        repelStrength: 7,
        friction:      0.80,
        returnSpeed:   0.042,
        baseAlpha:     0.20,
      }, elapsed);
      drawParticles(ctx!, particles);
      animId = requestAnimationFrame(loop);
    }

    animId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  /* ── cursor tracking без ре-рендеров ── */
  useEffect(() => {
    const ring = cursorRingRef.current;
    const dot  = cursorDotRef.current;
    if (!ring || !dot) return;

    let rx = -200, ry = -200;
    let rafId: number;

    function tick() {
      const tx = mouseRef.current.x;
      const ty = mouseRef.current.y;
      rx += (tx - rx) * 0.14;
      ry += (ty - ry) * 0.14;
      ring!.style.transform = `translate(${rx - 18}px, ${ry - 18}px)`;
      dot!.style.transform  = `translate(${tx - 2}px, ${ty - 2}px)`;
      rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    mouseRef.current = { x: e.clientX, y: e.clientY };
  }, []);
  const onMouseLeave = useCallback(() => {
    mouseRef.current = { x: -9999, y: -9999 };
  }, []);

  const handleLogin = () => {
    if (nickname.trim()) login(nickname);
  };

  if (!ready) return null;

  const letters = "SYNCRO".split("");

  return (
    <main className={s.root} onMouseMove={onMouseMove} onMouseLeave={onMouseLeave}>

      <canvas ref={canvasRef} className={s.canvas} />

      <div className={`${s.orb} ${s.orbA}`} />
      <div className={`${s.orb} ${s.orbB}`} />
      <div className={`${s.orb} ${s.orbC}`} />

      <div ref={cursorRingRef} className={s.cursorRing} />
      <div ref={cursorDotRef}  className={s.cursorDot}  />

      <div className={s.content}>

        <div className={s.eyebrow}>
          <span className={s.eyebrowLine} />
          <span className={s.eyebrowText}>Syncro</span>
          <span className={s.eyebrowLine} />
        </div>

        <div className={s.titleWrap}>
          {letters.map((ch, i) => (
            <span
              key={i}
              className={s.titleLetter}
              style={{
                animationDelay:    `${0.3 + i * 0.07}s, ${i * 0.4}s`,
                animationDuration: "0.85s, 6s",
              }}
            >
              {ch}
            </span>
          ))}
        </div>

        {!isLoggedIn ? (
          <div className={s.form}>
            <Input
              placeholder="Ваш никнейм..."
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            />
            <MagButton primary disabled={!nickname.trim()} onClick={handleLogin}>
              Войти
            </MagButton>
          </div>
        ) : (
          <>
            <div className={s.actions}>
              <MagButton primary onClick={() => router.push("/catalog")}>
                Каталог
              </MagButton>
              <MagButton onClick={() => router.push("/stream")}>
                Custom Stream
              </MagButton>
            </div>
            <p className={s.whoami}>
              Вошёл как{" "}
              <span className={s.whoamiAccent}>{identity?.nickname}</span>
            </p>
          </>
        )}
      </div>

      <div className={s.scrollHint}>
        <div className={s.scrollMouse}>
          <div className={s.scrollWheel} />
        </div>
      </div>
    </main>
  );
}

function MagButton({
  children,
  primary = false,
  disabled = false,
  onClick,
}: {
  children: React.ReactNode;
  primary?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);

  const onMove = (e: React.MouseEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const x = (e.clientX - r.left - r.width  / 2) * 0.16;
    const y = (e.clientY - r.top  - r.height / 2) * 0.16;
    ref.current!.style.transform = `translate(${x}px,${y}px)`;
  };

  return (
    <button
      ref={ref}
      className={`${s.btn} ${primary ? s.btnPrimary : s.btnGhost}`}
      disabled={disabled}
      onClick={onClick}
      onMouseMove={onMove}
      onMouseLeave={() => { if (ref.current) ref.current.style.transform = "translate(0,0)"; }}
      style={{ transition: "transform 0.25s cubic-bezier(0.16,1,0.3,1), box-shadow 0.2s ease" }}
    >
      <span className={s.btnGloss} />
      <span style={{ position: "relative", zIndex: 1 }}>{children}</span>
    </button>
  );
}