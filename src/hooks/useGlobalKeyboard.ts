import { useEffect } from 'react';

interface UseGlobalKeyboardOptions {
  onSearch?: () => void;
  onEscape?: () => void;
}

export function useGlobalKeyboard({ onSearch, onEscape }: UseGlobalKeyboardOptions) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Cmd/Ctrl+K → focus search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onSearch?.();
      }
      // Escape → close panels
      if (e.key === 'Escape') {
        onEscape?.();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onSearch, onEscape]);
}
