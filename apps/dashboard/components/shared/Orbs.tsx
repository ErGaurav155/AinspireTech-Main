// components/shared/Orbs.tsx
export function Orbs() {
  return (
    <>
      <div
        className="fixed rounded-full pointer-events-none z-0"
        style={{
          width: 440,
          height: 440,
          top: -80,
          left: 160,
          filter: "blur(90px)",
          background:
            "radial-gradient(circle,rgba(139,92,246,.15) 0%,rgba(59,130,246,.08) 55%,transparent 70%)",
        }}
      />
      <div
        className="fixed rounded-full pointer-events-none z-0"
        style={{
          width: 300,
          height: 300,
          bottom: 60,
          right: 80,
          filter: "blur(80px)",
          background:
            "radial-gradient(circle,rgba(16,185,129,.10) 0%,rgba(59,130,246,.06) 55%,transparent 70%)",
        }}
      />
    </>
  );
}
