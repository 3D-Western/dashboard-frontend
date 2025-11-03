'use client'

import * as React from "react"
import { cn } from "@/lib/utils"
import { Search } from "lucide-react"

interface SearchBarProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onIconClick?: () => void
}

export function SearchBar({ className, onIconClick, ...props }: SearchBarProps) {
  // handle when user presses Enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && onIconClick) {
      onIconClick()
    }
    // optional: pass the event to any external onKeyDown prop too
    if (props.onKeyDown) props.onKeyDown(e)
  }

  return (
    <div
      className={cn(
        "flex items-center w-full rounded-md border border-input bg-white px-4 py-2",
        className
      )}
    >
      <button
        type="button"
        onClick={onIconClick}
        className="mr-3 text-gray-500 hover:text-gray-700 focus:outline-none cursor-pointer"
      >
        <Search className="w-5 h-5" />
      </button>

      <input
        type="search"
        placeholder="Search"
        onKeyDown={handleKeyDown}
        className="w-full bg-transparent text-black placeholder:text-muted-foreground focus:outline-none"
        {...props}
      />
    </div>
  )
}
