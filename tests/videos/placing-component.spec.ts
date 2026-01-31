import { test } from '@playwright/test';

test('record component placement', async ({ page }) => {
  test.setTimeout(30000);
  // Inject visual cursor and animation helper
  await page.addInitScript(() => {
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
                
                // Ease out slightly for natural feel, or linear? 
                // Linear is better for "robotic" precise tutorials, but ease-out is more human.
                // improved tracking with linear for now to match speed.
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

  // 1. Open the app with clean slate and dark mode
  await page.goto('http://localhost:5173/?theme=dark&clean=true');

  // 2. Wait for app readiness
  await page.waitForTimeout(2000); // Initial load wait
  await page.locator('#schematic-canvas').waitFor({ state: 'attached' });

  // Track mouse position for smooth interpolation
  let currentX = 0;
  let currentY = 0;

  const smoothMoveTo = async (x: number, y: number) => {
    const startX = currentX;
    const startY = currentY;
    const distance = Math.sqrt(Math.pow(x - startX, 2) + Math.pow(y - startY, 2));
    
    // Speed: ~500 pixels per second for clearer tracking visibility
    // distance / speed = time
    // e.g. 500px -> 1.0s
    const speed = 300; // Increased speed for better video flow, testing if throttling handles it 
    const duration = Math.max(100, (distance / speed) * 1000);

    // Run the animation in the browser
    await page.evaluate(async ({ startX, startY, endX, endY, duration }) => {
        await (window as unknown as Window & { simulateCursorMove: (sx: number, sy: number, ex: number, ey: number, d: number) => Promise<void> }).simulateCursorMove(startX, startY, endX, endY, duration);
    }, { startX, startY, endX: x, endY: y, duration });
    
    // Wait for the UI to update coordinates (debounce/render cycle)
    // This verifies the app actually received the events
    await page.waitForTimeout(50);
    // const coordsText = await page.getByRole('button', { name: /X:.*Y:/ }).textContent();
    // console.log(`Moved to (${x}, ${y}). App sees: ${coordsText}`);

    // Sync Playwright's internal state instantly at the end
    await page.mouse.move(x, y);

    currentX = x;
    currentY = y;
  };

  const moveMouseSmoothlyToLocator = async (locator: { boundingBox: () => Promise<{ x: number; y: number; width: number; height: number } | null> }) => {
    const box = await locator.boundingBox();
    if (box) {
      const x = box.x + box.width / 2;
      const y = box.y + box.height / 2;
      await smoothMoveTo(x, y);
      return { x, y };
    }
    return null;
  };

  // 3. Move to and click Add Component menu
  const addCompBtn = page.getByRole('button', { name: /Add Component/i });
  await moveMouseSmoothlyToLocator(addCompBtn);
  await addCompBtn.click();
  await page.waitForTimeout(800);

  // 4. Move to and click Resistor
  const resistorItem = page.getByText('resistor', { exact: true });
  await moveMouseSmoothlyToLocator(resistorItem);
  await resistorItem.click();
  await page.waitForTimeout(800);

  // 5. Move to canvas center and Place it
  const canvas = page.locator('canvas').first();
  const box = await canvas.boundingBox();
  if (box) {
      // Move to center
      const targetX = box.x + box.width / 2;
      const targetY = box.y + box.height / 2;
      await smoothMoveTo(targetX, targetY);
      
      await page.waitForTimeout(200); // Pause before click
      await page.mouse.click(targetX, targetY);
      
      // Move away slightly to show the component clearly
      await smoothMoveTo(targetX + 150, targetY + 150);

  }
  
  // 6. Show the placed component for a moment
  await page.waitForTimeout(1000); 

  // Save the video to the specific folder
  const video = page.video();
  
  // Closing the page forces the video stream to flush immediately,
  // reducing save time from ~20s to ~3s.
  await page.close();

  if (video) {
    await video.saveAs('videos/placing_component.webm');
  }
});
