/**
 * Screen Accessibility Engine & Context Generator ("Los Ojos y Las Manos")
 * Reads screen structure, coordinates, buttons, input fields, and simulates
 * physical touch interactions, typing, and scrolling without recording screen video.
 */

export interface InteractiveElement {
  id: string;
  tag: string;
  text: string;
  type?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isClickable: boolean;
  isInput: boolean;
  isEmpty?: boolean;
}

export interface ScreenContextSnapshot {
  appName: string;
  screenTitle: string;
  totalButtons: number;
  totalInputs: number;
  activeInput?: string;
  elements: InteractiveElement[];
  summaryText: string;
  timestamp: number;
  hasChangedFromPrevious: boolean;
}

export class ScreenAccessibilityEngine {
  private static lastSummaryHash = '';

  /**
   * "LOS OJOS" — Reads active screen structure without capturing images.
   * Extracts text, clickable buttons, coordinates, and input fields.
   */
  public static extractScreenContext(): ScreenContextSnapshot {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return {
        appName: 'Meteory IA',
        screenTitle: 'Escritorio',
        totalButtons: 0,
        totalInputs: 0,
        elements: [],
        summaryText: 'Pantalla inactiva',
        timestamp: Date.now(),
        hasChangedFromPrevious: false,
      };
    }

    const appName = document.title || 'Meteory IA';
    const activeHeader = document.querySelector('h1, h2, h3, header')?.textContent?.trim() || 'Principal';

    // Scan interactive elements
    const rawElements = Array.from(
      document.querySelectorAll('button, a, input, textarea, [role="button"]')
    );

    const elements: InteractiveElement[] = [];
    let buttonCount = 0;
    let inputCount = 0;
    let activeInputDesc: string | undefined;

    rawElements.forEach((el, index) => {
      const rect = el.getBoundingClientRect();
      // Skip invisible elements outside viewport
      if (rect.width === 0 || rect.height === 0 || rect.bottom < 0 || rect.top > window.innerHeight) {
        return;
      }

      const tagName = el.tagName.toLowerCase();
      const text = el.textContent?.trim().replace(/\s+/g, ' ') || (el as HTMLInputElement).placeholder || '';
      const isInput = tagName === 'input' || tagName === 'textarea';
      const isClickable = tagName === 'button' || tagName === 'a' || el.getAttribute('role') === 'button';

      if (isInput) inputCount++;
      if (isClickable) buttonCount++;

      if (document.activeElement === el) {
        activeInputDesc = text || 'Campo activo';
      }

      elements.push({
        id: `el-${index}`,
        tag: tagName,
        text: text.slice(0, 45),
        type: (el as HTMLInputElement).type,
        x: Math.round(rect.left + rect.width / 2),
        y: Math.round(rect.top + rect.height / 2),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        isClickable,
        isInput,
        isEmpty: isInput ? !(el as HTMLInputElement).value : undefined,
      });
    });

    const summaryParts = [
      `App activa: ${appName}`,
      `Pantalla: ${activeHeader}`,
      `Botones detectados: ${buttonCount}`,
      `Campos de entrada: ${inputCount}`,
    ];

    if (activeInputDesc) {
      summaryParts.push(`Campo de texto enfocado: "${activeInputDesc}"`);
    }

    // Top visible buttons
    const topButtons = elements
      .filter((e) => e.isClickable && e.text.length > 0)
      .slice(0, 6)
      .map((e) => `"${e.text}" en (${e.x},${e.y})`);

    if (topButtons.length > 0) {
      summaryParts.push(`Botones visibles: ${topButtons.join(', ')}`);
    }

    const summaryText = summaryParts.join('. ') + '.';
    const currentHash = summaryText;
    const hasChanged = currentHash !== this.lastSummaryHash;
    this.lastSummaryHash = currentHash;

    return {
      appName,
      screenTitle: activeHeader,
      totalButtons: buttonCount,
      totalInputs: inputCount,
      activeInput: activeInputDesc,
      elements,
      summaryText,
      timestamp: Date.now(),
      hasChangedFromPrevious: hasChanged,
    };
  }

  /**
   * "LAS MANOS" — Injects simulated physical touch at given coordinates with visual ripple.
   */
  public static async clickAtCoordinates(x: number, y: number): Promise<boolean> {
    if (typeof document === 'undefined') return false;

    // Create tactical touch ripple indicator
    const ripple = document.createElement('div');
    ripple.className = 'fixed rounded-full pointer-events-none z-[999999] animate-ping';
    ripple.style.width = '36px';
    ripple.style.height = '36px';
    ripple.style.left = `${x - 18}px`;
    ripple.style.top = `${y - 18}px`;
    ripple.style.backgroundColor = 'rgba(0, 229, 255, 0.6)';
    ripple.style.border = '2px solid #00e5ff';
    ripple.style.boxShadow = '0 0 20px #00e5ff';
    document.body.appendChild(ripple);

    setTimeout(() => {
      if (document.body.contains(ripple)) document.body.removeChild(ripple);
    }, 700);

    const target = document.elementFromPoint(x, y);
    if (!target) return false;

    const clickEvent = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
    });

    target.dispatchEvent(clickEvent);
    if (typeof (target as HTMLElement).focus === 'function') {
      (target as HTMLElement).focus();
    }
    return true;
  }

  /**
   * "LAS MANOS" — Types text into the currently active or closest input field.
   */
  public static async typeTextIntoActiveField(text: string): Promise<boolean> {
    if (typeof document === 'undefined') return false;

    let target = document.activeElement as HTMLInputElement | HTMLTextAreaElement;

    // If no active input, search for first visible input
    if (!target || (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA')) {
      const firstInput = document.querySelector('input:not([type="hidden"]), textarea') as
        | HTMLInputElement
        | HTMLTextAreaElement
        | null;
      if (firstInput) {
        target = firstInput;
        target.focus();
      } else {
        return false;
      }
    }

    // Type character by character with human typing cadence
    for (let i = 0; i < text.length; i++) {
      target.value += text[i];
      target.dispatchEvent(new Event('input', { bubbles: true }));
      target.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 25));
    }

    return true;
  }

  /**
   * "LAS MANOS" — Smooth scrolls window up or down (300ms duration).
   */
  public static smoothScroll(direction: 'up' | 'down', distance: number = 320): void {
    if (typeof window === 'undefined') return;
    const delta = direction === 'down' ? distance : -distance;
    window.scrollBy({
      top: delta,
      behavior: 'smooth',
    });
  }
}
