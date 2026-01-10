# EEcircuit User Guide

Welcome to EEcircuit! This guide covers the essential operations for creating, simulating, and analyzing circuits. The interface is designed to adapt to your device, offering optimized controls for Mouse, Trackpad, and Touchscreen inputs.

## 1. Input Profiles
EEcircuit automatically detects your device, but you can manually toggle input profiles using the device icon in the header (Mouse 🖱️ / Trackpad  touchpad / Touchscreen 📱).

| Profile | Zoom | Pan | Selection |
| :--- | :--- | :--- | :--- |
| **Mouse** | Shift + Scroll Wheel | Scroll Wheel (Click & Drag) | Click & Drag Box |
| **Trackpad** | Ctrl + Scroll (Two Fingers) | Two Finger Scroll | Click & Drag Box |
| **Touchscreen** | Pinch | Single Finger Drag | Tap object |

## 2. File Operations
Located in the top-right header:
*   **Open**: Click the Upload icon (⬆️) or **Drag & Drop** a `.json` or `.txt` schematic file directly onto the window.
*   **Save**: Click the Download icon (⬇️) to save your current schematic and settings as a JSON file.
*   **New/Clear**: Click the Rotate/Reset icon (🔄) to clear the current schematic.

## 3. Creating & Editing Schematics

### **Place a Component**
1.  **Open Library**: Press **`A`** on your keyboard or click the **Add Component** button (Copy+ icon) in the floating action bar.
2.  **Select**: Click a component from the library (e.g., Resistor, nFET, Voltage Source).
3.  **Place**: The component will appear attached to your cursor. Click anywhere on the canvas to place it.

### **Move a Component (Move Mode)**
Enter **Move Mode** by pressing **`M`** or clicking the **Move** button (Cross-arrows icon).

*   **Mouse / Trackpad**: Click and drag a component to move it.
*   **Touchscreen**: Two strategies are available:
    1.  **Press-Drag-Release (Fast)**: Touch and hold a component, drag it to the new location, and release.
    2.  **Tap-to-Pick (Precise)**: Tap a component once to "pick it up" (it will stick to your cursor). Tap again to drop it.
*   **Rotate/Flip**: While moving (or "carrying") a component, use the on-screen buttons or keys (**`R`** for Rotate, **`H`** / **`V`** for Flip).

### **Wire Components (Wire Mode)**
Enter **Wire Mode** by pressing **`W`** or clicking the **Wire** button (Cable icon).

*   **Strategy**: Use a **Tap-to-Point** method.
    1.  **Start**: Click/Tap a terminal or existing wire to begin. (*Note: You cannot start from an already connected terminal*).
    2.  **Route**: Click/Tap on empty space to create corners. All bends are automatically 90°.
    3.  **Finish**: Click/Tap on another terminal or wire to complete connections.
*   **Junctions**: Splicing into a wire creates a junction (dot).
    *   **Rule**: A junction can only connect **3 wire segments** (T-junction).
    *   **4-Way connections**: To connect 4 wires, you must create **two separate 3-way junctions** next to each other. Cross-junctions (4-way dots) are not supported.
    *   **Invalid Actions**: You cannot start a wire from an already connected terminal. To change connections, you must delete the existing wire first.

> [!TIP]
> **Best Practice: Naming Nets & Components**
> Before simulating (exporting to netlist), it is highly recommended to **name ALL nets and components explicitly**.
> *   **Nets**: Avoid relying on auto-generated names (like `net_1`, `wire_3`). Explicit names (e.g., `out`, `in`) make plots and debug logs much easier to read.  Also, avoid prefixes like `Vin` or `Vout`. Use neutral names like `in` or `out` instead, as nets are used to plot **both** voltage and current.
> *   **Components**: Give components meaningful names (e.g., `Vsup`, `Vbias`, `Rf`) instead of default `V10`, `R21` to clarify their purpose in the circuit.

### **Name & Edit Properties**
1.  **Select**: Click on any component or wire.
2.  **Edit**: The **Properties Panel** will appear floating on the right.
3.  **Update**:
    *   **Name**: Type a new reference designator (e.g., `R_Feedback`).
    *   **Values**: Enter component values (e.g., `10k`, `10u`).
    *   **Confirm**: Press **Enter** or click "Apply".

### **Delete a Component**
1.  **Enter Delete Mode**: Press **`Shift + D`** key or click the **Eraser** icon in the action bar.
2.  **Delete**: Click on any component or wire to remove it.
3.  **Exit**: Press **`Esc`** or click the tool button again to exit delete mode.

## 4. Run Simulation
1.  **Generate Netlist**: Click the **Simulate** button in the bottom-right corner of the schematic view.
    *   *If there are wiring errors, you will be notified.*
    *   Upon success, the app automatically switches to the **Simulate Tab**.
2.  **Configure Analysis**:
    *   **Type**: Select the analysis type (e.g., DC, AC, Transient) from the dropdown.
    *   **Parameters**: Enter the required values (e.g., Start/Stop times, voltage ranges).
3.  **Run**: Click the **Run Simulation** button.
    *   **Errors**: If the simulation fails (e.g., convergence issues), an error notification will appear.
    *   **Success**: If successful, the app automatically navigates to the **Plot Tab**.

## 5. Plotting Results
After a successful simulation:
1.  Navigate to the **Plot** tab.
2.  **Select Signals**: Use the **Sidebar** to check/uncheck available voltage and current variables.
    *   *Pro Tip: Use the "Single/Dual" toggle to view two separate plot canvases.*
3.  **Analyze**:
    *   **Cursor**: Click "Show Cursor" to inspect specific data points.
    *   **Log Scale**: Toggle Log X/Y axes for frequency response analysis (AC/Bode plots).

### **Plot Navigation**
| Profile | Zoom In/Out | Pan (When Zoomed) | Reset View |
| :--- | :--- | :--- | :--- |
| **Mouse** 🖱️ | `Shift` + Scroll Wheel | Scroll Wheel | Double Click |
| **Trackpad** | Pinch (or `Ctrl` + Scroll) | 2-Finger Scroll | Double Click |
| **Touch** 📱 | 2-Finger Pinch | 1-Finger Drag | Double Tap |



## 6. Bracket Mode (Parameter Sweep)
You can sweep component values to analyze circuit behavior over a range of parameters.

1.  **Usage**: In the **Properties Panel** for a component, instead of a static value (e.g., `10k`), enter a range in brackets.
2.  **Syntax**: `[start:step:stop]`
    *   **Units**: You can place units inside (e.g., `[1k:1k:10k]`) or outside (e.g., `[1:1:10]k`). Placing the unit outside is more concise.
    *   Example: `[1:1:10]k` behaves the same as `[1k:1k:10k]`.
3.  **Result**:
    *   The app detects the bracket and runs multiple parallel simulations.
    *   The **Plot Tab** will display a slider to scrub through the swept parameter results.
    *   *Configuration*: You can change the number of concurrent simulations in **Settings > Simulation > Maximum Parallel Web Workers**.

## 7. Shortcuts Summary

| Action | Shortcut |
| :--- | :--- |
| **Add Component** | `A` |
| **Wire Mode** | `W` |
| **Move Mode** | `M` |
| **Text Mode** | `T` |
| **Delete Mode** | `Shift + D` |
| **Rotate** | `R` (while moving) |
| **Undo** | `Shift + Z` |
| **Redo** | `Shift + R` |
| **Fit to Screen** | `F` |
| **Keyboard Shortcuts** | `Shift + H` |
