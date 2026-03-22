import { useEffect, useRef, useCallback } from 'react';

/**
 * HeroParticleCanvas
 * Renders a subtle star/particle mouse-trail effect using Canvas 2D.
 * Scoped exclusively to the Hero section. Disabled on touch/mobile.
 *
 * FIX: isCleanedUpRef guards the RAF loop so React StrictMode double-invoke
 * can't spawn a zombie loop that keeps running after cleanup.
 */
export default function HeroParticleCanvas({ containerRef }) {
    const canvasRef = useRef(null);
    const particlesRef = useRef([]);
    const animFrameRef = useRef(null);
    // ← KEY FIX: flag that the RAF loop checks before re-scheduling itself
    const isCleanedUpRef = useRef(false);

    const spawnParticles = useCallback((x, y) => {
        const count = Math.floor(Math.random() * 3) + 2; // 2–4 per move
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 1.2 + 0.3;
            const size = Math.random() * 3.5 + 1.5;
            particlesRef.current.push({
                x: x + (Math.random() - 0.5) * 8,
                y: y + (Math.random() - 0.5) * 8,
                vx: Math.cos(angle) * speed * 0.6,
                vy: Math.sin(angle) * speed * 0.6 - 0.4, // slight upward drift
                life: 1.0,
                decay: Math.random() * 0.018 + 0.012,
                size,
                hue: Math.floor(Math.random() * 30) + 255,  // violet/purple band
                sat: Math.floor(Math.random() * 20) + 70,
                light: Math.floor(Math.random() * 20) + 70,
            });
        }
        // Hard cap on pool size for consistent perf
        if (particlesRef.current.length > 300) {
            particlesRef.current.splice(0, particlesRef.current.length - 300);
        }
    }, []);

    useEffect(() => {
        // Disable on touch/mobile devices
        if (window.matchMedia('(hover: none)').matches) return;

        const canvas = canvasRef.current;
        const container = containerRef?.current;
        if (!canvas || !container) return;

        // Mark this effect instance as alive
        isCleanedUpRef.current = false;

        const ctx = canvas.getContext('2d');

        // Sync canvas pixel dimensions to hero bounds
        const resize = () => {
            canvas.width = container.offsetWidth;
            canvas.height = container.offsetHeight;
        };
        resize();

        const ro = new ResizeObserver(resize);
        ro.observe(container);

        // Track mouse relative to the hero section
        const onMouseMove = (e) => {
            // Guard: if already cleaned up ignore stale events
            if (isCleanedUpRef.current) return;
            const rect = container.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            // Only spawn when cursor is actually inside the hero bounds
            if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
                spawnParticles(x, y);
            }
        };

        window.addEventListener('mousemove', onMouseMove, { passive: true });

        // ─── Render loop ────────────────────────────────────────────────
        const render = () => {
            // ← KEY FIX: bail out immediately if cleanup already ran
            if (isCleanedUpRef.current) return;

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Remove dead particles
            particlesRef.current = particlesRef.current.filter(p => p.life > 0.005);

            for (const p of particlesRef.current) {
                // Physics update
                p.x += p.vx;
                p.y += p.vy;
                p.vy -= 0.015; // gentle float upward
                p.vx *= 0.98;  // air drag
                p.life -= p.decay;

                const alpha = Math.max(0, p.life);
                // Clamp radius so createRadialGradient never gets 0/negative
                const radius = Math.max(0.1, p.size * p.life);

                // Soft outer glow
                const gradient = ctx.createRadialGradient(
                    p.x, p.y, 0,
                    p.x, p.y, radius * 3.5,
                );
                gradient.addColorStop(0,   `hsla(${p.hue}, ${p.sat}%, ${p.light}%, ${alpha * 0.55})`);
                gradient.addColorStop(0.4, `hsla(${p.hue}, ${p.sat}%, ${p.light}%, ${alpha * 0.20})`);
                gradient.addColorStop(1,   `hsla(${p.hue}, ${p.sat}%, ${p.light}%, 0)`);

                ctx.beginPath();
                ctx.arc(p.x, p.y, radius * 3.5, 0, Math.PI * 2);
                ctx.fillStyle = gradient;
                ctx.fill();

                // Bright core dot
                ctx.beginPath();
                ctx.arc(p.x, p.y, radius * 0.7, 0, Math.PI * 2);
                ctx.fillStyle = `hsla(${p.hue}, 100%, 93%, ${alpha * 0.9})`;
                ctx.fill();
            }

            // Re-schedule only if still alive
            animFrameRef.current = requestAnimationFrame(render);
        };

        animFrameRef.current = requestAnimationFrame(render);

        // ─── Cleanup ─────────────────────────────────────────────────────
        return () => {
            // Signal the RAF callback to not re-schedule
            isCleanedUpRef.current = true;
            cancelAnimationFrame(animFrameRef.current);
            window.removeEventListener('mousemove', onMouseMove);
            ro.disconnect();
            // Clear particle pool for a clean re-mount if needed
            particlesRef.current = [];
        };

        // Intentionally empty dep array:
        // containerRef identity is stable (useRef), spawnParticles is useCallback([]).
        // This ensures the effect runs exactly once per mount, never re-runs mid-session.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                zIndex: 1,
            }}
            aria-hidden="true"
        />
    );
}
