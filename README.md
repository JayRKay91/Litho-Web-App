# Lithophane Print Studio

A client-side web application for uploading, cropping, contrast-tuning, and preparing custom images for MSLA 3D-printed lithophanes.

## Features

- **Format Selection:** Presets for Square (3"x3"), Portrait (3"x4"), Landscape (4"x3"), and Circle (3" Round).
- **Interactive Cropping & Tone:** Integrated with Cropper.js with auto-grayscale conversion, lockable viewports, and direct contrast/brightness fine-tuning.
- **Integrated Hanging Hooks:** Outer fillet tab alignment options (Single center top or Dual balanced hooks) with live guides.
- **Physical Border Alignment:** 3.0 mm border and 3.2 mm frame depth guidelines.
- **Export Package:** Direct client-side generation of high-resolution print canvases (300 DPI) and machine-readable JSON print manifests (`_manifest.json`).

## Project Structure

```text
/
├── index.html     # Studio UI and dashboard panels
├── style.css      # Dark-mode dashboard styling and border guide overlays
├── app.js         # Canvas export pipeline, image tone filters, and cropper logic
├── README.md      # Project overview and notes
└── .gitignore     # Git exclusion rules
