#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3456;
const HTML_FILE = path.join(__dirname, 'email-editor.html');
const ESPANSO_FILE = path.join(process.env.HOME, '.config/espanso/match/emails.yml');

const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/save') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);

        // 1. Save to email-editor.html
        let htmlContent = fs.readFileSync(HTML_FILE, 'utf8');
        const stepsMatch = htmlContent.match(/const STEPS = \{[\s\S]*?\n\};/);
        if (stepsMatch) {
          const newStepsCode = 'const STEPS = ' + JSON.stringify(data.steps, null, 2) + ';';
          htmlContent = htmlContent.replace(stepsMatch[0], newStepsCode);
          fs.writeFileSync(HTML_FILE, htmlContent, 'utf8');
        }

        // 2. Save to Espanso if it's an Espanso template
        if (data.source === 'esp' && data.espansoTrigger) {
          let espansoContent = fs.readFileSync(ESPANSO_FILE, 'utf8');

          // Find the template block
          const triggerRegex = new RegExp(`- trigger: "${data.espansoTrigger}"[\\s\\S]*?(?=\\n  - trigger:|\\n\\n|$)`, 'g');
          const match = triggerRegex.exec(espansoContent);

          if (match) {
            // Extract plain text from HTML
            const plainText = data.body
              .replace(/<br\s*\/?>/gi, '\n')
              .replace(/<\/p>/gi, '\n')
              .replace(/<p[^>]*>/gi, '')
              .replace(/<b>(.*?)<\/b>/gi, '$1')
              .replace(/<strong>(.*?)<\/strong>/gi, '$1')
              .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '$2 ($1)')
              .replace(/<ul[^>]*>/gi, '')
              .replace(/<\/ul>/gi, '')
              .replace(/<li[^>]*>/gi, '- ')
              .replace(/<\/li>/gi, '\n')
              .replace(/<[^>]+>/g, '')
              .replace(/&nbsp;/g, ' ')
              .replace(/\n\n\n+/g, '\n\n')
              .trim();

            // Build new template block
            const newBlock = `  - trigger: "${data.espansoTrigger}"
    replace: "${data.subject}"
    html: |
      ${plainText.split('\n').join('\n      ')}`;

            espansoContent = espansoContent.replace(match[0], newBlock);
            fs.writeFileSync(ESPANSO_FILE, espansoContent, 'utf8');
          }
        }

        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({success: true, message: 'Saved successfully'}));
      } catch (err) {
        console.error('Save error:', err);
        res.writeHead(500, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({success: false, error: err.message}));
      }
    });
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(PORT, () => {
  console.log(`✓ Email Editor Server running on http://localhost:${PORT}`);
  console.log(`  Saving to: ${HTML_FILE}`);
  console.log(`  Espanso: ${ESPANSO_FILE}`);
});
