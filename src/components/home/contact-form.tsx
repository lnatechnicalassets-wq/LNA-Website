"use client";

import React, { useState, useTransition, useId } from "react";
import {
  Mail,
  User,
  Phone,
  Tag,
  MessageSquare,
  Send,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { ContactCategoryOption } from "@/lib/content";
import { submitContactInquiry } from "@/server/actions/contact";
import { type ContactFormState } from "@/lib/contact-types";
import { cn } from "@/lib/utils";

interface ContactFormProps {
  categories: ContactCategoryOption[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  formRef?: React.RefObject<HTMLFormElement | null>;
}

export function ContactForm({
  categories,
  selectedCategory,
  onCategoryChange,
  formRef: externalFormRef,
}: ContactFormProps) {
  const [isPending, startTransition] = useTransition();
  const [formState, setFormState] = useState<ContactFormState | null>(null);

  // Form input states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");

  const localFormRef = React.useRef<HTMLFormElement>(null);
  const formRef = externalFormRef || localFormRef;

  const nameId = useId();
  const emailId = useId();
  const phoneId = useId();
  const categoryId = useId();
  const messageId = useId();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("category", selectedCategory);

    startTransition(async () => {
      const result = await submitContactInquiry({ success: false }, formData);
      setFormState(result);

      if (result.success) {
        // Clear message upon successful transmission, keep contact coordinates for convenience
        setMessage("");
      }
    });
  };

  return (
    <div className="w-full bg-white rounded-3xl border border-teal-100/90 shadow-[0_20px_50px_-15px_rgba(8,100,119,0.12)] p-6 sm:p-8 lg:p-9 relative">
      {/* Header Inside Card */}
      <div className="flex items-center gap-3 pb-6 border-b border-teal-100/70 mb-6">
        <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200/60 flex items-center justify-center text-primary-700 shrink-0">
          <Mail className="w-5 h-5" aria-hidden="true" />
        </div>
        <div>
          <h3 className="text-xl sm:text-2xl font-serif font-bold text-text-primary tracking-tight">
            Send Us a Message
          </h3>
          <p className="text-xs sm:text-sm text-text-secondary mt-0.5">
            Fill out the details below and our team will get back to you promptly.
          </p>
        </div>
      </div>

      {/* Success Banner */}
      {formState?.success && (
        <div
          role="status"
          className="mb-6 p-4 rounded-xl bg-teal-50/90 border border-teal-200 text-primary-900 flex items-start gap-3 animate-in fade-in"
        >
          <CheckCircle2 className="w-5 h-5 text-primary-700 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="text-sm">
            <p className="font-semibold text-primary-950">Message Sent Successfully</p>
            <p className="text-primary-800 text-xs sm:text-sm mt-0.5">{formState.message}</p>
          </div>
        </div>
      )}

      {/* General Error Banner */}
      {formState && !formState.success && formState.error && (
        <div
          role="alert"
          className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 flex items-start gap-3 animate-in fade-in"
        >
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="text-sm">
            <p className="font-semibold text-red-950">Notice</p>
            <p className="text-red-800 text-xs sm:text-sm mt-0.5">{formState.error}</p>
          </div>
        </div>
      )}

      {/* Contact Form */}
      <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-4 sm:space-y-5">
        {/* Anti-spam Honeypot (hidden from screen readers & visual users) */}
        <div className="hidden" aria-hidden="true">
          <label htmlFor="website_hp">Leave this field blank</label>
          <input type="text" id="website_hp" name="website_hp" tabIndex={-1} autoComplete="off" />
        </div>

        {/* Row 1: Full Name & Email Address */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
          {/* Full Name */}
          <div className="space-y-1.5">
            <label
              htmlFor={nameId}
              className="block text-xs sm:text-sm font-semibold text-text-primary"
            >
              Full Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-teal-600">
                <User className="w-4 h-4" aria-hidden="true" />
              </div>
              <input
                id={nameId}
                name="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                aria-invalid={formState?.fieldErrors?.name ? "true" : undefined}
                aria-describedby={formState?.fieldErrors?.name ? `${nameId}-error` : undefined}
                className={cn(
                  "w-full pl-10 pr-3.5 py-2.5 rounded-xl border text-sm text-text-primary placeholder:text-text-muted bg-white transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2",
                  formState?.fieldErrors?.name
                    ? "border-red-400 focus-visible:outline-red-500 bg-red-50/20"
                    : "border-teal-100 hover:border-teal-300 focus-visible:outline-primary-600 focus-visible:border-primary-600"
                )}
              />
            </div>
            {formState?.fieldErrors?.name && (
              <p id={`${nameId}-error`} className="text-xs text-red-600 mt-1" role="alert">
                {formState.fieldErrors.name}
              </p>
            )}
          </div>

          {/* Email Address */}
          <div className="space-y-1.5">
            <label
              htmlFor={emailId}
              className="block text-xs sm:text-sm font-semibold text-text-primary"
            >
              Email Address <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-teal-600">
                <Mail className="w-4 h-4" aria-hidden="true" />
              </div>
              <input
                id={emailId}
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                aria-invalid={formState?.fieldErrors?.email ? "true" : undefined}
                aria-describedby={formState?.fieldErrors?.email ? `${emailId}-error` : undefined}
                className={cn(
                  "w-full pl-10 pr-3.5 py-2.5 rounded-xl border text-sm text-text-primary placeholder:text-text-muted bg-white transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2",
                  formState?.fieldErrors?.email
                    ? "border-red-400 focus-visible:outline-red-500 bg-red-50/20"
                    : "border-teal-100 hover:border-teal-300 focus-visible:outline-primary-600 focus-visible:border-primary-600"
                )}
              />
            </div>
            {formState?.fieldErrors?.email && (
              <p id={`${emailId}-error`} className="text-xs text-red-600 mt-1" role="alert">
                {formState.fieldErrors.email}
              </p>
            )}
          </div>
        </div>

        {/* Row 2: Phone Number (Optional) */}
        <div className="space-y-1.5">
          <label
            htmlFor={phoneId}
            className="block text-xs sm:text-sm font-semibold text-text-primary"
          >
            Phone Number <span className="text-text-muted font-normal text-xs">(optional)</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-teal-600">
              <Phone className="w-4 h-4" aria-hidden="true" />
            </div>
            <input
              id={phoneId}
              name="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Enter your phone number (e.g. +880 1700 000000)"
              aria-invalid={formState?.fieldErrors?.phone ? "true" : undefined}
              aria-describedby={formState?.fieldErrors?.phone ? `${phoneId}-error` : undefined}
              className={cn(
                "w-full pl-10 pr-3.5 py-2.5 rounded-xl border text-sm text-text-primary placeholder:text-text-muted bg-white transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2",
                formState?.fieldErrors?.phone
                  ? "border-red-400 focus-visible:outline-red-500 bg-red-50/20"
                  : "border-teal-100 hover:border-teal-300 focus-visible:outline-primary-600 focus-visible:border-primary-600"
              )}
            />
          </div>
          {formState?.fieldErrors?.phone && (
            <p id={`${phoneId}-error`} className="text-xs text-red-600 mt-1" role="alert">
              {formState.fieldErrors.phone}
            </p>
          )}
        </div>

        {/* Row 3: Subject / Inquiry Category */}
        <div className="space-y-1.5">
          <label
            htmlFor={categoryId}
            className="block text-xs sm:text-sm font-semibold text-text-primary"
          >
            Subject / Inquiry Category <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-teal-600">
              <Tag className="w-4 h-4" aria-hidden="true" />
            </div>
            <select
              id={categoryId}
              name="category"
              required
              value={selectedCategory}
              onChange={(e) => onCategoryChange(e.target.value)}
              aria-invalid={formState?.fieldErrors?.category ? "true" : undefined}
              aria-describedby={
                formState?.fieldErrors?.category ? `${categoryId}-error` : undefined
              }
              className={cn(
                "w-full pl-10 pr-9 py-2.5 rounded-xl border text-sm text-text-primary bg-white appearance-none transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2",
                formState?.fieldErrors?.category
                  ? "border-red-400 focus-visible:outline-red-500 bg-red-50/20"
                  : "border-teal-100 hover:border-teal-300 focus-visible:outline-primary-600 focus-visible:border-primary-600"
              )}
            >
              <option value="" disabled>
                Select a subject or inquiry category
              </option>
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
            {/* Custom select chevron */}
            <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-text-secondary">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>
          {formState?.fieldErrors?.category && (
            <p id={`${categoryId}-error`} className="text-xs text-red-600 mt-1" role="alert">
              {formState.fieldErrors.category}
            </p>
          )}
        </div>

        {/* Row 4: Message */}
        <div className="space-y-1.5">
          <label
            htmlFor={messageId}
            className="block text-xs sm:text-sm font-semibold text-text-primary"
          >
            Message <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute top-3 left-3.5 pointer-events-none text-teal-600">
              <MessageSquare className="w-4 h-4" aria-hidden="true" />
            </div>
            <textarea
              id={messageId}
              name="message"
              required
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write your message here..."
              aria-invalid={formState?.fieldErrors?.message ? "true" : undefined}
              aria-describedby={formState?.fieldErrors?.message ? `${messageId}-error` : undefined}
              className={cn(
                "w-full pl-10 pr-3.5 py-2.5 rounded-xl border text-sm text-text-primary placeholder:text-text-muted bg-white transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 resize-y min-h-[100px]",
                formState?.fieldErrors?.message
                  ? "border-red-400 focus-visible:outline-red-500 bg-red-50/20"
                  : "border-teal-100 hover:border-teal-300 focus-visible:outline-primary-600 focus-visible:border-primary-600"
              )}
            />
          </div>
          {formState?.fieldErrors?.message && (
            <p id={`${messageId}-error`} className="text-xs text-red-600 mt-1" role="alert">
              {formState.fieldErrors.message}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isPending}
            aria-busy={isPending ? "true" : undefined}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-xl bg-primary-800 hover:bg-primary-700 active:bg-primary-900 text-white font-medium text-sm sm:text-base shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-primary-600 focus-visible:outline-offset-2 min-h-[48px]"
          >
            {isPending ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Sending Message...</span>
              </>
            ) : (
              <>
                <span>Send Message</span>
                <Send className="w-4 h-4 -rotate-12 translate-x-0.5" aria-hidden="true" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
