import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 安全複製文字到剪貼簿。在非 HTTPS 或 clipboard 不可用時會使用 fallback。
 * @returns 是否複製成功
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator === "undefined") return false;
  try {
    if (navigator.clipboard != null && typeof navigator.clipboard.writeText === "function") {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}
