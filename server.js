#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3456;
const HTML_FILE = path.join(__dirname, 'index.html');
const ESPANSO_FILE = path.join(process.env.HOME, '.config/espanso/match/emails.yml');
const DRAFTS_FILE = path.join(__dirname, 'drafts.json');
const FEEDBACK_FILE = path.join(__dirname, 'feedback.json');
const RULES_FILE = path.join(__dirname, 'copywriter-rules.md');

let suggestionQueue = [];

function readDrafts() {
  try { return JSON.parse(fs.readFileSync(DRAFTS_FILE, 'utf8')); }
  catch { return []; }
}
function writeDrafts(drafts) {
  fs.writeFileSync(DRAFTS_FILE, JSON.stringify(drafts, null, 2), 'utf8');
}

function stripHtml(html) {
  return (html || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

function computeDiff(originalHtml, editedHtml, originalSubject, editedSubject) {
  const origWords = stripHtml(originalHtml).split(' ').filter(Boolean);
  const editWords = stripHtml(editedHtml).split(' ').filter(Boolean);
  const origSet = new Set(origWords);
  const editSet = new Set(editWords);
  const added = editWords.filter(w => !origSet.has(w));
  const removed = origWords.filter(w => !editSet.has(w));
  const subjectChanged = (originalSubject || '').trim() !== (editedSubject || '').trim();
  const wordDelta = editWords.length - origWords.length;
  const countLinks = h => ((h || '').match(/<a /gi) || []).length;
  const linkDelta = countLinks(editedHtml) - countLinks(originalHtml);

  const parts = [];
  if (subjectChanged) parts.push(`Subject: '${originalSubject}' -> '${editedSubject}'`);
  if (removed.length) parts.push(`Removed: ${removed.slice(0, 5).join(', ')}${removed.length > 5 ? '...' : ''}`);
  if (added.length) parts.push(`Added: ${added.slice(0, 5).join(', ')}${added.length > 5 ? '...' : ''}`);
  if (wordDelta !== 0) parts.push(`Length: ${wordDelta > 0 ? '+' : ''}${wordDelta} words`);
  if (linkDelta !== 0) parts.push(`Links: ${linkDelta > 0 ? '+' : ''}${linkDelta}`);

  return { subjectChanged, wordsAdded: added, wordsRemoved: removed, wordDelta, linkDelta,
    hasChanges: parts.length > 0, summary: parts.length > 0 ? parts.join('. ') + '.' : 'No changes.' };
}

function saveFeedback(draft, diff) {
  let feedback = [];
  try { feedback = JSON.parse(fs.readFileSync(FEEDBACK_FILE, 'utf8')); } catch {}
  feedback.push({
    id: draft.id, contact: draft.contact, company: draft.company,
    source: draft.source, diff, timestamp: new Date().toISOString()
  });
  fs.writeFileSync(FEEDBACK_FILE, JSON.stringify(feedback, null, 2), 'utf8');
}

function updateRules(ruleText) {
  if (!ruleText) return;

  let rules = '';
  try { rules = fs.readFileSync(RULES_FILE, 'utf8'); } catch {
    rules = '# Copywriter Rules (auto-generated)\n# Updated by Template Editor. Max 30 rules.\n# Read by copywriter/send-email BEFORE each draft.\n\n';
  }

  const lines = rules.split('\n');
  const ruleLines = lines.filter(l => l.startsWith('RULE:'));
  if (ruleLines.length >= 30) return;

  // Check for duplicate (>60% word overlap with existing rule)
  const ruleWords = ruleText.toLowerCase().split(/\s+/);
  const isDuplicate = ruleLines.some(existing => {
    const existingText = existing.toLowerCase().replace(/^rule:\s*/, '').replace(/\s*\[x\d+\]$/, '');
    const existingWords = new Set(existingText.split(/\s+/));
    const matchCount = ruleWords.filter(w => existingWords.has(w)).length;
    return matchCount > ruleWords.length * 0.6;
  });

  if (isDuplicate) {
    const updatedLines = lines.map(l => {
      if (!l.startsWith('RULE:')) return l;
      const existingText = l.toLowerCase().replace(/^rule:\s*/, '').replace(/\s*\[x\d+\]$/, '');
      const existingWords = new Set(existingText.split(/\s+/));
      const matchCount = ruleWords.filter(w => existingWords.has(w)).length;
      if (matchCount > ruleWords.length * 0.6) {
        const counterMatch = l.match(/\[x(\d+)\]$/);
        if (counterMatch) {
          return l.replace(/\[x(\d+)\]$/, `[x${parseInt(counterMatch[1]) + 1}]`);
        }
        return l + ' [x2]';
      }
      return l;
    });
    fs.writeFileSync(RULES_FILE, updatedLines.join('\n'), 'utf8');
  } else {
    fs.writeFileSync(RULES_FILE, rules.trimEnd() + '\nRULE: ' + ruleText + ' [x1]\n', 'utf8');
  }
  console.log('  ✓ Rules updated:', ruleText);
}

async function generateSemanticRule(originalHtml, editedHtml, originalSubject, editedSubject) {
  const { execSync } = require('child_process');
  const https = require('https');
  let apiKey;
  try {
    apiKey = execSync('security find-generic-password -a "anthropic" -s "anthropic-api-key" -w', {encoding: 'utf8'}).trim();
  } catch { return null; }

  const origText = stripHtml(originalHtml);
  const editText = stripHtml(editedHtml);
  if (origText === editText && (originalSubject || '').trim() === (editedSubject || '').trim()) return null;

  const prompt = `You analyze email draft corrections for the Galien Foundation (biomedical awards, Nobel-level prestige).
The user edited a draft email. Infer ONE actionable copywriting rule from this correction.

Original subject: ${originalSubject || '(unchanged)'}
Edited subject: ${editedSubject || '(unchanged)'}

Original body:
${origText}

Edited body:
${editText}

Write ONE rule (max 15 words, imperative form, in English). Examples:
- "Never open with 'I hope this finds you well'"
- "Keep follow-up emails under 50 words"
- "Reference the specific event name in subject lines"
- "Don't include documents in short follow-ups"

If the change is trivial (typo, name fix, formatting only), respond with SKIP.

Rule:`;

  const payload = JSON.stringify({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 60,
    messages: [{ role: 'user', content: prompt }]
  });

  return new Promise((resolve) => {
    const options = {
      hostname: 'api.anthropic.com', port: 443, path: '/v1/messages', method: 'POST',
      headers: {
        'x-api-key': apiKey, 'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload)
      }
    };
    const req = https.request(options, (res) => {
      let body = ''; res.on('data', d => body += d);
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          const rule = (data.content?.[0]?.text || '').trim().replace(/^Rule:\s*/i, '').replace(/^["']|["']$/g, '');
          resolve(!rule || rule === 'SKIP' || rule.length < 5 ? null : rule);
        } catch { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.write(payload);
    req.end();
  });
}

async function pushGmailDraft(toEmail, toName, subject, htmlBody, replyTo) {
  const { execSync } = require('child_process');
  const unipileKey = execSync('security find-generic-password -a "unipile" -s "unipile-api-key" -w', {encoding: 'utf8'}).trim();
  const https = require('https');

  const payload = {
    account_id: '4UxqV9RBTJutTVlMyRHHDA',
    to: [{ identifier: toEmail, display_name: toName }],
    bcc: [{ identifier: '5486117@bcc.hubspot.com' }],
    subject: subject,
    body: htmlBody
  };
  if (replyTo) payload.reply_to = replyTo;

  const payloadStr = JSON.stringify(payload);
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api3.unipile.com', port: 13315, path: '/api/v1/drafts', method: 'POST',
      headers: { 'X-API-KEY': unipileKey, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payloadStr) }
    };
    const req = https.request(options, (res) => {
      let body = ''; res.on('data', d => body += d);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(body) }); }
        catch { resolve({ status: res.statusCode, raw: body }); }
      });
    });
    req.on('error', reject);
    req.write(payloadStr);
    req.end();
  });
}

async function fetchEmailThread(contactEmail) {
  const { execSync } = require('child_process');
  const unipileKey = execSync('security find-generic-password -a "unipile" -s "unipile-api-key" -w', {encoding: 'utf8'}).trim();
  const https = require('https');

  const searchPath = `/api/v1/emails?account_id=4UxqV9RBTJutTVlMyRHHDA&limit=10&any_email=${encodeURIComponent(contactEmail)}`;

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api3.unipile.com', port: 13315, path: searchPath, method: 'GET',
      headers: { 'X-API-KEY': unipileKey }
    };
    const req = https.request(options, (res) => {
      let body = ''; res.on('data', d => body += d);
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          const emails = (data.items || data || [])
            .filter(e => !(e.subject || '').toLowerCase().includes('lemwarmup'))
            .map(e => ({
              id: e.id || e.provider_id,
              from: e.from?.display_name || e.from?.identifier || 'Unknown',
              from_email: e.from?.identifier || '',
              to: (e.to || []).map(t => t.display_name || t.identifier).join(', '),
              subject: e.subject || '(no subject)',
              date: e.date || e.created_at || '',
              body_snippet: stripHtml(e.body || '').substring(0, 300),
              body_full: stripHtml(e.body || '')
            }));
          resolve(emails);
        } catch (err) { reject(err); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
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

        // 2. Save to Espanso if there's a trigger (any source)
        if (data.espansoTrigger) {
          let espansoContent = fs.readFileSync(ESPANSO_FILE, 'utf8');

          // Find the template block: from trigger line to next trigger or section comment
          const escapedTrigger = data.espansoTrigger.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const triggerRegex = new RegExp(
            `  - trigger: "${escapedTrigger}"\\n    html: \\|\\n[\\s\\S]*?(?=\\n  (?:- trigger:|# ====)|$)`,
            'g'
          );
          const match = triggerRegex.exec(espansoContent);

          if (match) {
            // Clean HTML: remove inline styles but KEEP formatting tags
            const cleanHtml = data.body
              // Remove hidden preheader divs
              .replace(/<div[^>]*display:\s*none[^>]*>[\s\S]*?<\/div>/gi, '')
              // Remove wrapper divs (max-width containers)
              .replace(/<div[^>]*max-width:\s*600px[^>]*>/gi, '')
              // Remove images (Lemlist CDN)
              .replace(/<img[^>]*>/gi, '')
              // Convert <strong> to <b>
              .replace(/<strong[^>]*>/gi, '<b>')
              .replace(/<\/strong>/gi, '</b>')
              // Convert <em> to <i>
              .replace(/<em[^>]*>/gi, '<i>')
              .replace(/<\/em>/gi, '</i>')
              // Remove all style attributes
              .replace(/\s*style="[^"]*"/gi, '')
              // Remove data- attributes and id attributes
              .replace(/\s*data-[a-z-]+="[^"]*"/gi, '')
              .replace(/\s*id="[^"]*"/gi, '')
              // Simplify <p> to content + <br><br>
              .replace(/<p[^>]*>/gi, '')
              .replace(/<\/p>/gi, '<br>')
              // Simplify <br> tags
              .replace(/<br[^>]*\/?>/gi, '<br>')
              // Remove <div> wrappers but keep content
              .replace(/<div[^>]*>/gi, '')
              .replace(/<\/div>/gi, '')
              // Remove <small> tags
              .replace(/<small[^>]*>/gi, '')
              .replace(/<\/small>/gi, '')
              // Clean up &nbsp;
              .replace(/&nbsp;/g, ' ')
              // Clean up multiple <br>
              .replace(/(<br>\s*){3,}/g, '<br><br>')
              // Clean up extra spaces
              .replace(/ {2,}/g, ' ')
              .trim();

            // Build new Espanso block (html only, no replace)
            const newBlock = `  - trigger: "${data.espansoTrigger}"\n    html: |\n      ${cleanHtml}`;

            espansoContent = espansoContent.replace(match[0], newBlock);
            fs.writeFileSync(ESPANSO_FILE, espansoContent, 'utf8');
            console.log(`  ✓ Espanso updated: ${data.espansoTrigger}`);
          } else {
            console.log(`  ⚠ Espanso trigger ${data.espansoTrigger} not found in emails.yml`);
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
  } else if (req.method === 'GET' && req.url === '/lemlist-campaigns') {
    // Fetch campaigns list from Lemlist API (non-archived only)
    (async () => {
      try {
        const { execSync } = require('child_process');
        const apiKey = execSync('security find-generic-password -a lemlist -s lemlist-api -w', {encoding: 'utf8'}).trim();
        const auth = 'Basic ' + Buffer.from(':' + apiKey).toString('base64');
        const https = require('https');

        const fetchJSON = (url) => new Promise((resolve, reject) => {
          const urlObj = new URL(url);
          https.get({ hostname: urlObj.hostname, path: urlObj.pathname + urlObj.search, headers: { 'Authorization': auth } }, (r) => {
            let body = ''; r.on('data', d => body += d); r.on('end', () => { try { resolve(JSON.parse(body)); } catch(e) { reject(e); } });
          }).on('error', reject);
        });

        // Get all campaigns (paginated)
        let allCampaigns = [];
        for (let offset = 0; offset < 300; offset += 100) {
          const page = await fetchJSON(`https://api.lemlist.com/api/campaigns?offset=${offset}`);
          if (!Array.isArray(page) || page.length === 0) break;
          allCampaigns = allCampaigns.concat(page);
          await new Promise(r => setTimeout(r, 200));
        }

        // Filter out archived, return name + id, sorted by name
        const campaigns = allCampaigns
          .filter(c => !c.archived)
          .map(c => ({ id: c._id, name: c.name, state: c.state || 'unknown' }))
          .sort((a, b) => a.name.localeCompare(b.name));

        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({ success: true, campaigns }));
      } catch (err) {
        res.writeHead(500, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    })();
  } else if (req.method === 'GET' && req.url.startsWith('/lemlist-steps/')) {
    // Fetch steps for a specific campaign
    const campaignId = req.url.split('/lemlist-steps/')[1];
    (async () => {
      try {
        const { execSync } = require('child_process');
        const apiKey = execSync('security find-generic-password -a lemlist -s lemlist-api -w', {encoding: 'utf8'}).trim();
        const auth = 'Basic ' + Buffer.from(':' + apiKey).toString('base64');
        const https = require('https');

        const fetchJSON = (url) => new Promise((resolve, reject) => {
          const urlObj = new URL(url);
          https.get({ hostname: urlObj.hostname, path: urlObj.pathname + urlObj.search, headers: { 'Authorization': auth } }, (r) => {
            let body = ''; r.on('data', d => body += d); r.on('end', () => { try { resolve(JSON.parse(body)); } catch(e) { reject(e); } });
          }).on('error', reject);
        });

        const seqData = await fetchJSON(`https://api.lemlist.com/api/campaigns/${campaignId}/sequences`);
        const steps = [];
        for (const [seqId, seq] of Object.entries(seqData)) {
          if (typeof seq !== 'object' || !seq.steps) continue;
          for (const s of seq.steps) {
            if (!s._id) continue;
            const type = s.type || '?';
            if (type === 'conditional') continue; // skip conditionals
            const subject = s.subject || '';
            const msg = typeof s.message === 'string' ? s.message : '';
            const preview = type === 'email' ? subject.substring(0, 80) : msg.substring(0, 80);
            steps.push({
              stepId: s._id,
              seqId: seqId,
              type: type,
              delay: s.delay || 0,
              subject: subject,
              preview: preview,
              msgLength: msg.length
            });
          }
        }

        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({ success: true, campaignId, steps }));
      } catch (err) {
        res.writeHead(500, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    })();
  } else if (req.method === 'POST' && req.url === '/push-lemlist') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        const { targets, type, subject, html, plainText } = data;

        if (!targets || !targets.length) {
          res.writeHead(400, {'Content-Type': 'application/json'});
          res.end(JSON.stringify({success: false, error: 'No targets specified'}));
          return;
        }

        // Get Lemlist API key
        const { execSync } = require('child_process');
        const apiKey = execSync('security find-generic-password -a lemlist -s lemlist-api -w', {encoding: 'utf8'}).trim();
        const auth = 'Basic ' + Buffer.from(':' + apiKey).toString('base64');

        let updated = 0;
        const errors = [];

        for (const target of targets) {
          const url = `https://api.lemlist.com/api/sequences/${target.sequenceId}/steps/${target.stepId}`;

          // Build the update payload based on type
          // API docs: PATCH, `type` required, `message` is a string (HTML for email, plain text for LinkedIn)
          const payload = {};
          if (type === 'email') {
            payload.type = 'email';
            payload.subject = subject;
            payload.message = html;  // HTML as-is, no cleaning (styles are intentional)
          } else if (type === 'linkedin') {
            payload.type = 'linkedinSend';
            payload.message = plainText;  // Plain text string in message field
          }

          console.log(`  → Pushing to ${target.label} (${target.stepId})...`);

          try {
            const https = require('https');
            const result = await new Promise((resolve, reject) => {
              const reqData = JSON.stringify(payload);
              const urlObj = new URL(url);
              const options = {
                hostname: urlObj.hostname,
                path: urlObj.pathname,
                method: 'PATCH',  // Lemlist API uses PATCH, not PUT
                headers: {
                  'Authorization': auth,
                  'Content-Type': 'application/json',
                  'Content-Length': Buffer.byteLength(reqData)
                }
              };
              const apiReq = https.request(options, (apiRes) => {
                let body = '';
                apiRes.on('data', d => body += d);
                apiRes.on('end', () => {
                  resolve({ status: apiRes.statusCode, body });
                });
              });
              apiReq.on('error', reject);
              apiReq.write(reqData);
              apiReq.end();
            });

            if (result.status >= 200 && result.status < 300) {
              console.log(`    ✓ OK (${result.status})`);
              updated++;
            } else {
              console.log(`    ✗ ${result.status}: ${result.body}`);
              errors.push(`${target.label}: HTTP ${result.status}`);
            }

            // Rate limit: 200ms between requests
            await new Promise(r => setTimeout(r, 200));

          } catch (err) {
            console.log(`    ✗ ${err.message}`);
            errors.push(`${target.label}: ${err.message}`);
          }
        }

        res.writeHead(200, {'Content-Type': 'application/json'});
        if (errors.length > 0) {
          res.end(JSON.stringify({success: updated > 0, updated, errors}));
        } else {
          res.end(JSON.stringify({success: true, updated}));
        }
      } catch (err) {
        console.error('Push Lemlist error:', err);
        res.writeHead(500, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({success: false, error: err.message}));
      }
    });
  } else if (req.method === 'POST' && req.url === '/save-espanso') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const trigger = data.trigger;
        const html = data.html;

        if (!trigger || !html) {
          res.writeHead(400, {'Content-Type': 'application/json'});
          res.end(JSON.stringify({success: false, error: 'Missing trigger or html'}));
          return;
        }

        let espansoContent = fs.readFileSync(ESPANSO_FILE, 'utf8');

        // Check if trigger already exists
        const escapedTrigger = trigger.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const existsRegex = new RegExp(
          `  - trigger: "${escapedTrigger}"\\n    html: \\|\\n[\\s\\S]*?(?=\\n  (?:- trigger:|# ====)|$)`,
          'g'
        );
        const match = existsRegex.exec(espansoContent);

        const newBlock = `  - trigger: "${trigger}"\n    html: |\n      ${html}`;

        if (match) {
          // Update existing
          espansoContent = espansoContent.replace(match[0], newBlock);
          console.log(`  ✓ Espanso updated: ${trigger}`);
        } else {
          // Append new trigger at end of matches
          espansoContent = espansoContent.trimEnd() + '\n\n' + newBlock + '\n';
          console.log(`  ✓ Espanso created: ${trigger}`);
        }

        fs.writeFileSync(ESPANSO_FILE, espansoContent, 'utf8');
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({success: true, message: 'Espanso saved: ' + trigger}));
      } catch (err) {
        console.error('Save Espanso error:', err);
        res.writeHead(500, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({success: false, error: err.message}));
      }
    });
  // ── DRAFTS ENDPOINTS ─────────────────────────────────────────
  } else if (req.method === 'POST' && req.url === '/draft') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const draft = {
          id: 'draft_' + Date.now(),
          contact: data.contact || '',
          company: data.company || '',
          email: data.email || '',
          deal: data.deal || '',
          subject: data.subject || '',
          html: data.html || '',
          original_html: data.html || '',
          original_subject: data.subject || '',
          source: data.source || 'manual',
          task_id: data.task_id || null,
          reply_to: data.reply_to || null,
          context: data.context || null,
          created_at: new Date().toISOString(),
          status: 'pending'
        };
        const drafts = readDrafts();
        drafts.unshift(draft);
        writeDrafts(drafts);
        console.log(`  + Draft created: ${draft.id} (${draft.contact})`);
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({success: true, id: draft.id}));
      } catch (err) {
        res.writeHead(500, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({success: false, error: err.message}));
      }
    });
  } else if (req.method === 'GET' && req.url === '/drafts') {
    const drafts = readDrafts().filter(d => d.status === 'pending');
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({success: true, drafts}));
  } else if (req.method === 'POST' && req.url.match(/^\/draft\/[^/]+\/validate$/)) {
    const draftId = req.url.split('/')[2];
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        const drafts = readDrafts();
        const idx = drafts.findIndex(d => d.id === draftId);
        if (idx === -1) {
          res.writeHead(404, {'Content-Type': 'application/json'});
          res.end(JSON.stringify({success: false, error: 'Draft not found'}));
          return;
        }
        const draft = drafts[idx];

        // 1. Compute diff
        const diff = computeDiff(draft.original_html, data.edited_html, draft.original_subject, data.edited_subject);
        console.log(`  → Diff: ${diff.summary}`);

        // 2. Save feedback (raw diff for history)
        saveFeedback(draft, diff);

        // 2b. Generate semantic rule via Haiku (async, non-blocking for Gmail push)
        if (diff.hasChanges) {
          generateSemanticRule(draft.original_html, data.edited_html, draft.original_subject, data.edited_subject)
            .then(rule => {
              if (rule) {
                updateRules(rule);
                console.log(`  ✓ Semantic rule: ${rule}`);
              } else {
                console.log('  → No semantic rule (trivial change or API error)');
              }
            })
            .catch(err => console.error('  ✗ Semantic rule error:', err.message));
        }

        // 3. Push to Gmail via Unipile
        const gmailResult = await pushGmailDraft(draft.email, draft.contact, data.edited_subject, data.edited_html, draft.reply_to);
        console.log(`  → Gmail draft: ${gmailResult.status}`);

        // 4. Mark validated
        drafts[idx].status = 'validated';
        drafts[idx].validated_at = new Date().toISOString();
        writeDrafts(drafts);

        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({success: gmailResult.status >= 200 && gmailResult.status < 300, diff: diff.summary, gmail: gmailResult}));
      } catch (err) {
        console.error('Validate error:', err);
        res.writeHead(500, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({success: false, error: err.message}));
      }
    });
  } else if (req.method === 'DELETE' && req.url.match(/^\/draft\/[^/]+$/)) {
    const draftId = req.url.split('/')[2];
    const drafts = readDrafts().filter(d => d.id !== draftId);
    writeDrafts(drafts);
    console.log(`  - Draft deleted: ${draftId}`);
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({success: true}));
  // ── FEEDBACK SUGGESTION (feedback loop for copywriter rules) ──
  } else if (req.method === 'POST' && req.url === '/feedback-suggestion') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        const diff = computeDiff(data.original_html, data.edited_html, data.original_subject, data.edited_subject);
        if (diff.hasChanges) {
          console.log(`  → Suggestion feedback: ${diff.summary}`);
          const rule = await generateSemanticRule(data.original_html, data.edited_html, data.original_subject, data.edited_subject);
          if (rule) {
            updateRules(rule);
            console.log(`  ✓ New copywriter rule: ${rule}`);
          }
        }
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({success: true, diff: diff.summary}));
      } catch (err) {
        res.writeHead(500, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({success: false, error: err.message}));
      }
    });
  // ── EMAIL THREAD ENDPOINT ──────────────────────────────────
  } else if (req.method === 'GET' && req.url.startsWith('/email-thread?')) {
    const params = new URL(req.url, 'http://localhost').searchParams;
    const email = params.get('email');
    if (!email) {
      res.writeHead(400, {'Content-Type': 'application/json'});
      res.end(JSON.stringify({success: false, error: 'Missing email param'}));
      return;
    }
    (async () => {
      try {
        const emails = await fetchEmailThread(email);
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({success: true, emails}));
      } catch (err) {
        console.error('Thread fetch error:', err);
        res.writeHead(500, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({success: false, error: err.message}));
      }
    })();
  // ── SUGGESTION ENDPOINTS (split view) ──────────────────────
  } else if (req.method === 'POST' && req.url === '/suggestion') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const sug = JSON.parse(body);
        sug.id = Date.now() + '_' + Math.random().toString(36).slice(2, 6);
        suggestionQueue.push(sug);
        console.log(`  + Suggestion queued (${suggestionQueue.length}): ${sug.pipeline} step ${sug.step}`);
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({success: true, queued: suggestionQueue.length}));
      } catch (err) {
        res.writeHead(400, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({success: false, error: err.message}));
      }
    });
  } else if (req.method === 'GET' && req.url === '/suggestion') {
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify(suggestionQueue));
  } else if (req.method === 'DELETE' && req.url.startsWith('/suggestion/')) {
    const id = req.url.split('/')[2];
    suggestionQueue = suggestionQueue.filter(s => s.id !== id);
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({success: true, remaining: suggestionQueue.length}));
  } else if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({status: 'ok', server: 'template-editor', version: '3.0'}));
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
