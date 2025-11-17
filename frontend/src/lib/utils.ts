import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const isDev = import.meta.env.DEV

export const logger = {
  log: (...args: unknown[]) => {
    if (isDev) {
      console.log("[LOG]", ...args)
    }
  },
  warn: (...args: unknown[]) => {
    if (isDev) {
      console.warn("[WARN]", ...args)
    }
  },
  error: (...args: unknown[]) => {
    if (isDev) {
      console.error("[ERROR]", ...args)
    }
  },
  info: (...args: unknown[]) => {
    if (isDev) {
      console.info("[INFO]", ...args)
    }
  },
  debug: (...args: unknown[]) => {
    if (isDev) {
      console.debug("[DEBUG]", ...args)
    }
  },
}

