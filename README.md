# Galien Outreach Template Editor

Visual Gmail-like editor for managing email templates across multiple outreach pipelines.

## Features

- 📧 **4 Pipelines**: Partners Forum, Partners GPS, Candidats, Candidats P1
- 🔄 **11 Steps per pipeline**: Call for Partners → Reprise → Email 1-3 → LinkedIn 1-3 → Journey → FU Journey → After Meeting → FU After Meeting
- ✏️ **Live editing**: Gmail-like WYSIWYG editor
- 💾 **Auto-save**: Saves to both `index.html` (internal data) and `~/.config/espanso/match/emails.yml` (Espanso templates)
- 🏷️ **Custom triggers**: Define Espanso triggers (`:journeypartners`, `:aftergps`, etc.) directly in the UI
- 📋 **Copy to clipboard**: Export HTML or plain text for use in Lemlist or other tools
- 🔗 **Quick links**: All Galien Foundation documents and resources in one place

## Usage

### 1. Start the server

```bash
node server.js
```

The server runs on `http://localhost:3456` and handles automatic file saving.

### 2. Open the editor

Open `index.html` in your browser.

### 3. Edit templates

1. Select a pipeline from the top tabs
2. Click on a step in the left sidebar
3. Edit the email content in the Gmail-like editor
4. Modify the Espanso trigger in the sidebar input (e.g., `:mytemplate`)
5. Click **"Save to File"** to persist changes

### 4. Export for Lemlist

1. Edit your template
2. Click **"Copy HTML"**
3. Paste into Lemlist campaign editor

## File Structure

```
template-editor/
├── index.html          # Main editor UI
├── server.js           # Node.js server for file saving
└── README.md           # This file
```

## Technical Details

- **No dependencies**: Pure HTML/CSS/JS + Node.js built-in modules
- **Dual save**: Updates both the editor's internal data structure AND Espanso YAML
- **Live preview**: WYSIWYG editing with contenteditable
- **Smart triggers**: Only saves to Espanso if trigger starts with `:`

## Espanso Integration

Templates with triggers starting with `:` (e.g., `:journeypartners`) are automatically synced to `~/.config/espanso/match/emails.yml`.

Use them in any text field by typing the trigger!

## Author

Built for the Galien Foundation outreach workflow.
