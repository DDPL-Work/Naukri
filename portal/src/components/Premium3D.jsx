import React, { useEffect, useRef, useState, useCallback } from "react";
import { gsap } from "gsap";
import { FiSend, FiMinus, FiChevronDown, FiZap, FiStar, FiX } from "react-icons/fi";
import mavenLogo from "../../assets/maven-logo-BdiSsfJk.svg";
import authService from "../services/authService";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_URL = `${import.meta.env.VITE_GEMINI_BASE_URL}:generateContent`;

const SYSTEM_PROMPT = `You are MavenJob's super cool and friendly Bot, who will help us in Career Guidance.`;

async function callGemini(conversationHistory) {
    const contents = conversationHistory
        .filter(m => !m.isGreeting)
        .map(msg => ({
            role: msg.role === "ai" ? "model" : "user",
            parts: [{ text: msg.text }]
        }));

    const firstUser = contents.findIndex(c => c.role === "user");
    const trimmed = firstUser > 0 ? contents.slice(firstUser) : contents;
    if (trimmed.length === 0) throw new Error("No user message found");

    const payload = {
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: trimmed,
        generationConfig: {
            temperature: 0.72,
            maxOutputTokens: 512,
            topP: 0.92,
        },
        safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
        ]
    };

    const res = await fetch(GEMINI_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-goog-api-key": GEMINI_API_KEY,
        },
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson?.error?.message || `HTTP ${res.status}`);
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Empty response");
    return text.trim();
}

/* ── MARKDOWN RENDERER ── */
const renderMarkdown = (text) => {
    if (!text) return null;
    const lines = text.split("\n");
    const out = [];
    let i = 0;

    const parseBold = (str) =>
        str.split(/\*\*(.*?)\*\*/g).map((p, idx) =>
            idx % 2 === 1
                ? <strong key={idx} style={{ fontWeight: 700, color: "#0f172a" }}>{p}</strong>
                : p
        );

    while (i < lines.length) {
        const line = lines[i];

        if (/^[•\-\*] /.test(line)) {
            const items = [];
            while (i < lines.length && /^[•\-\*] /.test(lines[i])) {
                items.push(lines[i].replace(/^[•\-\*] /, "").trim());
                i++;
            }
            out.push(
                <ul key={`ul${i}`} style={{ margin: "6px 0", paddingLeft: 0, listStyle: "none" }}>
                    {items.map((item, idx) => (
                        <li key={idx} style={{ display: "flex", gap: 8, marginBottom: 4, alignItems: "flex-start" }}>
                            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#2563EB", marginTop: 8, flexShrink: 0, display: "block" }} />
                            <span>{parseBold(item)}</span>
                        </li>
                    ))}
                </ul>
            );
            continue;
        }

        if (/^\d+\. /.test(line)) {
            const items = [];
            while (i < lines.length && /^\d+\. /.test(lines[i])) {
                items.push(lines[i].replace(/^\d+\. /, "").trim());
                i++;
            }
            out.push(
                <ol key={`ol${i}`} style={{ margin: "6px 0", paddingLeft: 0, listStyle: "none" }}>
                    {items.map((item, idx) => (
                        <li key={idx} style={{ display: "flex", gap: 8, marginBottom: 5, alignItems: "flex-start" }}>
                            <span style={{ minWidth: 20, height: 20, borderRadius: 6, background: "linear-gradient(135deg,#002366,#0040C0)", color: "#fff", fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{idx + 1}</span>
                            <span style={{ paddingTop: 1 }}>{parseBold(item)}</span>
                        </li>
                    ))}
                </ol>
            );
            continue;
        }

        if (line.trim() === "") { out.push(<div key={`sp${i}`} style={{ height: 5 }} />); i++; continue; }

        out.push(<p key={`p${i}`} style={{ margin: 0, lineHeight: 1.68 }}>{parseBold(line)}</p>);
        i++;
    }
    return out;
};

/* ── 3D GLOBE ── */
function use3DGlobe(canvasRef, enabled) {
    const anim = useRef({ glow: 0.5, pulse: 0.4, ringA: 0, scaleV: 0, modeAlpha: [1, 0, 0] });
    const gsapCtx = useRef(null);
    const rafRef = useRef(null);

    useEffect(() => {
        if (!enabled || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        const W = 110, H = 110, CX = 55, CY = 55, R = 38;
        canvas.width = W; canvas.height = H;

        let tRX = 0, tRY = 0, rX = 0, rY = 0;
        let grabbed = false, lastMX = 0, lastMY = 0, velX = 0, velY = 0;

        const onDown = (e) => {
            grabbed = true;
            lastMX = e.clientX ?? e.touches?.[0]?.clientX;
            lastMY = e.clientY ?? e.touches?.[0]?.clientY;
            velX = 0; velY = 0;
            canvas.style.cursor = "grabbing";
        };
        const onUp = () => { grabbed = false; canvas.style.cursor = "grab"; };
        const onMove = (e) => {
            const cx = e.clientX ?? e.touches?.[0]?.clientX;
            const cy = e.clientY ?? e.touches?.[0]?.clientY;
            if (!cx) return;
            if (grabbed) {
                velX = (cx - lastMX) * 0.022; velY = (cy - lastMY) * 0.015;
                tRY += velX; tRX -= velY; lastMX = cx; lastMY = cy;
            } else {
                const rect = canvas.getBoundingClientRect();
                tRX = -((cy - rect.top - CY) / CY) * 0.35;
                tRY = ((cx - rect.left - CX) / CX) * 0.35;
            }
        };
        const onLeave = () => { if (!grabbed) { tRX = 0; tRY = 0; } };

        canvas.addEventListener("mousedown", onDown);
        canvas.addEventListener("touchstart", onDown, { passive: true });
        window.addEventListener("mouseup", onUp);
        window.addEventListener("touchend", onUp);
        window.addEventListener("mousemove", onMove);
        canvas.addEventListener("mouseleave", onLeave);

        anim.current.scaleV = 0;
        gsapCtx.current = gsap.context(() => {
            gsap.to(anim.current, { glow: 1, duration: 2.2, ease: "sine.inOut", repeat: -1, yoyo: true });
            gsap.to(anim.current, { pulse: 1, duration: 1.6, ease: "sine.inOut", repeat: -1, yoyo: true, delay: 0.6 });
            gsap.to(anim.current, { ringA: Math.PI * 2, duration: 9, ease: "none", repeat: -1 });
            gsap.to(anim.current, { scaleV: 1, duration: 1.3, ease: "elastic.out(1,0.6)" });
        });

        const NPTS = 10;
        const pts = Array.from({ length: NPTS }, (_, i) => {
            const phi = Math.acos(-1 + 2 * (i + 0.5) / NPTS);
            const th = Math.PI * (1 + Math.sqrt(5)) * i;
            return [Math.sin(phi) * Math.cos(th), Math.cos(phi), Math.sin(phi) * Math.sin(th), Math.random() * Math.PI * 2];
        });

        const LATS = 9, LONS = 16;
        const sphere = (() => {
            const rows = [], cols = [];
            for (let i = 0; i <= LATS; i++) {
                const phi = (i / LATS) * Math.PI, row = [];
                for (let j = 0; j <= LONS; j++) {
                    const th = (j / LONS) * Math.PI * 2;
                    row.push([Math.sin(phi) * Math.cos(th), Math.cos(phi), Math.sin(phi) * Math.sin(th)]);
                }
                rows.push(row);
            }
            for (let j = 0; j <= LONS; j++) {
                const col = [];
                for (let i = 0; i <= LATS; i++) {
                    const phi = (i / LATS) * Math.PI, th = (j / LONS) * Math.PI * 2;
                    col.push([Math.sin(phi) * Math.cos(th), Math.cos(phi), Math.sin(phi) * Math.sin(th)]);
                }
                cols.push(col);
            }
            return { rows, cols };
        })();

        const rot = ([x, y, z], rx, ry) => {
            const x1 = x * Math.cos(ry) + z * Math.sin(ry);
            const z1 = -x * Math.sin(ry) + z * Math.cos(ry);
            return [x1, y * Math.cos(rx) - z1 * Math.sin(rx), y * Math.sin(rx) + z1 * Math.cos(rx)];
        };

        let fc = 0;
        const mA = anim.current.modeAlpha;

        const draw = () => {
            fc++;
            ctx.clearRect(0, 0, W, H);
            ctx.save();
            ctx.translate(CX, CY);
            ctx.scale(anim.current.scaleV, anim.current.scaleV);

            if (!grabbed) { rX += (tRX - rX) * 0.06; rY += (tRY - rY) * 0.06; }
            else { rX = tRX; rY = tRY; }
            if (!grabbed) { velX *= 0.94; velY *= 0.94; tRY += velX * 0.28; tRX += velY * 0.28; }

            const autoRY = anim.current.ringA * 0.15 + rY;
            const bS = Math.max(mA[0], mA[2]), gS = Math.max(mA[1], mA[2]);

            const og = ctx.createRadialGradient(0, 0, R * 0.5, 0, 0, R + 22);
            og.addColorStop(0, `rgba(0,35,102,${0.12 * bS * anim.current.glow})`);
            og.addColorStop(0.5, `rgba(16,185,129,${0.07 * gS * anim.current.glow})`);
            og.addColorStop(1, "rgba(0,0,0,0)");
            ctx.beginPath(); ctx.arc(0, 0, R + 22, 0, Math.PI * 2); ctx.fillStyle = og; ctx.fill();

            const sg = ctx.createRadialGradient(-R * 0.24, -R * 0.22, R * 0.02, 0, 0, R);
            sg.addColorStop(0, `rgba(160,200,255,${0.2 + bS * 0.1})`);
            sg.addColorStop(0.14, `rgba(18,74,196,${0.8 + bS * 0.1})`);
            sg.addColorStop(0.5, "rgba(0,35,102,0.94)");
            sg.addColorStop(0.85, "rgba(0,14,46,0.98)");
            sg.addColorStop(1, "rgba(0,7,24,1)");
            ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fillStyle = sg; ctx.fill();

            const wA = 0.16 + bS * 0.12;
            sphere.rows.forEach((row, ri) => {
                const isG = ri % 3 === 0;
                for (let j = 0; j < row.length - 1; j++) {
                    const [ax, ay, az] = rot(row[j], rX, autoRY);
                    const [bx, by, bz] = rot(row[j + 1], rX, autoRY);
                    if (az < -0.08 && bz < -0.08) continue;
                    const d = ((az + bz) / 2 + 1) / 2;
                    ctx.beginPath(); ctx.moveTo(ax * R, ay * R); ctx.lineTo(bx * R, by * R);
                    ctx.strokeStyle = isG ? `rgba(16,185,129,${d * wA * 1.1 * gS + 0.02})` : `rgba(80,148,255,${d * wA * bS + 0.02})`;
                    ctx.lineWidth = 0.5; ctx.stroke();
                }
            });
            sphere.cols.forEach(col => {
                for (let i = 0; i < col.length - 1; i++) {
                    const [ax, ay, az] = rot(col[i], rX, autoRY);
                    const [bx, by, bz] = rot(col[i + 1], rX, autoRY);
                    if (az < -0.08 && bz < -0.08) continue;
                    const d = ((az + bz) / 2 + 1) / 2;
                    ctx.beginPath(); ctx.moveTo(ax * R, ay * R); ctx.lineTo(bx * R, by * R);
                    ctx.strokeStyle = `rgba(40,100,220,${d * 0.18 * bS + 0.02})`;
                    ctx.lineWidth = 0.38; ctx.stroke();
                }
            });

            const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 0.5);
            cg.addColorStop(0, `rgba(16,185,129,${0.25 * gS * anim.current.pulse})`);
            cg.addColorStop(0.5, `rgba(0,80,180,${0.12 * bS * anim.current.pulse})`);
            cg.addColorStop(1, "rgba(0,0,0,0)");
            ctx.beginPath(); ctx.arc(0, 0, R * 0.5, 0, Math.PI * 2); ctx.fillStyle = cg; ctx.fill();

            const rim = ctx.createRadialGradient(0, 0, R * 0.76, 0, 0, R);
            rim.addColorStop(0, "rgba(0,0,0,0)");
            rim.addColorStop(1, `rgba(16,185,129,${0.18 * gS * anim.current.glow})`);
            ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fillStyle = rim; ctx.fill();

            const spec = ctx.createRadialGradient(-R * 0.26, -R * 0.28, 0, -R * 0.2, -R * 0.22, R * 0.38);
            spec.addColorStop(0, "rgba(255,255,255,0.28)");
            spec.addColorStop(1, "rgba(0,0,0,0)");
            ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fillStyle = spec; ctx.fill();

            const r1 = R * 1.28 + anim.current.glow * 4;
            ctx.save(); ctx.rotate(anim.current.ringA * 0.17);
            ctx.beginPath(); ctx.ellipse(0, 0, r1, r1 * 0.17, 0, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(0,35,102,${0.55 * bS * anim.current.glow})`; ctx.lineWidth = 1.8; ctx.stroke();
            ctx.strokeStyle = `rgba(0,35,102,${0.12 * bS})`; ctx.lineWidth = 5; ctx.stroke(); ctx.restore();

            const r2 = R * 1.16 + anim.current.pulse * 4;
            ctx.save(); ctx.rotate(-anim.current.ringA * 0.11 + 1.1);
            ctx.beginPath(); ctx.ellipse(0, 0, r2, r2 * 0.21, 0, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(16,185,129,${0.55 * gS * anim.current.pulse})`; ctx.lineWidth = 1.5; ctx.stroke();
            ctx.strokeStyle = `rgba(16,185,129,${0.1 * gS})`; ctx.lineWidth = 5; ctx.stroke(); ctx.restore();

            pts.forEach(([nx, ny, nz, phase], i) => {
                const nm = Math.sqrt(nx * nx + ny * ny + nz * nz);
                const [rx2, ry2, rz2] = rot([nx / nm, ny / nm, nz / nm], rX, autoRY);
                if (rz2 < 0) return;
                const d = (rz2 + 1) / 2, sx = rx2 * R, sy = ry2 * R;
                const isBlue = i % 3 !== 0;
                const pulse2 = 0.5 + 0.5 * Math.sin(fc * 0.045 + phase);
                const nr = 2.2 + d * 1.8 + pulse2;
                const color = isBlue ? "0,35,102" : "16,185,129";
                const aStr = isBlue ? bS : gS;
                const ng = ctx.createRadialGradient(sx, sy, 0, sx, sy, nr * 3.5);
                ng.addColorStop(0, `rgba(${color},${aStr * d * 0.5})`);
                ng.addColorStop(1, "rgba(0,0,0,0)");
                ctx.beginPath(); ctx.arc(sx, sy, nr * 3.5, 0, Math.PI * 2); ctx.fillStyle = ng; ctx.fill();
                ctx.beginPath(); ctx.arc(sx, sy, nr, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255,255,255,${d * 0.85 * aStr})`; ctx.fill();
            });

            ctx.restore();
            rafRef.current = requestAnimationFrame(draw);
        };
        draw();

        return () => {
            cancelAnimationFrame(rafRef.current);
            gsapCtx.current?.revert();
            canvas.removeEventListener("mousedown", onDown);
            canvas.removeEventListener("touchstart", onDown);
            window.removeEventListener("mouseup", onUp);
            window.removeEventListener("touchend", onUp);
            window.removeEventListener("mousemove", onMove);
            canvas.removeEventListener("mouseleave", onLeave);
        };
    }, [enabled]);

    const setGlobeMode = useCallback((prev, next) => {
        const mA = anim.current.modeAlpha;
        gsap.to(mA, { [prev]: 0, duration: 0.38, ease: "power2.out" });
        gsap.to(mA, { [next]: 1, duration: 0.48, ease: "power2.out" });
    }, []);

    return { setGlobeMode };
}

/* ── MAIN ── */
const Premium3D = () => {
    const canvasRef = useRef(null);
    const scrollRef = useRef(null);
    const inputRef = useRef(null);

    const [chatOpen, setChatOpen] = useState(false);
    const [minimized, setMinimized] = useState(false);
    const [activeMode, setActiveMode] = useState(0);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [apiError, setApiError] = useState(null);
    const [ranking, setRanking] = useState([]);
    const [rankingLoading, setRankingLoading] = useState(false);
    const [history, setHistory] = useState([{
        role: "ai",
        isGreeting: true,
        text: "Hi! I'm **MavenAI** 👋\n\nYour personal career acceleration specialist, powered by MavenJobs — India's #1 hiring platform.\n\nHow can I help you land your dream role today?",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    }]);

    const showGlobe = !chatOpen || minimized;
    const { setGlobeMode } = use3DGlobe(canvasRef, showGlobe);

    const MODES = [
        { name: "Discovery", color: "#2563EB" },
        { name: "Connect", color: "#10b981" },
        { name: "Ranking", color: "#8B5CF6" },
    ];
    const LABELS = [
        "Mapping premium talent in real-time",
        "Reaching candidates across all channels",
        "Top 10 candidates by quiz XP",
    ];
    const QUICK_REPLIES = ["Find matching jobs", "Review my resume", "Quiz ranking", "Interview tips"];

    useEffect(() => {
        if (scrollRef.current)
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [history, isTyping]);

    useEffect(() => {
        if (chatOpen && !minimized)
            setTimeout(() => inputRef.current?.focus(), 350);
    }, [chatOpen, minimized]);

    const handleModeSwitch = (i) => {
        if (i === activeMode) return;
        setGlobeMode(activeMode, i);
        setActiveMode(i);
    };

    useEffect(() => {
        if (!chatOpen || minimized || activeMode !== 2) return;

        let cancelled = false;
        setRankingLoading(true);
        authService.getQuizRanking()
            .then((response) => {
                if (!cancelled && response?.success) setRanking(response.data || []);
            })
            .catch((err) => {
                if (!cancelled) setApiError(err.message || "Unable to fetch rankings");
            })
            .finally(() => {
                if (!cancelled) setRankingLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [activeMode, chatOpen, minimized]);

    const sendMessage = async (overrideText) => {
        const text = (typeof overrideText === "string" ? overrideText : input).trim();
        if (!text || isTyping) return;

        setApiError(null);
        const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        const userMsg = { role: "user", text, time: now };
        const updated = [...history, userMsg];

        setHistory(updated);
        setInput("");
        setIsTyping(true);

        try {
            const reply = await callGemini(updated);
            const aiTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            setHistory(prev => [...prev, { role: "ai", text: reply, time: aiTime }]);
        } catch (err) {
            console.error("MavenAI error:", err.message);
            setApiError(err.message);
            const aiTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            setHistory(prev => [...prev, {
                role: "ai",
                text: "I'm experiencing a brief connection issue. Please try again — I'm here to help with your career journey! 🚀",
                time: aiTime
            }]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    };

    const handleQuickReply = (q) => {
        if (q.toLowerCase().includes("ranking")) {
            handleModeSwitch(2);
            return;
        }
        setInput("");
        setTimeout(() => sendMessage(q), 50);
    };

    return (
        <>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=DM+Sans:wght@400;500;600;700&display=swap');

        .mvn-wrap {
          position: fixed; bottom: 28px; right: 28px; z-index: 9999;
          font-family: 'DM Sans', system-ui, sans-serif;
          display: flex; flex-direction: column; align-items: flex-end; gap: 12px;
        }

        /* PANEL */
        .mvn-panel {
          width: 380px; background: #fff; border-radius: 24px;
          border: 1px solid #dde3ef;
          box-shadow: 0 24px 60px rgba(0,30,90,0.18), 0 6px 20px rgba(0,0,0,0.06);
          overflow: hidden; display: flex; flex-direction: column; height: 560px;
          transform-origin: bottom right;
          animation: mvnIn 0.38s cubic-bezier(0.34,1.56,0.64,1) forwards;
        }
        @keyframes mvnIn {
          from { opacity:0; transform:scale(0.86) translateY(14px); }
          to   { opacity:1; transform:scale(1) translateY(0); }
        }

        /* HEADER */
        .mvn-header {
          background: #001a50; padding: 18px 18px 14px;
          flex-shrink: 0; position: relative; overflow: hidden;
        }
        .mvn-header::before {
          content:''; position:absolute; inset:0;
          background:
            radial-gradient(ellipse 90% 80% at 90% 5%, rgba(16,185,129,0.25), transparent 55%),
            radial-gradient(ellipse 60% 50% at 5% 95%, rgba(99,102,241,0.18), transparent 55%);
          pointer-events:none;
        }
        .mvn-header::after {
          content:''; position:absolute; inset:0;
          background-image: radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px);
          background-size: 22px 22px; pointer-events:none;
        }

        /* LOGO CHIP */
        .mvn-logo-chip {
          width: 46px; height: 46px; border-radius: 13px;
          background: rgba(255,255,255,0.12);
          border: 1.5px solid rgba(255,255,255,0.2);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; overflow: hidden;
        }
        .mvn-logo-chip img { width: 32px; height: 32px; object-fit: contain; display: block; }

        /* AI AVATAR IN CHAT */
        .mvn-ai-avatar {
          width: 34px; height: 34px; border-radius: 11px;
          background: #001a50; border: 1.5px solid #003080;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; overflow: hidden;
        }
        .mvn-ai-avatar img { width: 22px; height: 22px; object-fit: contain; display: block; }

        .mvn-online {
          width:8px; height:8px; border-radius:50%; background:#10b981;
          box-shadow:0 0 0 2px rgba(16,185,129,0.3),0 0 8px rgba(16,185,129,0.6);
          animation:mvnBlink 2.4s ease-in-out infinite; flex-shrink:0;
        }
        @keyframes mvnBlink { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(0.8)} }

        /* MODE TABS */
        .mvn-tabs { display:flex; gap:5px; margin-top:13px; position:relative; z-index:1; }
        .mvn-tab {
          flex:1; padding:6px 0; border-radius:9px; border:1px solid;
          font-size:10px; font-weight:800; font-family:'Bricolage Grotesque',sans-serif;
          letter-spacing:0.03em; text-transform:uppercase; cursor:pointer;
          transition:all 0.2s; display:flex; align-items:center; justify-content:center; gap:5px;
        }
        .mvn-tab.off { background:rgba(255,255,255,0.04); border-color:rgba(255,255,255,0.09); color:rgba(255,255,255,0.32); }
        .mvn-tab.off:hover { background:rgba(255,255,255,0.09); color:rgba(255,255,255,0.6); border-color:rgba(255,255,255,0.16); }
        .mvn-tab.on { background:rgba(255,255,255,0.14); border-color:rgba(255,255,255,0.28); color:#fff; box-shadow:0 2px 8px rgba(0,0,0,0.18); }
        .mvn-tab-dot { width:6px; height:6px; border-radius:50%; flex-shrink:0; }

        .mvn-ctrl {
          width:30px; height:30px; border-radius:9px;
          background:rgba(255,255,255,0.07); border:1px solid rgba(255,255,255,0.12);
          color:rgba(255,255,255,0.55); cursor:pointer;
          display:flex; align-items:center; justify-content:center; transition:all 0.18s;
        }
        .mvn-ctrl:hover { background:rgba(255,255,255,0.16); color:#fff; }

        /* LABEL STRIP */
        .mvn-strip {
          padding:8px 16px;
          background:linear-gradient(90deg,#EEF2FF,#F0FDF9);
          border-bottom:1px solid #e2e8f0;
          display:flex; align-items:center; gap:6px; flex-shrink:0;
        }

        /* MESSAGES */
        .mvn-msgs {
          flex:1; overflow-y:auto; padding:16px;
          display:flex; flex-direction:column; gap:14px;
          background:#F7F9FC; scroll-behavior:smooth;
        }
        .mvn-msgs::-webkit-scrollbar { width:3px; }
        .mvn-msgs::-webkit-scrollbar-thumb { background:#CBD5E1; border-radius:99px; }

        /* MESSAGE ROWS */
        .mvn-row { display:flex; align-items:flex-end; gap:9px; }
        .mvn-row.usr { flex-direction:row-reverse; }

        /* AI BUBBLE */
        .mvn-bubble-ai {
          width: fit-content;
          max-width: 100%;
          background: #fff;
          border: 1.5px solid #E2E8F0;
          border-radius: 18px 18px 18px 5px;
          padding: 12px 14px;
          font-size: 13.5px; line-height: 1.65; color: #1e293b;
          box-shadow: 0 2px 10px rgba(0,30,80,0.07);
          word-break: break-word;
        }

        /* USER BUBBLE — key fix: fit-content so short messages don't wrap */
        .mvn-bubble-usr {
          width: fit-content;
          max-width: 100%;
          background: linear-gradient(135deg, #0A2E8A 0%, #0F3DB5 60%, #1A52D5 100%);
          border-radius: 18px 18px 5px 18px;
          padding: 10px 16px;
          font-size: 13.5px; line-height: 1.6;
          color: #FFFFFF; font-weight: 500;
          box-shadow: 0 4px 18px rgba(10,46,138,0.32);
          word-break: break-word;
          white-space: pre-wrap;
          letter-spacing: 0.01em;
        }

        .mvn-time { font-size:10px; color:#94a3b8; font-weight:600; margin-top:4px; padding:0 2px; }

        /* TYPING */
        .mvn-typing { display:flex; gap:4px; align-items:center; padding:3px 2px; }
        .mvn-dot { width:6px; height:6px; border-radius:50%; background:#94a3b8; animation:mvnDot 1.3s ease-in-out infinite; }
        .mvn-dot:nth-child(2){animation-delay:0.18s} .mvn-dot:nth-child(3){animation-delay:0.36s}
        @keyframes mvnDot { 0%,80%,100%{transform:translateY(0);opacity:.4} 40%{transform:translateY(-5px);opacity:1} }

        /* ERROR BANNER */
        .mvn-error {
          margin:0 14px 8px; padding:8px 12px;
          background:#FEF2F2; border:1px solid #FECACA; border-radius:10px;
          font-size:11px; color:#B91C1C; font-weight:600;
        }

        /* QUICK REPLIES */
        .mvn-quick { padding:10px 14px 7px; display:flex; gap:6px; flex-wrap:wrap; background:#F7F9FC; border-top:1px solid #EDF0F5; flex-shrink:0; }
        .mvn-qbtn {
          padding:6px 13px; background:#fff; border:1.5px solid #E2E8F0; border-radius:100px;
          font-size:11.5px; font-weight:700; color:#002366; cursor:pointer;
          transition:all 0.2s cubic-bezier(0.34,1.56,0.64,1); font-family:'DM Sans',sans-serif; white-space:nowrap;
          box-shadow:0 1px 4px rgba(0,35,102,0.06);
        }
        .mvn-qbtn:hover { background:#EEF2FF; border-color:#A5B4FC; transform:translateY(-1px); box-shadow:0 3px 10px rgba(0,35,102,0.12); }

        /* INPUT */
        .mvn-input-row { display:flex; gap:8px; padding:12px 14px 14px; background:#fff; border-top:1px solid #EDF0F5; flex-shrink:0; align-items:center; }
        .mvn-input {
          flex:1; background:#F7F9FC; border:1.5px solid #E2E8F0; border-radius:13px;
          padding:10px 14px; font-size:13.5px; font-weight:500; color:#1e293b;
          outline:none; font-family:'DM Sans',sans-serif; transition:border-color 0.2s,box-shadow 0.2s;
        }
        .mvn-input:focus { border-color:#93C5FD; box-shadow:0 0 0 3px rgba(0,35,102,0.07); background:#fff; }
        .mvn-input::placeholder { color:#94a3b8; font-weight:400; }
        .mvn-send {
          width:43px; height:43px; border-radius:13px; border:none;
          background:linear-gradient(135deg,#001a50,#0F3DB5);
          color:#fff; cursor:pointer; flex-shrink:0;
          display:flex; align-items:center; justify-content:center;
          box-shadow:0 4px 16px rgba(0,35,102,0.3);
          transition:all 0.22s cubic-bezier(0.34,1.56,0.64,1);
        }
        .mvn-send:hover:not(:disabled) { transform:translateY(-1.5px) scale(1.05); box-shadow:0 8px 24px rgba(0,35,102,0.42); }
        .mvn-send:disabled { opacity:0.38; cursor:not-allowed; transform:none; }

        /* MINIMIZED PILL */
        .mvn-pill {
          display:flex; align-items:center; gap:9px; padding:10px 18px;
          background:linear-gradient(135deg,#001030,#001a50);
          border-radius:100px; cursor:pointer;
          box-shadow:0 10px 30px rgba(0,35,102,0.36); border:1px solid rgba(255,255,255,0.1);
          transition:all 0.25s cubic-bezier(0.34,1.56,0.64,1);
          animation:mvnIn 0.3s ease forwards;
        }
        .mvn-pill:hover { transform:translateY(-2px) scale(1.02); box-shadow:0 14px 38px rgba(0,35,102,0.46); }
        .mvn-pill-logo { width:22px; height:22px; object-fit:contain; display:block; }

        /* GLOBE */
        .mvn-globe-btn {
          width:72px; height:72px; border-radius:50%;
          background:linear-gradient(140deg,#001030 0%,#002b7a 100%);
          border:2px solid rgba(255,255,255,0.1);
          box-shadow:0 10px 36px rgba(0,35,102,0.44),0 2px 10px rgba(0,35,102,0.2),inset 0 1px 0 rgba(255,255,255,0.12);
          display:flex; align-items:center; justify-content:center;
          cursor:pointer; position:relative;
          transition:transform 0.3s cubic-bezier(0.34,1.56,0.64,1),box-shadow 0.3s;
          overflow:hidden;
        }
        .mvn-globe-btn::before { content:''; position:absolute; inset:0; border-radius:50%; background:radial-gradient(circle at 35% 30%,rgba(255,255,255,0.15),transparent 60%); pointer-events:none; }
        .mvn-globe-btn:hover { transform:scale(1.1) translateY(-3px); box-shadow:0 20px 54px rgba(0,35,102,0.52),0 4px 14px rgba(16,185,129,0.2); }
        .mvn-ring { position:absolute; border-radius:50%; border:2px solid; pointer-events:none; animation:mvnRing 2.8s ease-out infinite; }
        .mvn-ring-1 { inset:-8px; border-color:rgba(16,185,129,0.32); animation-delay:0s; }
        .mvn-ring-2 { inset:-16px; border-color:rgba(0,35,102,0.18); animation-delay:1s; }
        @keyframes mvnRing { 0%{transform:scale(1);opacity:.75} 100%{transform:scale(1.5);opacity:0} }
        .mvn-badge { position:absolute; top:-2px; right:-2px; width:18px; height:18px; border-radius:50%; background:#10b981; border:2.5px solid #fff; box-shadow:0 2px 8px rgba(16,185,129,0.55); animation:mvnBadge 2.4s ease-in-out infinite; }
        @keyframes mvnBadge { 0%,100%{transform:scale(1)} 50%{transform:scale(1.2)} }

        /* TOOLTIP */
        .mvn-tooltip {
          position:absolute; bottom:86px; right:0;
          background:#fff; border:1.5px solid #E2E8F0; border-radius:14px;
          padding:10px 16px; font-size:12px; font-weight:700; color:#002366;
          white-space:nowrap; box-shadow:0 8px 24px rgba(0,35,102,0.12);
          font-family:'DM Sans',sans-serif; pointer-events:none;
          opacity:0; animation:mvnTip 0.4s ease 1.5s forwards;
          display:flex; align-items:center; gap:7px;
        }
        .mvn-tooltip::after { content:''; position:absolute; bottom:-7px; right:26px; width:12px; height:12px; background:#fff; border-right:1.5px solid #E2E8F0; border-bottom:1.5px solid #E2E8F0; transform:rotate(45deg); }
        @keyframes mvnTip { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:translateY(0)} }

        /* DATE SEPARATOR */
        .mvn-sep { display:flex; align-items:center; gap:10px; margin:2px 0; }
        .mvn-sep span { font-size:10px; font-weight:700; color:#94a3b8; letter-spacing:0.06em; text-transform:uppercase; white-space:nowrap; }
        .mvn-sep::before,.mvn-sep::after { content:''; flex:1; height:1px; background:#E2E8F0; }
        .mvn-rank-table { border:1px solid #E2E8F0; border-radius:16px; overflow:hidden; background:#fff; box-shadow:0 8px 24px rgba(0,35,102,.06); }
        .mvn-rank-row { display:grid; grid-template-columns:38px minmax(0,1fr) 58px 46px; gap:8px; align-items:center; padding:10px 12px; border-top:1px solid #EEF2F7; font-size:11px; color:#334155; }
        .mvn-rank-row:first-child { border-top:0; }
        .mvn-rank-head { background:#F8FAFC; color:#64748B; font-size:9px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; }
        .mvn-rank-name { min-width:0; font-weight:800; color:#0f172a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .mvn-rank-sub { margin-top:2px; font-size:9.5px; color:#94A3B8; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .mvn-rank-xp { font-weight:900; color:#002366; text-align:right; }
        .mvn-rank-empty { padding:18px; text-align:center; color:#64748B; font-size:12px; line-height:1.5; }
      `}</style>

            <div className="mvn-wrap">

                {/* ── CHAT PANEL ── */}
                {chatOpen && !minimized && (
                    <div className="mvn-panel">

                        {/* Header */}
                        <div className="mvn-header">
                            <div style={{ position: "relative", zIndex: 1 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                    <div className="mvn-logo-chip">
                                        <img src={mavenLogo} alt="MavenJobs" />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 16, fontWeight: 800, color: "#fff", letterSpacing: "-0.015em", lineHeight: 1.2 }}>
                                            MavenAI
                                        </div>
                                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                                            <div className="mvn-online" />
                                            <span style={{ fontSize: 10, fontWeight: 700, color: "#6EE7B7", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                                                Online · Career Specialist
                                            </span>
                                        </div>
                                    </div>
                                    <div style={{ display: "flex", gap: 6 }}>
                                        <button className="mvn-ctrl" onClick={() => setMinimized(true)} title="Minimise"><FiMinus size={13} /></button>
                                        <button className="mvn-ctrl" onClick={() => { setChatOpen(false); setMinimized(false); }} title="Close"><FiX size={13} /></button>
                                    </div>
                                </div>
                                <div className="mvn-tabs">
                                    {MODES.map((m, i) => (
                                        <button key={i} className={`mvn-tab ${activeMode === i ? "on" : "off"}`} onClick={() => handleModeSwitch(i)}>
                                            <span className="mvn-tab-dot" style={{ background: m.color }} />
                                            {m.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Label strip */}
                        <div className="mvn-strip">
                            <FiZap size={11} color="#002366" fill="#002366" />
                            <span style={{ fontSize: 11.5, fontWeight: 700, color: "#002366" }}>{LABELS[activeMode]}</span>
                        </div>

                        {/* Messages */}
                        <div className="mvn-msgs" ref={scrollRef}>
                            <div className="mvn-sep"><span>Today</span></div>

                            {activeMode === 2 ? (
                                <div className="mvn-rank-table">
                                    <div className="mvn-rank-row mvn-rank-head">
                                        <span>#</span><span>Candidate</span><span style={{ textAlign: "right" }}>XP</span><span style={{ textAlign: "right" }}>Quiz</span>
                                    </div>
                                    {rankingLoading ? (
                                        <div className="mvn-rank-empty">Loading rankings...</div>
                                    ) : ranking.length ? ranking.map((row) => (
                                        <div className="mvn-rank-row" key={row.candidateId}>
                                            <span style={{ fontWeight: 900, color: row.rank <= 3 ? "#d97706" : "#64748b" }}>{row.rank}</span>
                                            <div style={{ minWidth: 0 }}>
                                                <div className="mvn-rank-name">{row.name}</div>
                                                <div className="mvn-rank-sub">{row.headline}</div>
                                            </div>
                                            <span className="mvn-rank-xp">{row.totalXp}</span>
                                            <span style={{ textAlign: "right", color: "#64748b", fontWeight: 800 }}>{row.quizzesPlayed}</span>
                                        </div>
                                    )) : (
                                        <div className="mvn-rank-empty">No quiz XP yet. Play today's quiz to enter the top 10.</div>
                                    )}
                                </div>
                            ) : history.map((msg, i) => (
                                <div key={i} className={`mvn-row ${msg.role === "user" ? "usr" : ""}`}>
                                    {msg.role === "ai" && (
                                        <div className="mvn-ai-avatar">
                                            <img src={mavenLogo} alt="MavenAI" />
                                        </div>
                                    )}
                                    {/* Constrain wrapper so bubble doesn't stretch full row width */}
                                    <div style={{ maxWidth: "75%", alignSelf: "flex-end" }}>
                                        <div className={msg.role === "ai" ? "mvn-bubble-ai" : "mvn-bubble-usr"}>
                                            {msg.role === "ai"
                                                ? renderMarkdown(msg.text)
                                                : <span style={{ whiteSpace: "pre-wrap" }}>{msg.text}</span>
                                            }
                                        </div>
                                        <div className="mvn-time" style={{ textAlign: msg.role === "user" ? "right" : "left" }}>
                                            {msg.time}
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {activeMode !== 2 && isTyping && (
                                <div className="mvn-row">
                                    <div className="mvn-ai-avatar"><img src={mavenLogo} alt="MavenAI" /></div>
                                    <div className="mvn-bubble-ai" style={{ padding: "13px 16px" }}>
                                        <div className="mvn-typing">
                                            <div className="mvn-dot" /><div className="mvn-dot" /><div className="mvn-dot" />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Error banner */}
                        {apiError && (
                            <div className="mvn-error">⚠ {apiError.slice(0, 100)}</div>
                        )}

                        {/* Quick replies — only on first greeting */}
                        {history.length <= 1 && (
                            <div className="mvn-quick">
                                {QUICK_REPLIES.map((q, i) => (
                                    <button key={i} className="mvn-qbtn" onClick={() => handleQuickReply(q)}>{q}</button>
                                ))}
                            </div>
                        )}

                        {/* Input */}
                        <div className="mvn-input-row">
                            <input
                                ref={inputRef}
                                className="mvn-input"
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Ask MavenAI anything…"
                                disabled={isTyping}
                            />
                            <button
                                className="mvn-send"
                                onClick={() => sendMessage()}
                                disabled={!input.trim() || isTyping}
                            >
                                <FiSend size={16} />
                            </button>
                        </div>
                    </div>
                )}

                {/* ── MINIMIZED PILL ── */}
                {chatOpen && minimized && (
                    <div className="mvn-pill" onClick={() => setMinimized(false)}>
                        <div className="mvn-online" style={{ width: 7, height: 7 }} />
                        <img src={mavenLogo} alt="MavenAI" className="mvn-pill-logo" />
                        <span style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 13.5, fontWeight: 800, color: "#fff" }}>MavenAI</span>
                        <FiChevronDown size={14} color="rgba(255,255,255,0.5)" />
                    </div>
                )}

                {/* ── GLOBE BUTTON ── */}
                <div style={{ position: "relative", display: "inline-block" }}>
                    {!chatOpen && (
                        <div className="mvn-tooltip">
                            <FiStar size={10} color="#10b981" fill="#10b981" />
                            Chat with MavenAI
                        </div>
                    )}
                    <div className="mvn-ring mvn-ring-1" />
                    <div className="mvn-ring mvn-ring-2" />
                    <button
                        className="mvn-globe-btn"
                        onClick={() => {
                            if (chatOpen && minimized) setMinimized(false);
                            else if (!chatOpen) { setChatOpen(true); setMinimized(false); }
                            else setMinimized(true);
                        }}
                        title="MavenAI"
                    >
                        <canvas ref={canvasRef} style={{ cursor: "grab", borderRadius: "50%", display: "block" }} />
                    </button>
                    <div className="mvn-badge" />
                </div>

            </div>
        </>
    );
};

export default Premium3D;
