// import {
//   BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
//   ResponsiveContainer, Cell
// } from 'recharts'
// import { usePDF } from '../../context/PdfContext'

// const getBarColor = (value) => {
//   if (value >= 80) return '#10b981' // Emerald-500
//   if (value >= 50) return '#f59e0b' // Amber-500
//   return '#f87171' // Red-400
// }

// const CustomTooltip = ({ active, payload, isPdf }) => {
//   if (!active || !payload?.length) return null
//   const d = payload[0]
//   return (
//     <div className={`${isPdf ? 'bg-white border-gray-200 text-gray-900' : 'bg-[#171717] border-white/10 text-white/90'} border shadow-2xl rounded-xl px-4 py-3 text-sm backdrop-blur-md`}>
//       <p className="font-semibold">{d.payload.title}</p>
//       <p className="text-brand-500 font-bold mt-0.5">{d.value}% automation potential</p>
//       <p className={`${isPdf ? 'text-gray-400' : 'text-white/40'} text-xs mt-0.5`}>{d.payload.actor}</p>
//     </div>
//   )
// }

// const CustomLabel = ({ x, y, width, value }) => (
//   <text x={x + width / 2} y={y - 5} textAnchor="middle"
//     fontSize={10} fill={getBarColor(value)} fontWeight="600">
//     {value}%
//   </text>
// )

// export default function AutomationChart({ steps }) {
//   const isPdf = usePDF()
//   if (!steps?.length) return null

//   const data = steps.map(s => ({
//     title: s.title?.length > 16 ? s.title.slice(0, 14) + '…' : s.title,
//     fullTitle: s.title,
//     actor: s.actor,
//     value: s.automation_potential,
//   }))

//   const textColor = isPdf ? '#374151' : '#ffffff40'
//   const gridColor = isPdf ? '#e5e7eb' : '#ffffff10'

//   return (
//     <div 
//       className={isPdf ? "w-full mt-6 pb-12 bg-white" : "card p-6 mt-6"}
//       style={isPdf ? { height: '400px' } : {}}
//     >
//       <h3 className={isPdf ? "text-sm font-bold text-gray-900 mb-6 uppercase tracking-wider" : "text-sm font-semibold text-white/70 mb-6"}>
//         Automation Potential Analysis
//       </h3>
//       <div style={{ height: isPdf ? '280px' : '260px' }}>
//         <ResponsiveContainer width="100%" height="100%">
//           <BarChart data={data} margin={{ top: 20, right: 16, left: -10, bottom: 40 }}>
//             <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
//             <XAxis
//               dataKey="title"
//               tick={{ fontSize: 10, fill: textColor }}
//               angle={-40}
//               textAnchor="end"
//               interval={0}
//               height={60}
//             />
//             <YAxis
//               domain={[0, 100]}
//               tick={{ fontSize: 10, fill: textColor }}
//               tickFormatter={v => `${v}%`}
//             />
//             <Tooltip content={<CustomTooltip isPdf={isPdf} />} cursor={{ fill: isPdf ? '#f3f4f6' : '#ffffff05' }} />
//             <Bar dataKey="value" radius={[6, 6, 0, 0]} label={<CustomLabel isPdf={isPdf} />}>
//               {data.map((d, i) => (
//                 <Cell key={i} fill={getBarColor(d.value)} />
//               ))}
//             </Bar>
//           </BarChart>
//         </ResponsiveContainer>
//       </div>
//       {/* Legend */}
//       <div className="flex items-center gap-5 mt-6 justify-center">
//         {[['#10b981', '≥ 80% High'], ['#f59e0b', '50–79% Medium'], ['#f87171', '< 50% Low']].map(([c, l]) => (
//           <div key={l} className={`flex items-center gap-1.5 text-[10px] ${isPdf ? 'text-gray-500 font-bold' : 'text-white/40'}`}>
//             <span className="w-3 h-3 rounded-sm inline-block" style={{ background: c }} />
//             {l}
//           </div>
//         ))}
//       </div>
//     </div>
//   )
// }
