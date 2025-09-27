"use client"

import React from 'react'

const CreateTokenButton = () => {
  return (
    <button className="flex items-center gap-2 bg-black text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2">
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
      </svg>
      Create a Token
    </button>
  )
}

export default CreateTokenButton
