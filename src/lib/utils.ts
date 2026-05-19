import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  // Tailwind classes ko conditionally join karke conflicts merge karta hai.
  return twMerge(clsx(inputs))
}
