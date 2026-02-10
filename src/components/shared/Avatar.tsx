import Image from 'next/image'
import { cn } from '@/lib/utils'

interface AvatarProps {
  src?: string | null
  alt: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeMap = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-16 w-16',
} as const

export function Avatar({ src, alt, size = 'md', className }: AvatarProps) {
  return (
    <div className={cn('relative overflow-hidden rounded-full bg-gray-200', sizeMap[size], className)}>
      {src ? (
        <Image src={src} alt={alt} fill className="object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-gray-500">
          {alt.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  )
}
