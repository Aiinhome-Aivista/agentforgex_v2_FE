import React from 'react';
import { DUMMY_REPORT_DATA } from '../../constants/dummyReportData';

// A4 Dimensions at 96 DPI: 794 x 1123 pixels
const PAGE_WIDTH = '794px';
const PAGE_HEIGHT = '1123px';

const Page = ({ children }) => (
  <div
    className="pdf-page bg-white relative flex flex-col overflow-hidden text-black shrink-0"
    style={{
      width: PAGE_WIDTH,
      height: PAGE_HEIGHT,
      fontFamily: "'Georgia', serif", // Serif font as per screenshots
    }}
  >
    {children}
  </div>
);

const HeaderFooter = ({ version = "Draft V1.0" }) => (
  <div className="absolute top-8 right-12 text-xs text-gray-500 font-sans">
    {version}
  </div>
);

const CoverPage = ({ metadata }) => (
  <Page>
    <div className="flex-1 flex flex-col justify-between p-16 relative">
      {/* Background Gradient / Graphics */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
         <div className="absolute -top-40 -left-40 w-[800px] h-[800px] bg-orange-100/30 rounded-full blur-3xl"></div>
         <div className="absolute top-[20%] right-[-20%] w-[600px] h-[600px] bg-orange-200/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 mt-32">
        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 leading-tight mb-8">
          {metadata.title}
        </h1>
        <h2 className="text-xl font-semibold text-slate-800 mb-6">
          {metadata.subtitle}
        </h2>
        <div className="text-sm font-sans space-y-2 text-slate-700">
          <p>{metadata.date}</p>
          <br/>
          <p>{metadata.version}</p>
        </div>
      </div>

      {/* Abstract geometric shapes matching screenshot */}
      <div className="relative z-10 flex flex-col mt-auto mb-32 items-center w-full">
         <div className="flex w-full items-center justify-center -space-x-12">
            <div className="w-[300px] h-[80px] bg-[#ff4a00] transform -skew-x-[30deg]"></div>
            <div className="w-[300px] h-[80px] bg-[#ff4a00] transform -skew-x-[30deg] -translate-y-[80px] translate-x-[40px]"></div>
         </div>
      </div>
    </div>
  </Page>
);

const TOCPage = ({ toc }) => {
  const renderItem = (item) => (
    <div key={item.id} className={`flex justify-between items-end mb-3 ${item.level === 1 ? 'font-bold mt-4' : item.level === 2 ? 'ml-6' : 'ml-12 text-slate-600 text-[12px]'}`}>
      <div className="flex gap-4 bg-white pr-2 z-10">
        <span>{item.number}</span>
        <span>{item.title}</span>
      </div>
      <div className="flex-1 border-b border-dotted border-gray-400 mb-1 z-0 relative top-[-6px] mx-2"></div>
      <div className="bg-white pl-2 z-10">{item.page}</div>
    </div>
  );

  const renderNodes = (nodes) => {
    if (!nodes) return null;
    return nodes.map(node => (
      <React.Fragment key={node.id}>
        {renderItem(node)}
        {node.children && renderNodes(node.children)}
      </React.Fragment>
    ));
  };

  return (
    <Page>
      <HeaderFooter />
      <div className="p-16 pt-24 flex-1">
        <h1 className="text-3xl font-bold mb-12 text-slate-900">Table of Contents</h1>
        <div className="font-sans text-[13px] text-slate-800">
          {renderNodes(toc)}
        </div>
      </div>
    </Page>
  );
};

const ContentRenderer = ({ content }) => {
  if (!content) return null;

  return content.map((item, idx) => {
    switch (item.type) {
      case 'paragraph':
        return <p key={idx} className="mb-4 text-[13px] font-sans leading-relaxed text-slate-700">{item.text}</p>;
      case 'bullet_list':
        return (
          <div key={idx} className="ml-4 mb-6 text-[13px] font-sans text-slate-700 space-y-2">
            {item.items.map((li, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-slate-600 font-bold leading-none mt-[3px]">•</span>
                <div className="leading-tight">{li}</div>
              </div>
            ))}
          </div>
        );
      case 'table':
        return (
          <div key={idx} className="mb-8 mt-4 font-sans text-[12px]">
            {item.title && <h4 className="font-bold mb-2 text-slate-800">{item.title}</h4>}
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#ff8a00] text-white">
                  {item.headers.map((h, i) => (
                    <th key={i} className="border border-gray-300 p-2 text-left font-bold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {item.rows.map((row, i) => (
                  <tr key={i} className="bg-white">
                    {row.columns.map((col, j) => (
                      <td key={j} className="border border-gray-300 p-2 text-slate-700">
                        {col}
                        {j === 0 && row.sub_rows && (
                           <div className="mt-2 pl-2 border-l-2 border-gray-200">
                             {row.sub_rows.map((sr, sri) => (
                               <div key={sri} className="mt-1">
                                 <span className="font-semibold text-xs">{sr.label}: </span>
                                 <span className="text-xs text-gray-600">
                                   {Array.isArray(sr.value) ? sr.value.join(', ') : sr.value}
                                 </span>
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
      case 'image':
        return (
           <div key={idx} className="mb-8 mt-4 flex flex-col items-center">
             <div className="bg-slate-900 w-full rounded-md border border-slate-700 p-4 text-center">
                <span className="text-emerald-400 font-mono text-xs">Image Placeholder: {item.image.url}</span>
             </div>
             {item.caption && <p className="mt-2 text-xs italic text-gray-500 font-sans">{item.caption}</p>}
           </div>
        );
      case 'tech_stack':
        return (
          <div key={idx} className="ml-4 mb-6 text-[13px] font-sans text-slate-700 space-y-2">
            {item.items.map((tech, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-slate-600 font-bold leading-none mt-[3px]">•</span>
                <div className="leading-tight">
                  <strong>{tech.category}:</strong> {tech.value}
                </div>
              </div>
            ))}
          </div>
        );
      case 'agent_specification':
        return (
          <div key={idx} className="mb-6 mt-2 font-sans text-[12px] text-slate-700 border border-gray-200 rounded-md overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
              <strong className="text-[13px]">{item.agent.name}</strong>
            </div>
            <div className="p-4 grid grid-cols-2 gap-4">
              <div>
                <p><strong>Role:</strong> {item.agent.role}</p>
                <p><strong>Framework:</strong> {item.agent.framework}</p>
                <p><strong>Model:</strong> {item.agent.model}</p>
              </div>
              <div>
                <p className="font-bold mb-1">Responsibilities:</p>
                <div className="ml-2 mt-1 space-y-1 text-xs">
                  {item.responsibilities.map((r, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-slate-600 font-bold leading-none mt-[2px]">•</span>
                      <div className="leading-tight">{r}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      case 'risk_dimensions':
        return (
          <div key={idx} className="ml-4 mb-6 text-[13px] font-sans text-slate-700 space-y-2">
            {item.dimensions.map((dim, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-slate-600 font-bold leading-none mt-[3px]">•</span>
                <div className="leading-tight">
                  <strong>{dim.name}:</strong> {dim.description}
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

const Section = ({ section }) => {
  return (
    <div className="mb-8">
      {section.level === 1 ? (
        <h2 className="text-2xl font-bold mb-6 text-slate-900 border-b pb-2">
          {section.number}. {section.title}
        </h2>
      ) : section.level === 2 ? (
        <h3 className="text-lg font-bold mb-4 mt-6 text-slate-800">
          {section.number} {section.title}
        </h3>
      ) : (
        <h4 className="text-md font-bold mb-3 mt-4 text-slate-700">
          {section.number} {section.title}
        </h4>
      )}

      {section.content && <ContentRenderer content={section.content} />}

      {section.children && section.children.map(child => (
        <Section key={child.id} section={child} />
      ))}
    </div>
  );
};

export default function PdfReportTemplate({ id = "pdf-report-container" }) {
  const { document } = DUMMY_REPORT_DATA;
  
  // We divide sections into pages manually to simulate realistic A4 mapping
  const page1Sections = [document.sections[0], document.sections[1]]; // Sec 1 & 2

  // Section 3 is too long, so we explicitly split it across pages
  const sec3 = document.sections[2];
  
  const page2Sections = [{
    ...sec3,
    children: [sec3.children[0], sec3.children[1]] // 3.1, 3.2
  }];

  const page3Sections = [{
    ...sec3,
    title: `${sec3.title} (Continued)`,
    content: null, // Don't repeat root content
    children: [sec3.children[2]] // 3.3
  }];

  const page4Sections = [{
    ...sec3,
    title: `${sec3.title} (Continued)`,
    content: null, // Don't repeat root content
    children: [sec3.children[3]] // 3.4
  }];

  const page5Sections = [document.sections[3], document.sections[4]]; // Sec 4 & 5

  return (
    <div
      id={id}
      className="absolute top-[10000px] left-[-10000px] opacity-0 pointer-events-none flex flex-col gap-4 bg-gray-200 p-8"
      // Position offscreen so it doesn't affect the UI, but can still be captured by html2canvas
    >
      <CoverPage metadata={document.metadata} />
      
      <TOCPage toc={document.table_of_contents} />

      <Page>
        <HeaderFooter version={document.metadata.version} />
        <div className="p-16 pt-24 flex-1">
          {page1Sections.map(sec => <Section key={sec.id} section={sec} />)}
        </div>
      </Page>

      <Page>
        <HeaderFooter version={document.metadata.version} />
        <div className="p-16 pt-24 flex-1">
          {page2Sections.map(sec => <Section key={sec.id} section={sec} />)}
        </div>
      </Page>

      <Page>
        <HeaderFooter version={document.metadata.version} />
        <div className="p-16 pt-24 flex-1">
          {page3Sections.map(sec => <Section key={sec.id} section={sec} />)}
        </div>
      </Page>

      <Page>
        <HeaderFooter version={document.metadata.version} />
        <div className="p-16 pt-24 flex-1">
          {page4Sections.map(sec => <Section key={sec.id} section={sec} />)}
        </div>
      </Page>

      <Page>
        <HeaderFooter version={document.metadata.version} />
        <div className="p-16 pt-24 flex-1">
          {page5Sections.map(sec => <Section key={sec.id} section={sec} />)}
        </div>
      </Page>
    </div>
  );
}
