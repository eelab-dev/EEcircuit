import { Page, Locator } from '@playwright/test';

export class VideoHelper {
  private page: Page;
  public currentX = 0;
  public currentY = 0;

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

  async mapSchematicToScreen(targetSchX: number, targetSchY: number) {
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
      const A = (p2.schX - p1.schX) / deltaScreen;
      const B = (p2.schY - p1.schY) / -deltaScreen;

      const C = p1.schX - A * centerSX;
      const D = p1.schY - B * centerSY;

      let targetX = Math.round((targetSchX - C) / A);
      let targetY = Math.round((targetSchY - D) / B);
      
      // Verification Step
      const verify = await this.readCoordsAt(targetX, targetY);
      console.log(`Calculated Mapping - A: ${A}, B: ${B}, C: ${C}, D: ${D}`);
      console.log(`Targeting Screen X: ${targetX}, Y: ${targetY} -> Measured Coords X: ${verify.schX}, Y: ${verify.schY}`);
      
      if (verify.schX !== targetSchX || verify.schY !== targetSchY) {
          // If we slightly missed because of pixel snapping, we do a strictly bounded 3x3 search to find the closest pixel that guarantees the true readout
          console.log('Slight algebraic miss due to snapping, applying 3x3 pixel grid search fallback...');
          let fineFound = false;
          for (let py = targetY - 15; py <= targetY + 15 && !fineFound; py += 5) {
             for (let px = targetX - 15; px <= targetX + 15 && !fineFound; px += 5) {
                 const testCoords = await this.readCoordsAt(px, py);
                 if (testCoords.schX === targetSchX && testCoords.schY === targetSchY) {
                     targetX = px;
                     targetY = py;
                     fineFound = true;
                     console.log(`Found true exact coordinate at Screen X: ${targetX}, Y: ${targetY}`);
                     break;
                 }
             }
          }
          if (!fineFound) {
              throw new Error(`Calculated target is wrong! Expected ${targetSchX}, ${targetSchY} but got ${verify.schX}, ${verify.schY}.`);
          }
      }
      
      return { x: targetX, y: targetY };
  }
}
