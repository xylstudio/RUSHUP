/**
 * Optimized Image Component
 * Wrapper around Next.js Image with loading states and error handling
 */

'use client'

import { useState } from 'react'
import Image from 'next/image'
import type { ImageProps } from 'next/image'

interface OptimizedImageProps extends Omit<ImageProps, 'onLoad' | 'onError'> {
  fallbackSrc?: string
  showLoader?: boolean
}

export default function OptimizedImage({
  src,
  alt,
  fallbackSrc = '/images/placeholder.png',
  showLoader = true,
  className = '',
  ...props
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [imageSrc, setImageSrc] = useState(src)

  const handleLoad = () => {
    setIsLoading(false)
  }

  const handleError = () => {
    setIsLoading(false)
    setHasError(true)
    if (fallbackSrc) {
      setImageSrc(fallbackSrc)
    }
  }

  return (
    <div className="relative">
      {showLoader && isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-green-600" />
        </div>
      )}
      
      <Image
        {...props}
        src={imageSrc}
        alt={alt}
        className={`transition-opacity duration-300 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        } ${className}`}
        onLoad={handleLoad}
        onError={handleError}
        loading={props.priority ? undefined : 'lazy'}
        placeholder={props.blurDataURL ? 'blur' : 'empty'}
      />

      {hasError && !fallbackSrc && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <span className="text-sm text-gray-500">Failed to load image</span>
        </div>
      )}
    </div>
  )
}

/**
 * Avatar component with optimized loading
 */
interface AvatarProps {
  src?: string | null
  alt: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  fallback?: string
}

export function Avatar({ src, alt, size = 'md', fallback }: AvatarProps) {
  const sizes = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
    xl: 'h-24 w-24',
  }

  const dimensions = {
    sm: 32,
    md: 48,
    lg: 64,
    xl: 96,
  }

  if (!src) {
    return (
      <div className={`${sizes[size]} flex items-center justify-center rounded-full bg-gray-200`}>
        <span className="text-sm font-medium text-gray-600">
          {fallback || alt.charAt(0).toUpperCase()}
        </span>
      </div>
    )
  }

  return (
    <div className={`${sizes[size]} relative overflow-hidden rounded-full`}>
      <OptimizedImage
        src={src}
        alt={alt}
        width={dimensions[size]}
        height={dimensions[size]}
        className="object-cover"
      />
    </div>
  )
}
