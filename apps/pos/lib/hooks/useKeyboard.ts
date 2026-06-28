import { useEffect, useCallback } from 'react';

type KeyHandler = (event: KeyboardEvent) => void;

interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  handler: KeyHandler;
  preventDefault?: boolean;
}

export function useKeyboard(shortcuts: KeyboardShortcut[]) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    for (const shortcut of shortcuts) {
      if (!event.key || !shortcut.key) continue;
      const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
      const ctrlMatch = shortcut.ctrl ? event.ctrlKey : !event.ctrlKey;
      const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
      const altMatch = shortcut.alt ? event.altKey : !event.altKey;
      const metaMatch = shortcut.meta ? event.metaKey : !event.metaKey;

      if (keyMatch && ctrlMatch && shiftMatch && altMatch && metaMatch) {
        if (shortcut.preventDefault !== false) {
          event.preventDefault();
        }
        shortcut.handler(event);
        break;
      }
    }
  }, [shortcuts]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
}

// Common keyboard shortcuts for forms
export const FORM_SHORTCUTS = {
  SAVE: { key: 's', ctrl: true, preventDefault: true },
  SUBMIT: { key: 'Enter', ctrl: true, preventDefault: true },
  CANCEL: { key: 'Escape', preventDefault: true },
  NEXT_FIELD: { key: 'Tab', preventDefault: false },
  PREV_FIELD: { key: 'Tab', shift: true, preventDefault: false },
};

// Hook for form keyboard shortcuts
export function useFormKeyboard(
  onSave?: () => void,
  onSubmit?: () => void,
  onCancel?: () => void
) {
  const shortcuts: KeyboardShortcut[] = [];

  if (onSave) {
    shortcuts.push({
      ...FORM_SHORTCUTS.SAVE,
      handler: () => onSave(),
    });
  }

  if (onSubmit) {
    shortcuts.push({
      ...FORM_SHORTCUTS.SUBMIT,
      handler: () => onSubmit(),
    });
  }

  if (onCancel) {
    shortcuts.push({
      ...FORM_SHORTCUTS.CANCEL,
      handler: () => onCancel(),
    });
  }

  useKeyboard(shortcuts);
}

// Hook for focus management
export function useFocusManagement() {
  const focusFirstInput = useCallback(() => {
    const firstInput = document.querySelector('input, textarea, select, button[tabindex="0"]') as HTMLElement;
    if (firstInput) {
      firstInput.focus();
    }
  }, []);

  const focusNextInput = useCallback(() => {
    const inputs = Array.from(document.querySelectorAll('input, textarea, select, button[tabindex="0"]')) as HTMLElement[];
    const currentIndex = inputs.findIndex(input => input === document.activeElement);
    const nextIndex = (currentIndex + 1) % inputs.length;
    inputs[nextIndex]?.focus();
  }, []);

  const focusPrevInput = useCallback(() => {
    const inputs = Array.from(document.querySelectorAll('input, textarea, select, button[tabindex="0"]')) as HTMLElement[];
    const currentIndex = inputs.findIndex(input => input === document.activeElement);
    const prevIndex = currentIndex <= 0 ? inputs.length - 1 : currentIndex - 1;
    inputs[prevIndex]?.focus();
  }, []);

  return {
    focusFirstInput,
    focusNextInput,
    focusPrevInput,
  };
}

// Hook for screen reader announcements
export function useScreenReader() {
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }, []);

  return { announce };
} 