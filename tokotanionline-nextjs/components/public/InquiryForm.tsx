/**
 * STEP P2B-1: Public Inquiry Form Component
 * 
 * Simple, context-aware inquiry form
 * - No global spinner
 * - Disable button on submit
 * - Success message static
 * - No redirect
 * - No complex state
 */

'use client';

import { useState } from 'react';

export type InquiryContext = 'HOME' | 'PRODUCT' | 'BLOG' | 'OTHER';

interface InquiryFormProps {
  context: InquiryContext;
  contextId?: string;
  className?: string;
  title?: string;
  subtitle?: string;
}

export default function InquiryForm({
  context,
  contextId,
  className = '',
  title = 'Ada Pertanyaan?',
  subtitle = 'Kirim pesan dan kami akan menghubungi Anda',
}: InquiryFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    message: '',
    _honeypot: '', // Honeypot field (hidden)
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Honeypot check (client-side)
    if (formData._honeypot.trim().length > 0) {
      // Bot detected - silently fail
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');

    try {
      const response = await fetch('/api/public/inquiry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          contact: formData.contact,
          message: formData.message,
          context,
          contextId: contextId || undefined,
        }),
      });

      if (response.status === 429) {
        setSubmitStatus('error');
        setErrorMessage('Terlalu banyak permintaan. Silakan coba lagi nanti.');
        return;
      }

      if (response.status === 400) {
        const data = await response.json();
        setSubmitStatus('error');
        setErrorMessage(data.errors?.join(', ') || 'Data tidak valid. Silakan periksa kembali.');
        return;
      }

      if (response.ok) {
        setSubmitStatus('success');
        // Reset form
        setFormData({
          name: '',
          contact: '',
          message: '',
          _honeypot: '',
        });
      } else {
        setSubmitStatus('error');
        setErrorMessage('Terjadi kesalahan. Silakan coba lagi.');
      }
    } catch (error) {
      setSubmitStatus('error');
      setErrorMessage('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-1">{title}</h3>
        {subtitle && (
          <p className="text-sm text-gray-600">{subtitle}</p>
        )}
      </div>

      {submitStatus === 'success' && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800">
            ✅ Pesan berhasil dikirim! Kami akan menghubungi Anda segera.
          </p>
        </div>
      )}

      {submitStatus === 'error' && errorMessage && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{errorMessage}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Honeypot field (hidden) */}
        <input
          type="text"
          name="_honeypot"
          value={formData._honeypot}
          onChange={handleChange}
          className="hidden"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
        />

        {/* Name */}
        <div>
          <label htmlFor="inquiry-name" className="block text-sm font-medium text-gray-700 mb-1">
            Nama <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="inquiry-name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            maxLength={200}
            disabled={isSubmitting}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            placeholder="Nama lengkap"
          />
        </div>

        {/* Contact */}
        <div>
          <label htmlFor="inquiry-contact" className="block text-sm font-medium text-gray-700 mb-1">
            Kontak (WhatsApp / Email) <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="inquiry-contact"
            name="contact"
            value={formData.contact}
            onChange={handleChange}
            required
            maxLength={200}
            disabled={isSubmitting}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            placeholder="08xx-xxxx-xxxx atau email@example.com"
          />
        </div>

        {/* Message */}
        <div>
          <label htmlFor="inquiry-message" className="block text-sm font-medium text-gray-700 mb-1">
            Pesan <span className="text-red-500">*</span>
          </label>
          <textarea
            id="inquiry-message"
            name="message"
            value={formData.message}
            onChange={handleChange}
            required
            maxLength={2000}
            rows={4}
            disabled={isSubmitting}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed resize-none"
            placeholder="Tulis pesan Anda di sini..."
          />
          <p className="mt-1 text-xs text-gray-500">
            {formData.message.length} / 2000 karakter
          </p>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-green-600 text-white py-2 px-4 rounded-md font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Mengirim...' : 'Kirim Pesan'}
        </button>
      </form>
    </div>
  );
}
