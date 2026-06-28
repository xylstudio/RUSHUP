"use client"

import React from 'react'

export type Step = {
  key: string
  title: string
  done?: boolean
  current?: boolean
}

export default function Stepper({ steps }: { steps: Step[] }) {
  return (
    <nav aria-label="Progress" className="mb-4 md:mb-6">
      <ol role="list" className="flex items-center gap-2 md:gap-4">
        {steps.map((step, idx) => (
          <li key={step.key} className="flex items-center">
            <div className={`flex items-center gap-2 ${step.current ? 'text-xylem-dark' : step.done ? 'text-xylem-medium' : 'text-gray-700'}`}>
              <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold border ${step.current ? 'bg-xylem-bg border-xylem-dark' : step.done ? 'bg-xylem-bg border-xylem-medium' : 'bg-gray-200 border-gray-400'}`}>
                {idx + 1}
              </span>
              <span className="hidden sm:inline text-xs md:text-sm font-medium">{step.title}</span>
            </div>
            {idx < steps.length - 1 && (
              <svg className="mx-2 h-4 w-4 text-gray-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z" />
              </svg>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )}
