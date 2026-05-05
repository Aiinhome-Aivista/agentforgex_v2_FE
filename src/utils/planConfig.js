// Pricing matrix — keep in sync with subscription_plans seed in the SQL migration.
// (Source of truth on server side; this is a UI fallback used to render the
// pricing page if the API is unreachable.)

export const PLAN_FEATURES = {
  free: {
    code: 'free',
    name: 'Free',
    period_days: 3,
    price_inr: 0,
    price_usd: 0,
    datasize_label: '50 MB',
    workspaces: 3,
    addon_packet_inr: null,
    has_market_research: false,
    has_deep_insights: false,
    inputs:  ['ERP dump', 'Docs', 'Conv txt', 'Web search'],
    reports: ['Downloadable insight', 'Process workflow downloadable'],
  },
  basic: {
    code: 'basic',
    name: 'Basic',
    period_days: 30,
    price_inr: 500,
    price_usd: 200,
    datasize_label: '100 MB',
    workspaces: 10,
    addon_packet_inr: 500, // per +10 workspaces
    has_market_research: false,
    has_deep_insights: false,
    inputs:  ['ERP dump', 'Docs', 'Conv txt', 'Web search'],
    reports: ['Downloadable insight', 'Process workflow downloadable'],
  },
  premium: {
    code: 'premium',
    name: 'Premium',
    period_days: 30,
    price_inr: 1000,
    price_usd: 500,
    datasize_label: '1 GB',
    workspaces: 20,
    addon_packet_inr: 500,
    has_market_research: true,  // Gartner, Nielson
    has_deep_insights: true,
    inputs:  ['ERP dump', 'Docs', 'Conv txt', 'Web search', 'Gartner', 'Nielson'],
    reports: ['Downloadable insight', 'Process workflow downloadable'],
  },
}

export const PLAN_ORDER = ['free', 'basic', 'premium']

export function priceForCountry(plan, country) {
  if (!plan) return { amount: 0, currency: 'INR', label: 'Free' }
  const isIN = String(country || 'IN').toUpperCase() === 'IN'
  const amount = isIN ? Number(plan.price_inr) : Number(plan.price_usd)
  const currency = isIN ? 'INR' : 'USD'
  if (amount === 0) return { amount: 0, currency, label: 'Free' }
  const symbol = isIN ? '₹' : '$'
  return { amount, currency, label: `${symbol}${amount}` }
}
