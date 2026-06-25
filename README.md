# Kiosk Photo-Booth

A local browser-based photo booth app for event kiosks. This project includes a welcome flow, camera capture simulation, image processing, print preview, operator controls, and admin archive folder selection for printed photos.

## Files

- `index.html` - main kiosk UI layout and screen sections.
- `style.css` - visual styling, screen transitions, and responsive design.
- `script.js` - app logic, screen navigation, camera simulation, printing workflow, and archive saving.
- `assets/` - optional asset folder for images, icons, or fallback resources.

## Features

- Welcome consent screen with auto-start timeout
- Capture screen with camera feed and template overlays
- Processing pipeline and preview flow
- Print workflow with simulated printer animation
- Operator dashboard with settings and queue
- Admin archive folder selection using File System Access API
- Printed photos saved into a `PRINT_<datetime>` folder under the selected archive root

## Run locally

1. Open a terminal in `c:\Users\Lenovo\OneDrive\Documents\project\photo`
2. Start a local server, for example:
   - Python 3: `python -m http.server 8000`
3. Open `http://127.0.0.1:8000` in a supported browser.

> Note: `file://` may not allow all browser APIs. Use a local server for best results.

## Browser compatibility

- Best experience in Chromium-based browsers (Chrome, Edge) for camera simulation and folder picker support.
- The archive folder picker requires `window.showDirectoryPicker()`.

## Notes

- The app currently uses a simulated camera fallback and does not require a real webcam.
- The operator button flow and admin archive save logic are implemented in `script.js`.
- If the welcome screen button fails, check browser console for JavaScript errors and ensure `script.js` is loaded.

## License

This project is provided as-is for local development and event kiosk demos.
