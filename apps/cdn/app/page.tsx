// apps/cdn/app/page.tsx
// Public docs / landing page for cdn.rocketreplai.com
// Not meant to be embedded — just informational

export default function HomePage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background:
          "linear-gradient(135deg, #eff6ff 0%, #f5f3ff 50%, #fce7f3 100%)",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        padding: 24,
        textAlign: "center",
        overflow: "auto",
      }}
    >
      {/* Logo */}
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #1a56db, #7c3aed)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 24,
          boxShadow: "0 8px 32px rgba(26,86,219,0.3)",
        }}
      >
        <svg width="36" height="36" viewBox="0 0 24 24" fill="white">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
        </svg>
      </div>

      <h1
        style={{
          fontSize: 32,
          fontWeight: 800,
          color: "#1f2937",
          margin: "0 0 10px",
          letterSpacing: "-0.5px",
        }}
      >
        RocketReplAI CDN
      </h1>

      <p
        style={{
          fontSize: 15,
          color: "#6b7280",
          margin: "0 0 40px",
          maxWidth: 420,
          lineHeight: 1.6,
        }}
      >
        Widget delivery network for{" "}
        <a
          href="https://rocketreplai.com"
          style={{ color: "#1a56db", fontWeight: 600, textDecoration: "none" }}
        >
          RocketReplAI
        </a>
        . Embed an AI chatbot on any website with one script tag.
      </p>

      {/* Card: Website embed */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 18,
          padding: "22px 26px",
          maxWidth: 560,
          width: "100%",
          textAlign: "left",
          boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
          marginBottom: 16,
        }}
      >
        <p
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "#374151",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            margin: "0 0 12px",
          }}
        >
          📌 Website Embed — floating chatbot button
        </p>
        <pre
          style={{
            background: "#0d0d0d",
            color: "#86efac",
            borderRadius: 10,
            padding: "14px 16px",
            fontSize: 12,
            overflowX: "auto",
            margin: 0,
            lineHeight: 1.65,
            fontFamily: "'Fira Code', 'Cascadia Code', 'Consolas', monospace",
          }}
        >
          {`<!-- Paste before </body> -->\n<script\n  src="https://cdn.rocketreplai.com/website-bot.js"\n  defer\n>userId,chatbotType</script>`}
        </pre>
      </div>

      {/* Card: Landing page */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 18,
          padding: "22px 26px",
          maxWidth: 560,
          width: "100%",
          textAlign: "left",
          boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
          marginBottom: 40,
        }}
      >
        <p
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "#374151",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            margin: "0 0 12px",
          }}
        >
          🔗 Shareable Landing Page Bot
        </p>
        <pre
          style={{
            background: "#0d0d0d",
            color: "#a5b4fc",
            borderRadius: 10,
            padding: "14px 16px",
            fontSize: 12,
            overflowX: "auto",
            margin: 0,
            lineHeight: 1.65,
            fontFamily: "'Fira Code', 'Cascadia Code', 'Consolas', monospace",
          }}
        >
          {`https://cdn.rocketreplai.com/{userId}/{chatbotType}`}
        </pre>
      </div>

      <p style={{ fontSize: 12, color: "#9ca3af" }}>
        Get your embed code from the{" "}
        <a
          href="https://app.rocketreplai.com"
          style={{ color: "#1a56db", textDecoration: "none", fontWeight: 600 }}
        >
          RocketReplAI Dashboard
        </a>
      </p>
    </div>
  );
}
