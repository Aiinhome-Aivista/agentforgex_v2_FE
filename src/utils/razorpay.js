// Loads the Razorpay Checkout script on demand.
// Returns a Promise<boolean> resolving once `window.Razorpay` is ready.

const SRC = 'https://checkout.razorpay.com/v1/checkout.js'

let _loading = null

export function loadRazorpay() {
  if (typeof window !== 'undefined' && window.Razorpay) {
    return Promise.resolve(true)
  }
  if (_loading) return _loading
  _loading = new Promise((resolve) => {
    const tag = document.createElement('script')
    tag.src = SRC
    tag.async = true
    tag.onload = () => resolve(true)
    tag.onerror = () => { _loading = null; resolve(false) }
    document.body.appendChild(tag)
  })
  return _loading
}
