import { Page, Locator } from '@playwright/test';

export class VideoHelper {
  private page: Page;
  public currentX = 0;
  public currentY = 0;
  private A: number | null = null;
  private B: number | null = null;
  private C: number | null = null;
  private D: number | null = null;

  constructor(page: Page) {
    this.page = page;
  }

  async initCursor() {
    await this.page.addInitScript(() => {
      // Expose the helper to the window so we can call it from the test
      (window as unknown as Window & { installMouseHelper: () => void }).installMouseHelper = () => {
        if (document.getElementById('mouse-helper')) return;

        const box = document.createElement('div');

        box.id = 'mouse-helper';
        box.classList.add('mouse-helper');
        
        const styleElement = document.createElement('style');
        styleElement.innerHTML = `
          .mouse-helper {
            pointer-events: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 30px;
            height: 30px;
            background: rgba(255, 0, 0, 0.4);
            border: 2px solid white;
            border-radius: 50%;
            margin-left: -15px;
            margin-top: -15px;
            transition: background .1s, transform .1s;
            z-index: 2147483647;
            box-shadow: 0 0 4px rgba(0,0,0,0.5);
          }
          .mouse-helper::after {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            width: 100%;
            height: 100%;
            background: transparent;
            border: 2px solid rgba(255, 50, 50, 0.8);
            border-radius: 50%;
            transform: translate(-50%, -50%) scale(1);
            opacity: 0;
            transition: none;
          }
          .mouse-helper.button-pressed {
            background: rgba(255, 0, 0, 0.8);
            transform: scale(0.9);
            border-color: yellow;
          }
          .mouse-helper.button-pressed::after {
            animation: ripple 0.4s ease-out;
          }
          @keyframes ripple {
            0% {
              transform: translate(-50%, -50%) scale(1);
              opacity: 1;
              border-width: 4px;
            }
            100% {
              transform: translate(-50%, -50%) scale(2.5);
              opacity: 0;
              border-width: 0px;
            }
          }
        `;
        document.head.appendChild(styleElement);
        document.body.appendChild(box);

        // Listen for real mouse events to update position (fallback/sync)
        document.addEventListener('mousemove', event => {
          box.style.left = event.clientX + 'px';
          box.style.top = event.clientY + 'px';
        }, true);

        document.addEventListener('mousedown', () => {
          box.classList.add('button-pressed');
        }, true);

        document.addEventListener('mouseup', () => {
          setTimeout(() => {
            box.classList.remove('button-pressed');
          }, 300);
        }, true);
      };

      // Define the smooth move function on window
      (window as unknown as Window & { simulateCursorMove: (startX: number, startY: number, endX: number, endY: number, duration: number) => Promise<void> }).simulateCursorMove = (startX: number, startY: number, endX: number, endY: number, duration: number) => {
          return new Promise<void>((resolve) => {
              const box = document.getElementById('mouse-helper');
              const startTime = performance.now();

              const step = (currentTime: number) => {
                  // Fetch canvas INSIDE loop to handle recreation/DOM changes
                  const canvas = document.getElementById('schematic-canvas'); 
                  
                  const elapsed = currentTime - startTime;
                  const progress = Math.min(elapsed / duration, 1);
                  const t = progress; 

                  const curX = startX + (endX - startX) * t;
                  const curY = startY + (endY - startY) * t;

                  // 1. Update Visuals
                  if (box) {
                      box.style.left = curX + 'px';
                      box.style.top = curY + 'px';
                  }

                  // 2. Dispatch Event
                  // Ensure we are dispatching to the correct element
                  if (canvas) {
                       canvas.dispatchEvent(new PointerEvent('pointermove', {
                          bubbles: true,
                          cancelable: true,
                          view: window,
                          clientX: curX,
                          clientY: curY,
                          pointerId: 1, // Mimic primary mouse
                          pointerType: 'mouse', // Critical for app to recognize it
                          isPrimary: true,
                          button: 0, // Try button 0 (main button) in case state expects it? 
                          buttons: 0, // No buttons pressed during hover/move
                          pressure: 0
                      }));
                  }

                  if (progress < 1) {
                      requestAnimationFrame(step);
                  } else {
                      resolve();
                  }
              };
              requestAnimationFrame(step);
          });
      };

      if (document.body) {
        (window as unknown as Window & { installMouseHelper: () => void }).installMouseHelper();
      } else {
        document.addEventListener('DOMContentLoaded', (window as unknown as Window & { installMouseHelper: () => void }).installMouseHelper);
      }
      
      setInterval(() => {
          if (document.body && !document.getElementById('mouse-helper')) {
              (window as unknown as Window & { installMouseHelper: () => void }).installMouseHelper();
          }
      }, 500);
    });
  }

  async initKeyboardDisplay() {
    await this.page.addInitScript(() => {
      (window as unknown as Window & { installKeyboardHelper: () => void }).installKeyboardHelper = () => {
        if (document.getElementById('keyboard-helper-container')) return;

        const container = document.createElement('div');
        container.id = 'keyboard-helper-container';
        container.style.position = 'absolute';
        container.style.top = '20px';
        container.style.right = '20px';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.alignItems = 'flex-end';
        container.style.gap = '10px';
        container.style.zIndex = '2147483647';
        container.style.pointerEvents = 'none';
        
        const styleElement = document.createElement('style');
        styleElement.innerHTML = `
          .key-press-badge {
            font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            font-size: 20px;
            font-weight: 600;
            padding: 12px 24px;
            border-radius: 8px;
            animation: popIn 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards, fadeOut 0.3s ease-in 1.2s forwards;
            white-space: nowrap;
            /* Default to light theme style (dark badge) */
            background: rgba(30, 30, 30, 0.9);
            color: #fff;
            border: 1px solid rgba(255, 255, 255, 0.2);
            box-shadow: 0 8px 16px rgba(0,0,0,0.4);
          }
          html.dark .key-press-badge {
            background: rgba(255, 255, 255, 0.9);
            color: #111;
            border: 1px solid rgba(0, 0, 0, 0.2);
            box-shadow: 0 8px 16px rgba(0,0,0,0.4);
          }
          @keyframes popIn {
            0% { transform: translateX(20px) scale(0.8); opacity: 0; }
            100% { transform: translateX(0) scale(1); opacity: 1; }
          }
          @keyframes fadeOut {
            0% { opacity: 1; transform: translateX(0) scale(1); }
            100% { opacity: 0; transform: translateX(10px) scale(0.95); }
          }
        `;
        document.head.appendChild(styleElement);
        document.body.appendChild(container);

        const updatePosition = () => {
          const canvas = document.getElementById('schematic-canvas');
          if (canvas) {
            const rect = canvas.getBoundingClientRect();
            container.style.position = 'fixed';
            container.style.top = (rect.top + 20) + 'px';
            container.style.right = (window.innerWidth - rect.right + 20) + 'px';
          }
        };

        // Update initially and on window resize
        updatePosition();
        window.addEventListener('resize', updatePosition);
        // Also update periodically just in case the layout shifts
        setInterval(updatePosition, 500);

        document.addEventListener('keydown', (event) => {
          // Ignore modifier keys alone
          if (['Shift', 'Control', 'Alt', 'Meta'].includes(event.key)) return;
          
          let keyText = event.key;
          if (keyText === ' ') keyText = 'Space';
          if (keyText.length === 1) keyText = keyText.toUpperCase();

          const badge = document.createElement('div');
          badge.className = 'key-press-badge';
          
          // Show modifiers if present
          const modifiers = [];
          if (event.ctrlKey) modifiers.push('Ctrl');
          if (event.altKey) modifiers.push('Alt');
          if (event.shiftKey && keyText.length > 1) modifiers.push('Shift');
          if (event.metaKey) modifiers.push('⌘');
          
          badge.textContent = [...modifiers, keyText].join(' + ');
          
          container.appendChild(badge);
          
          // Remove after animation finishes (1.2s delay + 0.3s duration = 1.5s)
          setTimeout(() => {
            if (badge.parentNode) {
              badge.parentNode.removeChild(badge);
            }
          }, 1500);
        }, true);
      };

      if (document.body) {
        (window as unknown as Window & { installKeyboardHelper: () => void }).installKeyboardHelper();
      } else {
        document.addEventListener('DOMContentLoaded', (window as unknown as Window & { installKeyboardHelper: () => void }).installKeyboardHelper);
      }
      
      setInterval(() => {
          if (document.body && !document.getElementById('keyboard-helper-container')) {
              (window as unknown as Window & { installKeyboardHelper: () => void }).installKeyboardHelper();
          }
      }, 500);
    });
  }

  async smoothMoveTo(x: number, y: number, speed = 500) {
    const startX = this.currentX;
    const startY = this.currentY;
    const distance = Math.sqrt(Math.pow(x - startX, 2) + Math.pow(y - startY, 2));
    
    const duration = Math.max(100, (distance / speed) * 1000);

    // Run the animation in the browser
    await this.page.evaluate(async ({ startX, startY, endX, endY, duration }) => {
        await (window as unknown as Window & { simulateCursorMove: (sx: number, sy: number, ex: number, ey: number, d: number) => Promise<void> }).simulateCursorMove(startX, startY, endX, endY, duration);
    }, { startX, startY, endX: x, endY: y, duration });
    
    // Wait for the UI to update coordinates (debounce/render cycle)
    // This verifies the app actually received the events
    await this.page.waitForTimeout(10);

    // Sync Playwright's internal state instantly at the end
    await this.page.mouse.move(x, y);

    this.currentX = x;
    this.currentY = y;
  }

  async moveMouseSmoothlyToLocator(locator: Locator) {
    await locator.scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(100); // Slight pause after scrolling
    const box = await locator.boundingBox();
    if (box) {
      const x = box.x + box.width / 2;
      const y = box.y + box.height / 2;
      await this.smoothMoveTo(x, y);
      return { x, y };
    }
    return null;
  }

  // Infer the screen-to-schematic mapping dynamically by probing two points
  async readCoordsAt(px: number, py: number) {
      // Snap strictly to integer pixels to avoid off-by-half pixel interpolation inside Playwright
      const roundedX = Math.round(px);
      const roundedY = Math.round(py);
      await this.page.mouse.move(roundedX, roundedY);
      await this.page.waitForTimeout(50); 
      const text = await this.page.getByRole('button', { name: /X:/ }).textContent();
      const match = text?.match(/X:\s*([-\d.]+),\s*Y:\s*([-\d.]+)/);
      if (match && match[1] && match[2]) {
          return { schX: parseFloat(match[1]), schY: parseFloat(match[2]) };
      }
      throw new Error(`Could not read coordinates at ${roundedX}, ${roundedY}`);
  };

  async initMapping() {
      const canvas = this.page.locator('canvas').first();
      const box = await canvas.boundingBox();
      if (!box) {
         throw new Error("Could not find canvas bounding box");
      }
      
      const centerSX = box.x + box.width / 2;
      const centerSY = box.y + box.height / 2;

      // Make a large jump to negate fractional rounding grid-snap rounding errors
      const deltaScreen = 200;
      
      const p1 = await this.readCoordsAt(centerSX, centerSY);
      const p2 = await this.readCoordsAt(centerSX + deltaScreen, centerSY - deltaScreen); // Y axis visually goes up when decreasing pixels

      // sch = A * screen + C
      this.A = (p2.schX - p1.schX) / deltaScreen;
      this.B = (p2.schY - p1.schY) / -deltaScreen;

      this.C = p1.schX - this.A * centerSX;
      this.D = p1.schY - this.B * centerSY;
      
      console.log(`Initialized Mapping - A: ${this.A}, B: ${this.B}, C: ${this.C}, D: ${this.D}`);
  }

  async mapSchematicToScreen(targetSchX: number, targetSchY: number) {
      if (this.A === null || this.B === null || this.C === null || this.D === null) {
          throw new Error("Mapping not initialized. Call initMapping() first.");
      }

      const targetX = Math.round((targetSchX - this.C) / this.A);
      const targetY = Math.round((targetSchY - this.D) / this.B);
      
      return { x: targetX, y: targetY };
  }
}
