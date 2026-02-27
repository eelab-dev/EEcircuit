# TODO: Multi-Tab Editor + Local Filesystem Access

## Goal

Replace the single-file Monaco editor with a multi-tab, project-folder-aware IDE experience.
Users can open a local folder on their PC, edit all files as tabs, and have changes written
back to disk in real time — no upload/download required.

---

## Background

### Current localStorage behavior

The website already auto-saves to **browser localStorage** on every simulation run:

| localStorage key | Content |
|---|---|
| `netList` | SPICE netlist |
| `pythonCode` | Python (analogpy) code |
| `editorMode` | `"spice"` or `"python"` |
| `displayData` | Plot signal visibility settings |
| `aiApiKey` / `aiProvider` / `aiModel` | AI chat settings |

This is transparent to users — no UI notification exists. A small status indicator
("auto-saved locally") would be a low-effort improvement.

### The `.include` problem

`tb.include("modelcard.CMOS90")` references a file that doesn't exist in the browser
environment. Users cannot see or edit model parameters. Multi-tab + filesystem access
solves this naturally — the model file is just another tab.

---

## Architecture

### Monaco Editor model system

Monaco natively supports multiple **models** (one per file):

```typescript
const model = monaco.editor.createModel(content, language, uri);
editor.setModel(model);  // swap active model = switch tab
```

Tab chrome (the tab bar UI) must be built separately — Monaco provides the engine,
not the UI frame.

### File System Access API

Modern browser API for reading/writing local files with user consent:

```typescript
// User picks a folder → browser shows OS folder picker
const dirHandle = await window.showDirectoryPicker();

// Read a file
const fileHandle = await dirHandle.getFileHandle("modelcard.CMOS90");
const file = await fileHandle.getFile();
const content = await file.text();

// Write back after edit
const writable = await fileHandle.createWritable();
await writable.write(newContent);
await writable.close();
```

The folder path is shown via `dirHandle.name` (folder name only; full path is not
exposed by the browser for security reasons).

---

## Implementation Plan

### Level 1 — Hardcoded modelcard tab (read-only, no filesystem)

- Add a second Monaco model with hardcoded CMOS90 model content
- Simple tab bar above editor: `[ netlist ] [ modelcard.CMOS90 ]`
- No write-back; purely informational
- ~50-100 lines

### Level 2 — Editable modelcard tab (recommended first step)

- Two tabs: primary file + `modelcard.CMOS90`
- Editable with a Read-only / Edit toggle button per tab
- Sim engine intercepts `.include("modelcard.CMOS90")` and injects the edited content
- Content saved to localStorage alongside netlist
- ~150-250 lines; requires tracing `.include` resolution in `sim/`

### Level 3 — Full local filesystem (File System Access API)

- "Open Folder" button → `showDirectoryPicker()`
- All `.sp` / `.py` / `.mod` files in the folder open as tabs automatically
- Edits write back to disk in real time
- Folder name shown in header (e.g. `📁 my_project/`)
- `.include` resolution reads sibling files from the directory handle
- Graceful fallback to localStorage for unsupported browsers

---

## Browser Support

| Browser | `showDirectoryPicker` | Notes |
|---|---|---|
| Chrome / Edge | Full support | Best experience |
| Firefox | Partial | Flag required as of 2025 |
| Safari | Not supported | Common on Mac — needs fallback |

**Mitigation:** detect support on load; show a banner for unsupported browsers
directing them to Chrome/Edge. localStorage fallback keeps the app functional.

---

## UX Design Notes

- Tab bar above the Monaco editor (not the bottom panel tabs)
- Each tab shows filename; active tab highlighted
- "Open Folder" button in the editor toolbar
- Read-only / Edit toggle per tab (pencil icon)
- Unsaved indicator (dot on tab) if write-back fails
- On first visit or unsupported browser: single-tab mode with localStorage (current behavior)

---

## Files to Modify

| File | Change |
|---|---|
| `src/editor/editorCustom.tsx` | Add multi-model support, tab bar UI |
| `src/EEcircuit.tsx` | Pass file content map to editor; handle "Open Folder" state |
| `src/sim/` | Trace `.include` resolution; inject virtual file content |

---

## Open Questions

1. How does `sim/` currently resolve `.include` directives? Does it ignore them, error, or
   pass them through to the WASM ngspice layer?
2. Should the "Open Folder" session persist across page reloads? (The File System Access API
   requires re-granting permission each session unless the site is installed as a PWA.)
3. Should Level 2 (editable modelcard) ship before Level 3, as a stepping stone?
