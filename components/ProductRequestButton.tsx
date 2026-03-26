'use client'

import { useState, useTransition } from 'react'
import { submitProductRequest } from '@/app/dashboard/actions'

export default function ProductRequestButton() {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ product_name: '', brand_name: '', reason: '' })
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleClose() {
    setOpen(false)
    setForm({ product_name: '', brand_name: '', reason: '' })
    setFeedback(null)
  }

  function handleSubmit() {
    if (!form.product_name || !form.brand_name) return
    startTransition(async () => {
      const result = await submitProductRequest(form)
      if (result.error) {
        setFeedback({ type: 'error', msg: result.error })
      } else {
        setFeedback({ type: 'success', msg: 'Request submitted! We will review it soon.' })
        setForm({ product_name: '', brand_name: '', reason: '' })
        setTimeout(() => handleClose(), 2000)
      }
    })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="font-dm-sans text-sm font-semibold border-2 border-dashed border-brand-pink/40 text-brand-pink hover:border-brand-pink hover:bg-brand-pink/5 px-4 py-1.5 rounded-xl transition"
      >
        + Request a product
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />
          <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-playfair text-2xl text-brand-black">Request a Product</h2>
              <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 p-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-dm-sans text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Product name *</label>
                <input
                  type="text"
                  placeholder="e.g. Vitamin C Serum"
                  value={form.product_name}
                  onChange={(e) => setForm((f) => ({ ...f, product_name: e.target.value }))}
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="block font-dm-sans text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Brand name *</label>
                <input
                  type="text"
                  placeholder="e.g. The Ordinary"
                  value={form.brand_name}
                  onChange={(e) => setForm((f) => ({ ...f, brand_name: e.target.value }))}
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="block font-dm-sans text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Why do you think it converts?</label>
                <textarea
                  rows={3}
                  placeholder="Tell us why this product would perform well on your TikTok..."
                  value={form.reason}
                  onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                  className="input-field w-full resize-none"
                />
              </div>
            </div>

            {feedback && (
              <p className={`mt-3 text-sm font-dm-sans px-3 py-2 rounded-lg ${feedback.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'}`}>
                {feedback.msg}
              </p>
            )}

            <div className="flex gap-3 mt-5">
              <button
                onClick={handleClose}
                className="flex-1 font-dm-sans text-sm font-medium text-gray-500 border border-gray-200 px-4 py-2.5 rounded-xl hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                disabled={isPending || !form.product_name || !form.brand_name}
                onClick={handleSubmit}
                className="flex-1 font-dm-sans text-sm font-semibold bg-brand-green text-white px-4 py-2.5 rounded-xl hover:bg-brand-green/90 transition disabled:opacity-50"
              >
                {isPending ? 'Sending...' : 'Submit request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
