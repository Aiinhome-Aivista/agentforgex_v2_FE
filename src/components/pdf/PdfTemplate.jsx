import React from 'react';

// A4 sizing for our fixed-width print rendering
const PAGE_WIDTH = 794;
const PAGE_HEIGHT = 1122;
const PAGE_PADDING = 60;

export default function PdfTemplate({ data }) {
  if (!data) return null;

  const { document: docMeta, sections } = data;

  // A helper component to render key-value tech stack items
  const renderTechBlocks = (title, itemsObj) => {
    if (!itemsObj || Object.keys(itemsObj).length === 0) return null;
    return (
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: "#111", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {title}
        </h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          {Object.entries(itemsObj).map(([k, v]) => (
            <div key={k} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: "10px 14px", background: "#f9fafb", fontSize: 12, flex: "1 1 45%" }}>
              <span style={{ fontWeight: 700, color: "#374151", textTransform: "capitalize", display: "block", marginBottom: 4 }}>{k.replace(/_/g, ' ')}</span>
              <span style={{ color: "#6b7280", lineHeight: 1.5 }}>{Array.isArray(v) ? v.join(', ') : v}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", color: "#111", width: PAGE_WIDTH, margin: "0 auto", background: "#fff" }}>
      
      {/* ════════════ COVER PAGE ════════════ */}
      <div 
        className="pdf-atomic pdf-print-page-break" 
        style={{ 
          width: PAGE_WIDTH, 
          height: PAGE_HEIGHT, 
          background: "linear-gradient(135deg, #011614 0%, #04362d 100%)", 
          color: "#fff", 
          position: "relative",
          padding: PAGE_PADDING,
          boxSizing: "border-box",
          overflow: "hidden"
        }}
      >
        {/* Decorative elements */}
        <div style={{ position: "absolute", top: "-10%", right: "-10%", width: 600, height: 600, background: "radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)", borderRadius: "50%" }}></div>
        <div style={{ position: "absolute", bottom: "-20%", left: "-10%", width: 800, height: 800, background: "radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)", borderRadius: "50%" }}></div>

        {/* Top bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative", zIndex: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 28, height: 28, background: "#10b981", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 12, height: 12, background: "#fff", borderRadius: 2 }}></div>
            </div>
            <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" }}>Agent Forge</span>
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#10b981", letterSpacing: "0.2em", border: "1px solid rgba(16,185,129,0.3)", padding: "4px 12px", borderRadius: 20 }}>CONFIDENTIAL</span>
        </div>

        {/* Center content */}
        <div style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", width: "calc(100% - 120px)", zIndex: 10 }}>
          <p style={{ color: "#10b981", fontWeight: 800, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: 20 }}>
            {docMeta?.document_type || "Technical Design"}
          </p>
          <h1 style={{ fontSize: 46, fontWeight: 900, color: "#fff", lineHeight: 1.2, marginBottom: 24, textWrap: "balance" }}>
            {docMeta?.title}
          </h1>
          <p style={{ fontSize: 15, color: "#9ca3af", fontWeight: 500, borderLeft: "3px solid #10b981", paddingLeft: 16 }}>
            Prepared for {docMeta?.organization || "Organization Name"}
          </p>
        </div>

        {/* Bottom bar */}
        <div style={{ position: "absolute", bottom: PAGE_PADDING, width: `calc(100% - ${PAGE_PADDING * 2}px)`, display: "flex", justifyContent: "space-between", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 24, zIndex: 10 }}>
          <div style={{ display: "flex", gap: 48, fontSize: 12, color: "#9ca3af" }}>
            <span><strong style={{ color: "#fff", display: "block", marginBottom: 4, textTransform: "uppercase", fontSize: 10, letterSpacing: "0.1em" }}>Date</strong> {docMeta?.date}</span>
            <span><strong style={{ color: "#fff", display: "block", marginBottom: 4, textTransform: "uppercase", fontSize: 10, letterSpacing: "0.1em" }}>Version</strong> {docMeta?.version}</span>
          </div>
          <div style={{ fontSize: 12, color: "#9ca3af", textAlign: "right" }}>
            <strong style={{ color: "#fff", display: "block", marginBottom: 4, textTransform: "uppercase", fontSize: 10, letterSpacing: "0.1em" }}>Organization</strong> {docMeta?.organization}
          </div>
        </div>
      </div>

      {/* ════════════ TABLE OF CONTENTS ════════════ */}
      <div 
        className="pdf-atomic pdf-print-page-break" 
        style={{ 
          width: PAGE_WIDTH, 
          height: PAGE_HEIGHT, 
          background: "#fff", 
          padding: PAGE_PADDING,
          boxSizing: "border-box"
        }}
      >
        <div style={{ marginBottom: 48, display: "flex", alignItems: "center", gap: 12 }}>
           <div style={{ width: 16, height: 16, background: "#10b981", borderRadius: 4 }}></div>
           <span style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.1em" }}>Agent Forge</span>
        </div>
        
        <h2 style={{ fontSize: 28, fontWeight: 800, color: "#111", marginBottom: 40, paddingBottom: 16 }}>
          Table of Contents
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: "85%" }}>
          {sections?.map((sec, idx) => (
            <div key={idx} style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: "#10b981", minWidth: 24 }}>{String(sec.section_no).padStart(2, '0')}</span>
              <span style={{ fontSize: 16, fontWeight: 600, color: "#374151" }}>{sec.title}</span>
              <span style={{ borderBottom: "2px dotted #e5e7eb", flexGrow: 1, margin: "0 8px", position: "relative", top: -4 }}></span>
            </div>
          ))}
        </div>
      </div>

      {/* ════════════ CONTENT SECTIONS ════════════ */}
      <div style={{ background: "#fff", padding: PAGE_PADDING, boxSizing: "border-box", width: PAGE_WIDTH }}>
        {sections?.map((section, idx) => (
          <div key={idx} className="pdf-atomic pdf-print-page-break" style={{ marginBottom: 64, paddingBottom: 32, borderBottom: idx !== sections.length - 1 ? "1px solid #f3f4f6" : "none" }}>
            
            {/* Header branding on content pages */}
            <div style={{ marginBottom: 40, display: "flex", alignItems: "center", gap: 12 }}>
               <div style={{ width: 16, height: 16, background: "#10b981", borderRadius: 4 }}></div>
               <span style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em" }}>Technical Design Document</span>
            </div>

            {/* Section Title */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 32 }}>
              <span style={{ fontSize: 36, fontWeight: 300, color: "#10b981", lineHeight: 1 }}>{String(section.section_no).padStart(2, '0')}</span>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: "#111", lineHeight: 1.3, marginTop: 4 }}>{section.title}</h2>
            </div>

            {/* Summary */}
            {section.summary && (
              <p style={{ fontSize: 13, color: "#4b5563", lineHeight: 1.8, marginBottom: 32 }}>
                {section.summary}
              </p>
            )}

            {/* Subsections */}
            {section.subsections && section.subsections.map((sub, sIdx) => (
              <div key={sIdx} style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981" }}></span>
                  {sub.title}
                </h3>
                {sub.items && (
                  <ul style={{ margin: 0, paddingLeft: 24, fontSize: 13, color: "#4b5563", lineHeight: 1.8 }}>
                    {sub.items.map((item, iIdx) => (
                      <li key={iIdx} style={{ marginBottom: 8 }}>{item}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}

            {/* Architecture Layers */}
            {section.architecture_layers && (
              <div style={{ marginBottom: 32 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: "#111", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>Architecture Layers</h3>
                <div style={{ borderLeft: "3px solid #10b981", paddingLeft: 16 }}>
                  <ul style={{ margin: 0, padding: 0, listStyle: "none", fontSize: 13, color: "#4b5563", lineHeight: 1.8 }}>
                    {section.architecture_layers.map((layer, lIdx) => (
                      <li key={lIdx} style={{ marginBottom: 8, position: "relative" }}>
                        <strong style={{ color: "#374151" }}>Layer {lIdx + 1}:</strong> {layer}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Frontend & Backend */}
            {(section.frontend || section.backend) && (
              <div style={{ display: "flex", gap: 24, marginBottom: 32 }}>
                {section.frontend && (
                  <div style={{ flex: 1, border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, background: "#fff", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)" }}>
                    <h3 style={{ fontSize: 14, fontWeight: 800, color: "#111", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
                      Frontend
                    </h3>
                    <div style={{ fontSize: 12, color: "#4b5563", display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed #e5e7eb", paddingBottom: 4 }}>
                        <strong>Framework</strong> <span>{section.frontend.framework}</span>
                      </div>
                      {section.frontend.state_management && (
                        <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed #e5e7eb", paddingBottom: 4 }}>
                          <strong>State</strong> <span>{section.frontend.state_management.join(', ')}</span>
                        </div>
                      )}
                      {section.frontend.styling && (
                        <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed #e5e7eb", paddingBottom: 4 }}>
                          <strong>Styling</strong> <span>{section.frontend.styling.join(', ')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {section.backend && (
                  <div style={{ flex: 1, border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, background: "#fff", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)" }}>
                    <h3 style={{ fontSize: 14, fontWeight: 800, color: "#111", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      Backend
                    </h3>
                    <div style={{ fontSize: 12, color: "#4b5563", display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed #e5e7eb", paddingBottom: 4 }}>
                        <strong>Runtime</strong> <span>{section.backend.runtime}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed #e5e7eb", paddingBottom: 4 }}>
                        <strong>Queue</strong> <span>{section.backend.queue}</span>
                      </div>
                      {section.backend.websocket && (
                         <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed #e5e7eb", paddingBottom: 4 }}>
                           <strong>WebSocket</strong> <span>Enabled</span>
                         </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Agents Table */}
            {section.agents && (
              <div style={{ marginBottom: 32 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: "#111", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>Agent Definitions</h3>
                <div style={{ borderRadius: 8, border: "1px solid #e5e7eb", overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead style={{ background: "#f9fafb" }}>
                      <tr>
                        <th style={{ borderBottom: "1px solid #e5e7eb", textAlign: "left", padding: "12px 16px", color: "#374151", fontWeight: 700, width: "20%" }}>ID</th>
                        <th style={{ borderBottom: "1px solid #e5e7eb", textAlign: "left", padding: "12px 16px", color: "#374151", fontWeight: 700, width: "30%" }}>Name</th>
                        <th style={{ borderBottom: "1px solid #e5e7eb", textAlign: "left", padding: "12px 16px", color: "#374151", fontWeight: 700, width: "50%" }}>Role</th>
                      </tr>
                    </thead>
                    <tbody>
                      {section.agents.map((agent, aIdx) => (
                        <tr key={agent.agent_id} style={{ background: aIdx % 2 === 0 ? "#fff" : "#fcfcfc" }}>
                          <td style={{ borderBottom: "1px solid #f3f4f6", padding: "12px 16px", color: "#6b7280", fontFamily: "monospace" }}>{agent.agent_id}</td>
                          <td style={{ borderBottom: "1px solid #f3f4f6", padding: "12px 16px", fontWeight: 600, color: "#111" }}>{agent.name}</td>
                          <td style={{ borderBottom: "1px solid #f3f4f6", padding: "12px 16px", color: "#4b5563" }}>{agent.role}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Components / Frameworks / Tech Stack */}
            {renderTechBlocks("Frameworks", section.frameworks)}
            {renderTechBlocks("Components", section.components)}
            {renderTechBlocks("Tech Stack", section.tech_stack)}

            {/* Arrays like report_sections, memory_types */}
            {['report_sections', 'memory_types'].map((key) => {
              if (section[key]) {
                return (
                  <div key={key} style={{ marginBottom: 24 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: "#111", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      {key.replace(/_/g, ' ')}
                    </h3>
                    <div style={{ background: "#f9fafb", borderRadius: 8, padding: 16, border: "1px solid #e5e7eb" }}>
                      <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: "#4b5563", lineHeight: 1.8 }}>
                        {section[key].map((item, iIdx) => (
                          <li key={iIdx} style={{ marginBottom: 6 }}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              }
              return null;
            })}

          </div>
        ))}
      </div>
    </div>
  );
}
