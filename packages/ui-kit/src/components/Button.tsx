import React from 'react'
import clsx from 'clsx'

export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  onClick?: () => void
  children: React.ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  disabled,
  onClick,
  children,
}: ButtonProps) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={clsx(
        'va-btn',
        `va-btn--${variant}`,
        `va-btn--${size}`,
        disabled && 'va-btn--disabled'
      )}
    >
      {children}
    </button>
  )
}
