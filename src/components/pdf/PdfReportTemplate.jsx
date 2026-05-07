import React from "react";
import { DUMMY_REPORT_DATA } from "../../constants/dummyReportData";

// A4 Dimensions at 96 DPI: 794 x 1123 pixels
const PAGE_WIDTH = "794px";
const PAGE_HEIGHT = "1123px";

const BRAND = {
  primary: "#10b981", // emerald-500
  primaryDark: "#047857", // emerald-700  — used for table headers (professional, not garish)
  primaryLight: "#d1fae5", // emerald-100
  primaryFaint: "#ecfdf5", // emerald-50
};

// ──────────────────────────────────────────────────────────────
//   Page shell — accepts dark prop for cover, white default for content
// ──────────────────────────────────────────────────────────────
const Page = ({ children, dark = false }) => (
  <div
    className="pdf-page relative flex flex-col overflow-hidden shrink-0"
    style={{
      width: PAGE_WIDTH,
      height: PAGE_HEIGHT,
      fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",
      background: dark ? "#050714" : "#ffffff",
      color: dark ? "#ffffff" : "#0f172a",
    }}
  >
    {children}
  </div>
);

// ──────────────────────────────────────────────────────────────
//   Inner-page chrome — real header bar + footer with page nums
// ──────────────────────────────────────────────────────────────
const PageHeader = ({ chapter }) => (
  <div
    className="absolute top-0 left-0 right-0 px-12 pt-7 pb-3 flex items-center justify-between"
    style={{ borderBottom: "1px solid #f1f5f9" }}
  >
    <div className="flex items-center gap-2">
      <div
        className="w-7 h-7 rounded-md flex items-center justify-center"
        style={{ background: BRAND.primary }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="black">
          <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
        </svg>
      </div>
      <span
        className="text-[10px] font-bold tracking-[0.22em] uppercase"
        style={{ color: "#1e293b" }}
      >
        AgentForgeX
      </span>
    </div>
    {chapter && (
      <span
        className="text-[9px] tracking-[0.24em] uppercase font-semibold"
        style={{ color: "#94a3b8" }}
      >
        {chapter}
      </span>
    )}
  </div>
);

const PageFooter = ({
  pageNum,
  totalPages,
  classification = "Confidential",
}) => (
  <div
    className="absolute bottom-0 left-0 right-0 px-12 pb-7 pt-3 flex items-center justify-between text-[9px]"
    style={{ color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}
  >
    <span className="tracking-[0.2em] uppercase font-semibold">
      {classification}
    </span>
    <div className="flex items-center gap-3">
      <span>{String(pageNum).padStart(2, "0")}</span>
      <div className="w-8 h-px" style={{ background: BRAND.primary }} />
      <span style={{ color: "#cbd5e1" }}>
        {String(totalPages).padStart(2, "0")}
      </span>
    </div>
  </div>
);

// ──────────────────────────────────────────────────────────────
//   COVER PAGE  — title rendered with solid white + emerald glow
//   (background-clip:text was the cause of the faded title)
// ──────────────────────────────────────────────────────────────
const CoverPage = ({ metadata }) => {
  // Pre-compute particles for SVG render (replaces canvas to avoid html2canvas createPattern errors)
  const W = 794, H = 1123;
  const particles = React.useMemo(() => {
    const pts = [];
    for (let i = 0; i < 70; i++) {
      pts.push({ x: (i * 137.5) % W, y: (i * 263.7) % H, r: 1 + ((i * 7) % 3) });
    }
    return pts;
  }, []);

  const lines = React.useMemo(() => {
    const result = [];
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 140) {
          result.push({ x1: particles[i].x, y1: particles[i].y, x2: particles[j].x, y2: particles[j].y, opacity: 0.25 * (1 - d / 140) });
        }
      }
    }
    return result;
  }, [particles]);

  return (
    <Page dark>
      <div className="absolute inset-0 bg-[#050714]" />
      <div className="absolute inset-0 opacity-20 bg-[#0f3d2e]" />

      <svg
        width="794"
        height="1123"
        viewBox="0 0 794 1123"
        className="absolute inset-0 w-full h-full pointer-events-none"
      >
        {/* 1. Manual Grid */}
        <g opacity="0.1">
          {Array.from({ length: Math.ceil(794 / 44) + 1 }).map((_, i) => (
            <line key={`v${i}`} x1={i * 44} y1="0" x2={i * 44} y2="1123" stroke="#10b981" strokeWidth="0.5" />
          ))}
          {Array.from({ length: Math.ceil(1123 / 44) + 1 }).map((_, i) => (
            <line key={`h${i}`} x1="0" y1={i * 44} x2="794" y2={i * 44} stroke="#10b981" strokeWidth="0.5" />
          ))}
        </g>

        {/* 2. Glow Orbs (Basic) */}
        <circle cx="794" cy="0" r="300" fill="#10b981" opacity="0.1" />
        <circle cx="0" cy="1123" r="350" fill="#38bdf8" opacity="0.05" />

        {/* 3. Particle Network */}
        <g opacity="0.6">
          {lines.map((l, i) => (
            <line key={`l${i}`} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
              stroke="#34d399" strokeWidth="0.6" strokeOpacity={l.opacity} />
          ))}
          {particles.map((p, i) => (
            <g key={`p${i}`}>
              <circle cx={p.x} cy={p.y} r={p.r} fill="#6ee7b7" />
            </g>
          ))}
        </g>
      </svg>

      {/* Bottom circuit ribbon */}
      <svg
        className="absolute bottom-0 left-0 w-full pointer-events-none"
        height="220"
        viewBox="0 0 794 220"
        preserveAspectRatio="none"
      >
        <path
          d="M 0 140 Q 140 80 280 130 T 560 120 T 794 110"
          fill="none"
          stroke="rgba(16,185,129,0.55)"
          strokeWidth="1.2"
        />
        <path
          d="M 0 170 Q 140 110 280 160 T 560 150 T 794 140"
          fill="none"
          stroke="rgba(16,185,129,0.25)"
          strokeWidth="1"
        />
        <path
          d="M 0 200 Q 200 150 400 180 T 794 170"
          fill="none"
          stroke="rgba(56,189,248,0.2)"
          strokeWidth="1"
        />
        {[140, 280, 420, 560, 700].map((cx, i) => (
          <g key={i}>
            <circle
              cx={cx}
              cy={130 + (i % 2) * 8}
              r="6"
              fill="rgba(16,185,129,0.15)"
            />
            <circle cx={cx} cy={130 + (i % 2) * 8} r="2.5" fill="#10b981" />
          </g>
        ))}
      </svg>

      {/* ──────  Foreground content  ────── */}
      <div className="relative z-10 flex-1 flex flex-col justify-between px-16 py-14 text-white">
        {/* TOP: brand + classification */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center"
              style={{
                background: BRAND.primary,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="black">
                <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
              </svg>
            </div>
            <div>
              <p
                className="text-[11px] tracking-[0.32em] uppercase"
                style={{
                  color: "#34d399",
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                AgentForgeX
              </p>
              <p
                className="text-[11px] mt-0.5"
                style={{ color: "rgba(255,255,255,0.55)" }}
              >
                Enterprise Agentic Intelligence Platform
              </p>
            </div>
          </div>

          <div
            className="px-3 py-1.5 rounded-full text-[10px] tracking-[0.25em] uppercase"
            style={{
              border: "1px solid rgba(16,185,129,0.4)",
              color: "#6ee7b7",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {metadata.classification || "Confidential"}
          </div>
        </div>

        {/* MIDDLE: title block */}
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div
              className="h-px w-14"
              style={{ background: "#10b981" }}
            />
            <p
              className="text-[10px] tracking-[0.4em] uppercase"
              style={{
                color: "#34d399",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {metadata.report_type || "Strategic Briefing"}
            </p>
          </div>

          {/* TITLE — solid color + emerald glow shadow.  No background-clip:text. */}
          <h1
            style={{
              color: "#ffffff",
              fontSize: "52px",
              fontWeight: 700,
              lineHeight: 1.08,
              letterSpacing: "-0.02em",
              marginBottom: "20px",
              maxWidth: "92%",
            }}
          >
            {metadata.title}
          </h1>

          {metadata.subtitle && (
            <h2
              style={{
                color: "rgba(255,255,255,0.78)",
                fontSize: "20px",
                fontWeight: 300,
                lineHeight: 1.4,
                marginBottom: "24px",
                maxWidth: "78%",
              }}
            >
              {metadata.subtitle}
            </h2>
          )}

          {metadata.client && (
            <div className="flex items-center gap-3 mt-4">
              <span
                className="text-[10px] uppercase tracking-[0.22em]"
                style={{ color: "rgba(255,255,255,0.4)" }}
              >
                Prepared for
              </span>
              <span
                className="text-base font-semibold"
                style={{ color: "#ffffff" }}
              >
                {metadata.client}
              </span>
            </div>
          )}
        </div>

        {/* BOTTOM: metadata strip */}
        <div>
          <div className="flex items-center gap-2 mb-5">
            <div
              className="w-2 h-2 rounded-full"
              style={{
                background: "#34d399",
              }}
            />
            <div
              className="h-px flex-1"
              style={{ background: "rgba(16,185,129,0.4)" }}
            />
          </div>

          <div
            className="grid grid-cols-4 gap-6 text-[11px]"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            <MetaCol label="Date" value={metadata.date} />
            <MetaCol label="Version" value={metadata.version} />
            <MetaCol
              label="Prepared By"
              value={metadata.prepared_by || "AgentForgeX AI"}
            />
            <MetaCol label="Doc ID" value={metadata.document_id || "—"} />
          </div>
        </div>
      </div>
    </Page>
  );
};

const MetaCol = ({ label, value }) => (
  <div>
    <p
      className="uppercase tracking-[0.2em] mb-1.5"
      style={{ color: "rgba(255,255,255,0.35)" }}
    >
      {label}
    </p>
    <p className="text-sm" style={{ color: "rgba(255,255,255,0.95)" }}>
      {value}
    </p>
  </div>
);

// ──────────────────────────────────────────────────────────────
//   TABLE OF CONTENTS — emerald accents, dotted leaders, padded nums
// ──────────────────────────────────────────────────────────────
const TOCPage = ({ toc, pageNum, totalPages }) => {
  const renderItem = (item) => {
    const indent = item.level === 1 ? 0 : item.level === 2 ? 24 : 48;
    const weight = item.level === 1 ? 700 : item.level === 2 ? 500 : 400;
    const color =
      item.level === 1 ? "#0f172a" : item.level === 2 ? "#334155" : "#64748b";
    const size = item.level === 1 ? "13px" : item.level === 2 ? "12px" : "11px";
    const top = item.level === 1 ? 18 : 4;

    return (
      <div
        key={item.id}
        className="flex items-end"
        style={{ marginLeft: indent, marginTop: top, marginBottom: 6 }}
      >
        {item.level === 1 ? (
          <span
            className="mr-3 font-mono text-[10px] tracking-wider"
            style={{ color: BRAND.primaryDark, minWidth: 24 }}
          >
            {String(item.number).padStart(2, "0")}
          </span>
        ) : (
          <span
            className="mr-3 font-mono text-[10px]"
            style={{ color: "#94a3b8", minWidth: 32 }}
          >
            {item.number}
          </span>
        )}
        <span style={{ color, fontSize: size, fontWeight: weight }}>
          {item.title}
        </span>
        <div
          className="flex-1 mx-3 mb-1"
          style={{ borderBottom: "1px dotted #cbd5e1" }}
        />
        <span className="font-mono text-[11px]" style={{ color: "#64748b" }}>
          {String(item.page).padStart(2, "0")}
        </span>
      </div>
    );
  };

  const renderNodes = (nodes) => {
    if (!nodes) return null;
    return nodes.map((node) => (
      <React.Fragment key={node.id}>
        {renderItem(node)}
        {node.children && renderNodes(node.children)}
      </React.Fragment>
    ));
  };

  return (
    <Page>
      <PageHeader chapter="Table of Contents" />

      <div className="px-12 pt-24 pb-16 flex-1 flex flex-col">
        <div className="mb-10">
          <p
            className="text-[10px] tracking-[0.32em] uppercase font-bold mb-2"
            style={{ color: BRAND.primaryDark }}
          >
            Contents
          </p>
          <h1
            className="text-[36px] font-bold leading-tight"
            style={{ color: "#0f172a" }}
          >
            Table of Contents
          </h1>
          <div
            className="mt-4 h-1 w-16 rounded"
            style={{ background: BRAND.primary }}
          />
        </div>

        <div>{renderNodes(toc)}</div>
      </div>

      <PageFooter pageNum={pageNum} totalPages={totalPages} />
    </Page>
  );
};

// ──────────────────────────────────────────────────────────────
//   CONTENT BLOCK RENDERER — schema unchanged, visuals upgraded
// ──────────────────────────────────────────────────────────────
const ContentRenderer = ({ content }) => {
  if (!content) return null;

  return content.map((item, idx) => {
    switch (item.type) {
      case "paragraph":
        return (
          <p
            key={idx}
            className="mb-4"
            style={{ fontSize: "12.5px", lineHeight: 1.65, color: "#334155" }}
          >
            {item.text}
          </p>
        );

      case "bullet_list":
        return (
          <ul key={idx} className="mb-5 ml-1 space-y-2">
            {item.items.map((li, i) => (
              <li
                key={i}
                className="flex items-start gap-3"
                style={{
                  fontSize: "12.5px",
                  lineHeight: 1.55,
                  color: "#334155",
                }}
              >
                <span
                  className="mt-[7px] w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: BRAND.primaryDark }}
                />
                <span>{li}</span>
              </li>
            ))}
          </ul>
        );

      case "table":
        return (
          <div key={idx} className="mb-7 mt-3">
            {item.title && (
              <div className="flex items-center gap-2 mb-2.5">
                <div
                  className="w-1 h-4 rounded"
                  style={{ background: BRAND.primary }}
                />
                <h4
                  className="font-bold text-[12px]"
                  style={{ color: "#0f172a" }}
                >
                  {item.title}
                </h4>
              </div>
            )}
            <table
              className="w-full border-collapse"
              style={{ fontSize: "11px", border: "1px solid #e2e8f0" }}
            >
              <thead>
                <tr style={{ background: BRAND.primaryDark, color: "#ffffff" }}>
                  {item.headers.map((h, i) => (
                    <th
                      key={i}
                      className="px-3 py-2.5 text-left font-semibold"
                      style={{
                        borderRight:
                          i < item.headers.length - 1
                            ? "1px solid rgba(255,255,255,0.18)"
                            : "none",
                        letterSpacing: "0.02em",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {item.rows.map((row, i) => (
                  <tr
                    key={i}
                    style={{ background: i % 2 === 0 ? "#ffffff" : "#f8fafc" }}
                  >
                    {row.columns.map((col, j) => (
                      <td
                        key={j}
                        className="px-3 py-2.5 align-top"
                        style={{
                          color: "#1e293b",
                          borderTop: "1px solid #e2e8f0",
                          borderRight:
                            j < row.columns.length - 1
                              ? "1px solid #e2e8f0"
                              : "none",
                          verticalAlign: "top",
                        }}
                      >
                        <div>{col}</div>
                        {j === 0 && row.sub_rows && row.sub_rows.length > 0 && (
                          <div
                            className="mt-2 pl-3 space-y-1"
                            style={{ borderLeft: `2px solid ${BRAND.primary}` }}
                          >
                            {row.sub_rows.map((sr, sri) => (
                              <div
                                key={sri}
                                style={{
                                  fontSize: "10.5px",
                                  color: "#475569",
                                  lineHeight: 1.45,
                                }}
                              >
                                <span
                                  className="font-semibold"
                                  style={{ color: "#0f172a" }}
                                >
                                  {sr.label}:
                                </span>{" "}
                                {Array.isArray(sr.value)
                                  ? sr.value.join(", ")
                                  : sr.value}
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case "image":
        return (
          <div key={idx} className="mb-7 mt-3 flex flex-col items-center">
            <div
              className="w-full rounded-md p-6 text-center"
              style={{ background: "#0f172a", border: "1px solid #1e293b" }}
            >
              <span
                className="font-mono text-[11px]"
                style={{ color: "#34d399" }}
              >
                Diagram: {item.image.url}
              </span>
            </div>
            {item.caption && (
              <p
                className="mt-2 text-[10px] italic"
                style={{ color: "#64748b" }}
              >
                {item.caption}
              </p>
            )}
          </div>
        );

      case "tech_stack":
        return (
          <div key={idx} className="mb-6 grid grid-cols-2 gap-2.5">
            {item.items.map((tech, i) => (
              <div
                key={i}
                className="px-3 py-2 rounded-md flex items-start gap-2.5"
                style={{
                  background: BRAND.primaryFaint,
                  border: `1px solid ${BRAND.primaryLight}`,
                }}
              >
                <div
                  className="w-1 self-stretch rounded"
                  style={{ background: BRAND.primary, minWidth: 4 }}
                />
                <div style={{ fontSize: "11.5px", lineHeight: 1.45 }}>
                  <p className="font-bold" style={{ color: BRAND.primaryDark }}>
                    {tech.category}
                  </p>
                  <p style={{ color: "#334155" }}>{tech.value}</p>
                </div>
              </div>
            ))}
          </div>
        );

      case "agent_specification":
        return (
          <div
            key={idx}
            className="mb-6 rounded-lg overflow-hidden"
            style={{ border: "1px solid #e2e8f0" }}
          >
            <div
              className="px-4 py-2.5 flex items-center gap-2"
              style={{ background: BRAND.primaryDark }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
              </svg>
              <span
                className="font-bold text-[12px]"
                style={{ color: "#ffffff" }}
              >
                {item.agent.name}
              </span>
            </div>
            <div
              className="grid grid-cols-2 gap-x-6 gap-y-1.5 p-4"
              style={{
                background: "#ffffff",
                fontSize: "11px",
                color: "#334155",
              }}
            >
              <SpecRow label="Role" value={item.agent.role} />
              <SpecRow label="Framework" value={item.agent.framework} />
              <SpecRow label="Model" value={item.agent.model} />
              <div
                className="col-span-2 mt-2 pt-3"
                style={{ borderTop: "1px solid #f1f5f9" }}
              >
                <p
                  className="font-semibold mb-1.5"
                  style={{ color: "#0f172a" }}
                >
                  Responsibilities
                </p>
                <ul className="space-y-1">
                  {item.responsibilities.map((r, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span
                        className="mt-[6px] w-1 h-1 rounded-full shrink-0"
                        style={{ background: BRAND.primary }}
                      />
                      <span style={{ fontSize: "10.5px", lineHeight: 1.5 }}>
                        {r}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        );

      case "risk_dimensions":
        return (
          <div key={idx} className="mb-6 grid grid-cols-1 gap-2">
            {item.dimensions.map((dim, i) => (
              <div
                key={i}
                className="px-3.5 py-2.5 rounded-md flex items-start gap-3"
                style={{ background: "#fef9c3", border: "1px solid #fde68a" }}
              >
                <div
                  className="font-mono text-[10px] font-bold mt-0.5"
                  style={{ color: "#92400e", minWidth: 24 }}
                >
                  R{String(i + 1).padStart(2, "0")}
                </div>
                <div style={{ fontSize: "11.5px", lineHeight: 1.5 }}>
                  <p className="font-bold" style={{ color: "#78350f" }}>
                    {dim.name}
                  </p>
                  <p style={{ color: "#451a03" }}>{dim.description}</p>
                </div>
              </div>
            ))}
          </div>
        );

      default:
        return null;
    }
  });
};

const SpecRow = ({ label, value }) => (
  <div>
    <span className="font-semibold" style={{ color: "#64748b" }}>
      {label}:
    </span>{" "}
    <span style={{ color: "#0f172a" }}>{value}</span>
  </div>
);

// ──────────────────────────────────────────────────────────────
//   SECTION  — emerald rule under H1, accent bar on H2
// ──────────────────────────────────────────────────────────────
const Section = ({ section }) => {
  if (section.level === 1) {
    return (
      <div className="mb-7">
        <div
          className="flex items-baseline gap-4 mb-5 pb-3"
          style={{ borderBottom: `2px solid ${BRAND.primary}` }}
        >
          <span
            className="font-black leading-none"
            style={{ color: BRAND.primaryLight, fontSize: "46px" }}
          >
            {String(section.number).padStart(2, "0")}
          </span>
          <h2
            className="font-bold flex-1"
            style={{
              fontSize: "22px",
              color: "#0f172a",
              letterSpacing: "-0.01em",
            }}
          >
            {section.title}
          </h2>
        </div>
        {section.content && <ContentRenderer content={section.content} />}
        {section.children &&
          section.children.map((c) => <Section key={c.id} section={c} />)}
      </div>
    );
  }

  if (section.level === 2) {
    return (
      <div className="mb-5">
        <h3
          className="font-bold mb-3 pl-3 flex items-center gap-2"
          style={{
            fontSize: "15px",
            color: "#1e293b",
            borderLeft: `3px solid ${BRAND.primary}`,
          }}
        >
          <span
            className="font-mono text-[11px]"
            style={{ color: BRAND.primaryDark }}
          >
            {section.number}
          </span>
          <span>{section.title}</span>
        </h3>
        {section.content && <ContentRenderer content={section.content} />}
        {section.children &&
          section.children.map((c) => <Section key={c.id} section={c} />)}
      </div>
    );
  }

  return (
    <div className="mb-4">
      <h4
        className="font-semibold mb-2 flex items-center gap-2"
        style={{ fontSize: "12.5px", color: "#334155" }}
      >
        <span
          className="w-1 h-1 rounded-full"
          style={{ background: BRAND.primaryDark }}
        />
        <span className="font-mono text-[10px]" style={{ color: "#64748b" }}>
          {section.number}
        </span>
        <span>{section.title}</span>
      </h4>
      {section.content && <ContentRenderer content={section.content} />}
      {section.children &&
        section.children.map((c) => <Section key={c.id} section={c} />)}
    </div>
  );
};

// ──────────────────────────────────────────────────────────────
//   Content page wrapper — adds header bar + footer with page nums
// ──────────────────────────────────────────────────────────────
const ContentPage = ({
  chapter,
  pageNum,
  totalPages,
  classification,
  children,
}) => (
  <Page>
    <PageHeader chapter={chapter} />
    <div className="px-12 pt-20 pb-16 flex-1 overflow-hidden">{children}</div>
    <PageFooter
      pageNum={pageNum}
      totalPages={totalPages}
      classification={classification}
    />
  </Page>
);

// ──────────────────────────────────────────────────────────────
//   DEFAULT EXPORT — original page-splitting logic kept intact,
//   original outer wrapper structure (w-0 h-0) preserved
// ──────────────────────────────────────────────────────────────
export default function PdfReportTemplate({ id = "pdf-report-container" }) {
  const { document } = DUMMY_REPORT_DATA;
  const meta = document.metadata;

  // We divide sections into pages manually to simulate realistic A4 mapping
  const page1Sections = [document.sections[0], document.sections[1]]; // Sec 1 & 2

  // Section 3 is too long, so we explicitly split it across pages
  const sec3 = document.sections[2];

  const page2Sections = [
    {
      ...sec3,
      children: [sec3.children[0], sec3.children[1]], // 3.1, 3.2
    },
  ];

  const page3Sections = [
    {
      ...sec3,
      title: `${sec3.title} (Continued)`,
      content: null, // Don't repeat root content
      children: [sec3.children[2]], // 3.3
    },
  ];

  const page4Sections = [
    {
      ...sec3,
      title: `${sec3.title} (Continued)`,
      content: null, // Don't repeat root content
      children: [sec3.children[3]], // 3.4
    },
  ];

  const page5Sections = [document.sections[3], document.sections[4]]; // Sec 4 & 5

  const totalPages = 7; // cover + toc + 5 content pages
  const chapterFor = (sections) => sections[0]?.title || "";

  return (
    <div className="fixed left-[-9999px] top-0 overflow-hidden pointer-events-none">
      <div
        id={id}
        className="w-[794px] flex flex-col gap-4 bg-gray-200 p-8"
        // Wrapped in 0x0 overflow-hidden container so it doesn't affect UI at all
      >
        <CoverPage metadata={meta} />

        <TOCPage
          toc={document.table_of_contents}
          pageNum={2}
          totalPages={totalPages}
        />

        <ContentPage
          chapter={chapterFor(page1Sections)}
          pageNum={3}
          totalPages={totalPages}
          classification={meta.classification}
        >
          {page1Sections.map((sec) => (
            <Section key={sec.id} section={sec} />
          ))}
        </ContentPage>

        <ContentPage
          chapter={chapterFor(page2Sections)}
          pageNum={4}
          totalPages={totalPages}
          classification={meta.classification}
        >
          {page2Sections.map((sec) => (
            <Section key={sec.id} section={sec} />
          ))}
        </ContentPage>

        <ContentPage
          chapter={chapterFor(page3Sections)}
          pageNum={5}
          totalPages={totalPages}
          classification={meta.classification}
        >
          {page3Sections.map((sec) => (
            <Section key={sec.id} section={sec} />
          ))}
        </ContentPage>

        <ContentPage
          chapter={chapterFor(page4Sections)}
          pageNum={6}
          totalPages={totalPages}
          classification={meta.classification}
        >
          {page4Sections.map((sec) => (
            <Section key={sec.id} section={sec} />
          ))}
        </ContentPage>

        <ContentPage
          chapter={chapterFor(page5Sections)}
          pageNum={7}
          totalPages={totalPages}
          classification={meta.classification}
        >
          {page5Sections.map((sec) => (
            <Section key={sec.id} section={sec} />
          ))}
        </ContentPage>
      </div>
    </div>
  );
}
