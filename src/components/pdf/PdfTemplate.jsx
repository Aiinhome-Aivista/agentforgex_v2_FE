import React from 'react';
import { Zap } from 'lucide-react';

// A4 sizing for our fixed-width print rendering
const PAGE_WIDTH = 794;
const PAGE_HEIGHT = 1122;
const PAGE_PADDING = 60;

export default function PdfTemplate({ data, suggestionTitle }) {
  if (!data) return null;

  const docMeta = data.cover_page || data.document || data.document_metadata;
  const { sections } = data;
  const tocItems = data.table_of_contents || sections;

  const renderGenericData = (content, level = 0) => {
    if (content === null || content === undefined) return null;
    
    if (typeof content === 'string' || typeof content === 'number' || typeof content === 'boolean') {
      return <span style={{ fontSize: 13, color: "#4b5563", lineHeight: 1.6 }}>{String(content)}</span>;
    }

    if (Array.isArray(content)) {
      if (content.length === 0) return null;
      if (typeof content[0] === 'string' || typeof content[0] === 'number') {
        return (
          <span style={{ fontSize: 13, color: "#4b5563", lineHeight: 1.6 }}>
            {content.join(', ')}
          </span>
        );
      }
      
      // Array of objects
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8, marginBottom: 12 }}>
          {content.map((item, i) => (
            <div key={i} style={{ paddingBottom: 16, borderBottom: i < content.length - 1 ? "1px dashed #e5e7eb" : "none" }}>
              {renderGenericData(item, level + 1)}
            </div>
          ))}
        </div>
      );
    }

    if (typeof content === 'object') {
      const keys = Object.keys(content).filter(k => !['id', 'layer_id', 'agent_id', 'section_number', 'section_no'].includes(k));
      if (keys.length === 0) return null;
      
      const titleKey = keys.find(k => ['title', 'name', 'component_name', 'tool_name', 'type', 'rail_type', 'store_type', 'memory_type', 'workflow_name'].includes(k));
      const titleValue = titleKey ? content[titleKey] : null;
      
      const renderKeys = keys.filter(k => k !== titleKey);

      return (
        <div style={{ marginBottom: level === 0 ? 0 : 8 }}>
          {titleValue && (
            <h4 style={{ fontSize: 15, fontWeight: 700, color: "#10b981", marginBottom: 12, marginTop: 0, paddingBottom: 8, borderBottom: "1px solid #e5e7eb" }}>
              {titleValue}
            </h4>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {renderKeys.map(k => {
              const val = content[k];
              if (val === null || val === undefined || val === '') return null;
              
              const isSimple = typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean';
              const isStringArray = Array.isArray(val) && (val.length === 0 || typeof val[0] === 'string' || typeof val[0] === 'number');
              
              return (
                <div key={k} style={{ display: isSimple ? 'flex' : 'block', gap: 16, alignItems: 'baseline' }}>
                  <strong style={{ 
                    fontSize: 12, 
                    color: "#374151", 
                    textTransform: "uppercase", 
                    letterSpacing: "0.05em", 
                    minWidth: isSimple ? 160 : 'auto', 
                    marginBottom: (isSimple || isStringArray) ? 0 : 8, 
                    display: isSimple ? 'inline-block' : 'block' 
                  }}>
                    {k.replace(/_/g, ' ')}
                  </strong>
                  <div style={{ flex: 1 }}>
                    {renderGenericData(val, level + 1)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    
    return null;
  };

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", color: "#111", width: PAGE_WIDTH, margin: "0 auto", background: "#fff", textAlign: "left" }}>
      
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
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 28, height: 28, background: "#10b981", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Zap size={16} color="#000" fill="#000" />
            </div>
            <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em" }}>AgentForgeX</span>
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#10b981", letterSpacing: "0.2em", border: "1px solid rgba(16,185,129,0.3)", padding: "4px 12px", borderRadius: 20 }}>CONFIDENTIAL</span>
        </div>

        {/* Center content */}
        <div style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", width: "calc(100% - 120px)", zIndex: 10 }}>
          <p style={{ color: "#10b981", fontWeight: 800, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: 20 }}>
            {docMeta?.document_type || "Technical Design"}
          </p>
          <h1 style={{ fontSize: 46, fontWeight: 900, color: "#fff", lineHeight: 1.2, marginBottom: 24, textWrap: "balance" }}>
            {suggestionTitle || docMeta?.title}
          </h1>
          {docMeta?.subtitle && (
            <p style={{ fontSize: 20, fontWeight: 500, color: "#d1d5db", marginTop: 16 }}>
              {docMeta.subtitle}
            </p>
          )}
        </div>

        {/* Bottom bar */}
        <div style={{ position: "absolute", bottom: PAGE_PADDING, width: `calc(100% - ${PAGE_PADDING * 2}px)`, display: "flex", justifyContent: "space-between", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 24, zIndex: 10 }}>
          <div style={{ display: "flex", gap: 48, fontSize: 12, color: "#9ca3af" }}>
            <span><strong style={{ color: "#fff", display: "block", marginBottom: 4, textTransform: "uppercase", fontSize: 10, letterSpacing: "0.1em" }}>Date</strong> {docMeta?.date}</span>
            <span><strong style={{ color: "#fff", display: "block", marginBottom: 4, textTransform: "uppercase", fontSize: 10, letterSpacing: "0.1em" }}>Version</strong> {docMeta?.version}</span>
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
        <div style={{ marginBottom: 48, display: "flex", alignItems: "center", gap: 8 }}>
           <div style={{ width: 16, height: 16, background: "#10b981", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
             <Zap size={10} color="#000" fill="#000" />
           </div>
           <span style={{ fontSize: 13, fontWeight: 800, color: "#6b7280", letterSpacing: "-0.01em" }}>AgentForgeX</span>
        </div>
        
        <h2 style={{ fontSize: 28, fontWeight: 800, color: "#111", marginBottom: 40, paddingBottom: 16 }}>
          Table of Contents
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: "85%" }}>
          {tocItems?.map((sec, idx) => (
            <div key={idx} style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: "#10b981", minWidth: 24 }}>{String(sec.section_no || sec.section_number).padStart(2, '0')}</span>
              <span style={{ fontSize: 16, fontWeight: 600, color: "#374151" }}>{sec.title}</span>
              <span style={{ borderBottom: "2px dotted #e5e7eb", flexGrow: 1, margin: "0 8px", position: "relative", top: -4 }}></span>
              {sec.page && <span style={{ fontSize: 16, fontWeight: 600, color: "#374151" }}>{sec.page}</span>}
            </div>
          ))}
        </div>
      </div>

      {/* ════════════ CONTENT SECTIONS ════════════ */}
      <div style={{ background: "#fff", padding: PAGE_PADDING, boxSizing: "border-box", width: PAGE_WIDTH }}>
        {sections?.map((section, idx) => {
          // Extract section content, removing standard keys
          const sectionContentKeys = Object.keys(section).filter(k => !['section_no', 'section_number', 'title'].includes(k));
          
          return (
            <div key={idx} className="pdf-atomic pdf-print-page-break" style={{ marginBottom: 64, paddingBottom: 32, borderBottom: idx !== sections.length - 1 ? "1px solid #f3f4f6" : "none" }}>
              
              {/* Header branding on content pages */}
              <div style={{ marginBottom: 40, display: "flex", alignItems: "center", gap: 12 }}>
                 <div style={{ width: 16, height: 16, background: "#10b981", borderRadius: 4 }}></div>
                 <span style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em" }}>Technical Design Document</span>
              </div>

              {/* Section Title */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 32 }}>
                <span style={{ fontSize: 36, fontWeight: 300, color: "#10b981", lineHeight: 1 }}>{String(section.section_no || section.section_number).padStart(2, '0')}</span>
                <h2 style={{ fontSize: 24, fontWeight: 800, color: "#111", lineHeight: 1.3, marginTop: 4 }}>{section.title}</h2>
              </div>

              {/* Generic Content Renderer */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                {sectionContentKeys.map(key => (
                  <div key={key}>
                    <h3 style={{ fontSize: 16, fontWeight: 800, color: "#111", marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "2px solid #f3f4f6", paddingBottom: 8 }}>
                      {key.replace(/_/g, ' ')}
                    </h3>
                    {renderGenericData(section[key], 0)}
                  </div>
                ))}
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
}
