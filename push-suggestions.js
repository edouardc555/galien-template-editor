#!/usr/bin/env node
// Push all 12 Forum pipeline copywriter suggestions
const http = require('http');

function push(data) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const req = http.request({
      hostname: 'localhost', port: 3456, path: '/suggestion',
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { reject(e); } });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

const SIG = `<br><br>Edouard`;
const SIG_FULL = `<br><br><b>Edouard L. Cohen, M.D.</b> | Chief Innovation Officer<br>The Galien Foundation<br>99 John Street Suite 2502, New York, NY 10038<br>Phone: +1 929 470 7341`;

const suggestions = [
  // Step 0 - Call for Partners (MR) - Fix factual error
  {
    pipeline: "forum", step: 0,
    subject: "{{company}} - Invitation : 20th Prix Galien USA & 28th International Awards",
    html: "[CORRECTION FACTUELLE] Remplacer 'laureates and leaders from over 20 countries' par 'all worldwide winners from the past two years'. Le reste du template MR est bon."
  },

  // Step 1 - Reprise de contact
  {
    pipeline: "forum", step: 1,
    subject: "Prix Galien USA 2026 - 20th Anniversary",
    html: `Dear [Salutation] [Last Name],<br><br>I hope this message finds you well.<br><br>We are currently preparing the <b>20th anniversary of the Prix Galien USA Forum</b>, scheduled for <b>October 29th</b> at the American Museum of Natural History in New York City. For the first time, the ceremony will be held alongside the <b>International Prix Galien</b>, bringing together all worldwide winners from the past two years.<br><br>We already have confirmations that <b>Albert Bourla</b> (Pfizer), <b>Joaquin Duato</b> (J&J), <b>Thomas Schinecker</b> (Roche), <b>Yvonne Greenstreet</b> (Alnylam) and <b>Dean Y. Li</b> (Merck) will be joining us at the Forum.<br><br>Please find enclosed the <a href="https://www.calameo.com/read/005925913f6d00c3bc70b">Media Kit</a> and last year's <a href="https://www.galienfoundation.org/galien-forum-usa-2025-program">Forum program</a> (keynote delivered by FDA Commissioner Marty Makary).<br><br>Do you think it would be possible for [Company] to support this upcoming edition?<br><br>A dedicated session on [smarttopic] would, in our view, make a very meaningful contribution to both the impact and the overall success of the Forum.<br><br>I am available, should you wish to discuss this further.<br><br>Many thanks, and wishing you a great week ahead.<br><br>Warm regards,${SIG}`
  },

  // Step 2 - Email 1 (fix: branch A has duplicate paragraphs about 2026)
  {
    pipeline: "forum", step: 2,
    subject: "{{company}} - Invitation : 20th Prix Galien USA & 28th International Awards",
    html: `Dear {{salutationLastName}},<br><br>Following Dr. Rosenblatt's invitation and on behalf of the Galien Foundation, I would be pleased to share more details about the Prix Galien USA, an initiative I volunteer alongside our Forum Co-Chairs, <b>Kenneth C. Frazier</b>, Retired Chairman and CEO, Merck & Co., and <b>Dr. Michael Rosenblatt</b>, Member, Harvard Board of Overseers; Advisory Partner, Ascenta Capital & Flagship Pioneering.<br><br>{{opening}}<br><br>Under the legacy of <b>Professor Elie Wiesel</b> - Honorary Founding President, Peace Nobel Laureate - the Galien Foundation is guided by the conviction that science and innovation must always serve people with dignity, compassion, and justice. At the heart of our mission, the Prix Galien - often referred to as the Nobel Prize of life sciences research - recognizes the most outstanding achievements in improving the human condition.<br><br><b>2026 will be an exceptional year:</b> we are celebrating the <b>20th anniversary of the Prix Galien USA</b> alongside the <b>International Prix Galien</b>, bringing together all worldwide winners from the past two years. Last year, we were honored to celebrate Michael J. Fox for his extraordinary impact as both a renowned actor and a tireless advocate for Parkinson's research.<br><br>Your participation could take several valuable forms:<ul><li>Contribute alongside distinguished speakers like <b>Albert Bourla</b>, <b>Joaquin Duato</b>, <b>Thomas Schinecker</b>, <b>Yvonne Greenstreet</b> and <b>Dean Y. Li</b> at the Galien Forum</li><li>Lead the shift towards a patient-first approach at the Galien Patient Summit</li><li>Join the Awards Ceremony celebrating this year's winners</li><li>Discover the New Galien Innovation Hub featuring exclusive reverse pitch sessions where top investors and KOLs present to select startups</li><li>Join our esteemed Partners network</li></ul>{{pitch}}<br><br>Would {spin} EST work for a quick call? If not, I'm happy to accommodate your schedule.<br><br>Or feel free to book a time directly: <a href="https://galienfoundation.org/meetings/pgusa/partners">Schedule a meeting</a><br><br>With many thanks and kind regards,${SIG_FULL}`
  },

  // Step 3 - Email 2 (follow-up with resources)
  {
    pipeline: "forum", step: 3,
    subject: "RE : {{company}} - Invitation : 20th Prix Galien USA & 28th International Awards",
    html: `Dear {{salutationLastName}},<br><br>{{hook}}<br><br>I wanted to follow up with everything you need to explore a partnership for the <b>2026 Prix Galien USA</b>.<br><br><b>Key Information:</b><ul><li>Date: October 29, 2026</li><li>Venue: American Museum of Natural History, New York City</li><li>20th Anniversary Edition alongside the International Prix Galien</li><li>1,000+ C-suite executives, Nobel Laureates, global health leaders</li></ul><b>Partnership Opportunities:</b><ul><li>Contribute to the Galien Forum USA or the Galien Patient Summit</li><li>Participate in the new Galien Innovation Hub (reverse pitch sessions with top investors and KOLs)</li><li>Recognition at the Awards Ceremony</li><li>Access to our Partners network</li></ul><b>Resources:</b><ul><li>2025 Attendees & Speakers: <a href="https://hubs.ly/Q03Df16x0">View here</a></li><li>Media Kit: <a href="https://hubs.ly/Q03_gJ2v0">View here</a></li></ul>I would be happy to walk you through the options or answer any questions.<br><br>With many thanks and kind regards,${SIG_FULL}`
  },

  // Step 4 - Email 3 (kind reminder - no change needed, but suggest cleaner version)
  {
    pipeline: "forum", step: 4,
    subject: "RE : {{company}} - Invitation : 20th Prix Galien USA & 28th International Awards",
    html: "[PAS DE CHANGEMENT] Le 'Kind reminder' est deja bon tel quel. Template minimaliste volontaire."
  },

  // Step 5 - LinkedIn 1
  {
    pipeline: "forum", step: 5,
    subject: "(LinkedIn message)",
    html: `Dear {{salutationLastName}}, thank you for connecting.<br><br>I would be pleased to share more details about the Prix Galien USA, an initiative I volunteer alongside our Forum Co-Chairs, Kenneth C. Frazier, Retired Chairman and CEO, Merck & Co, Dr. Michael Rosenblatt, Member, Harvard Board of Overseers; Advisory Partner, Ascenta Capital & Flagship Pioneering, and the Galien Foundation.<br><br>Under the legacy of Professor Elie Wiesel - Honorary Founding President, Peace Nobel Laureate - the Galien Foundation is guided by the conviction that science and innovation must always serve people with dignity, compassion, and justice. At the heart of our mission, the Prix Galien - often referred to as the Nobel Prize of life sciences research - recognizes the most outstanding achievements in improving the human condition.<br><br>2026 will be an exceptional year: we are celebrating the 20th anniversary of the Prix Galien USA alongside the International Prix Galien, bringing together all worldwide winners from the past two years.<br><br>{{hook}}<br><br>We deeply value {{company}}'s leadership and would be grateful to explore how we might welcome you into this year's program.<br><br>If it's relevant and if you are available, I would be delighted to discuss with you and answer your questions.<br><br>With many thanks and warm regards,<br><br>Edouard`
  },

  // Step 6 - LinkedIn 2
  {
    pipeline: "forum", step: 6,
    subject: "(LinkedIn message)",
    html: `{{salutationLastName}},<br><br>{{hook}}<br><br>I would be happy to share more details or our resources (attendees list, media kit, partnership guide) if helpful.<br><br>Warm regards,`
  },

  // Step 7 - LinkedIn 3
  {
    pipeline: "forum", step: 7,
    subject: "(LinkedIn message)",
    html: "[PAS DE CHANGEMENT] Le 'Kind reminder :)' est volontairement court."
  },

  // Step 8 - Journey (:journeypartners) - add Greenstreet + Li to speakers
  {
    pipeline: "forum", step: 8,
    subject: "Prix Galien USA 2026 - Partnership Opportunities",
    html: `Dear [Salutation] [Last Name],<br><br>Thank you for reaching out.<br><br>I am pleased to share more details about the Prix Galien USA, an initiative I volunteer alongside our Forum Co-Chairs, <b>Kenneth C. Frazier</b>, Retired Chairman and CEO, Merck & Co., Inc., and <b>Dr. Michael Rosenblatt</b>, Member, Harvard Board of Overseers; Advisory Partner, Ascenta Capital & Flagship Pioneering, and the Galien Foundation.<br><br>Under the legacy of <b>Professor Elie Wiesel</b> - Honorary Founding President, Peace Nobel Laureate, and Holocaust survivor - the Galien Foundation is guided by the conviction that science and innovation must always serve people with dignity, compassion, and justice. At the heart of this mission, the Prix Galien - often referred to as the Nobel Prize of life sciences research - recognizes the most outstanding achievements in improving the human condition.<br><br><b>2026 will be an exceptional year:</b> we are celebrating the <b>20th anniversary of the Prix Galien USA</b> alongside the <b>International Prix Galien</b>, bringing together all worldwide winners from the past two years. We already have confirmations that <b>Albert Bourla</b> (Pfizer), <b>Joaquin Duato</b> (J&J), <b>Thomas Schinecker</b> (Roche), <b>Yvonne Greenstreet</b> (Alnylam) and <b>Dean Y. Li</b> (Merck) will be joining us at the Forum.<br><br><b>Past speakers and board members include:</b><ul><li>Dr. Eric Topol (Scripps Research Translational Institute)</li><li>Dr. Paul Stoffels (Galapagos)</li><li>Dr. Robert Califf (Former FDA Commissioner)</li></ul>We deeply value [Company]'s leadership and would be delighted to explore how we might welcome you into this year's program. To help you get a sense of the scope and the experience, please find enclosed:<ul><li><a href="https://www.calameo.com/read/005925913f6d00c3bc70b">Media Kit 2026</a></li><li>Last year's programs: <a href="https://www.galienfoundation.org/galien-forum-usa-2025-program">Forum</a> (keynote delivered by FDA Commissioner Marty Makary) | <a href="https://www.galienfoundation.org/galien-patient-summit-usa-2025-program">Patient Summit</a></li><li>List of 2025 Attendees (download for Excel format): <a href="https://www.calameo.com/read/005925913571f0f32d21d">Forum</a> | <a href="https://www.calameo.com/read/005925913489cedd473a8">Patient Summit</a></li><li>Partnership Guide: <a href="https://www.calameo.com/read/00592591362d875db33c5">Forum</a> | <a href="https://www.calameo.com/read/0059259136d1fb091381d">GPS</a></li></ul>If it's relevant and if you are available, I would be delighted to discuss with you and answer your questions. Would you be available on [date/time] EST for a call?<br><br>With many thanks and kind regards,${SIG}`
  },

  // Step 9 - FU Journey (from scratch)
  {
    pipeline: "forum", step: 9,
    subject: "Re: Prix Galien USA 2026",
    html: `Dear [Salutation] [Last Name],<br><br>I wanted to follow up on my previous email regarding the <b>20th anniversary of the Prix Galien USA</b> on October 29th in New York City.<br><br>We have recently confirmed that <b>Albert Bourla</b> (Pfizer), <b>Joaquin Duato</b> (J&J), <b>Thomas Schinecker</b> (Roche), <b>Yvonne Greenstreet</b> (Alnylam) and <b>Dean Y. Li</b> (Merck) will be joining us at the Forum.<br><br>I remain available should you wish to discuss partnership opportunities.<br><br>Warm regards,${SIG}`
  },

  // Step 10 - After Meeting (from scratch)
  {
    pipeline: "forum", step: 10,
    subject: "Following up - Prix Galien USA 2026 Partnership",
    html: `Dear [First Name],<br><br>It was a great pleasure speaking with you. Thank you for your time today.<br><br>As discussed, please find enclosed detailed information regarding the Prix Galien USA 2026:<ul><li><a href="https://www.calameo.com/read/00592591362d875db33c5">Partnership Guide - Forum</a></li><li><a href="https://www.calameo.com/read/0059259136d1fb091381d">Partnership Guide - GPS</a></li><li><a href="https://www.calameo.com/read/005925913f6d00c3bc70b">Media Kit 2026</a></li><li>Last year's programs: <a href="https://www.galienfoundation.org/galien-forum-usa-2025-program">Forum</a> (keynote delivered by FDA Commissioner Marty Makary) | <a href="https://www.galienfoundation.org/galien-patient-summit-usa-2025-program">Patient Summit</a></li><li>List of 2025 Attendees (download for Excel format): <a href="https://www.calameo.com/read/005925913571f0f32d21d">Forum</a> | <a href="https://www.calameo.com/read/005925913489cedd473a8">Patient Summit</a></li><li>The Prix Galien USA - <a href="https://www.calameo.com/read/0059259136d41de620578">Today's presentation</a></li></ul>As mentioned, I remain available for any additional questions, and to review your submission.<br><br>With many thanks and kind regards,${SIG}`
  },

  // Step 11 - FU After Meeting (from scratch)
  {
    pipeline: "forum", step: 11,
    subject: "Re: Following up - Prix Galien USA 2026 Partnership",
    html: `Dear [First Name],<br><br>I wanted to follow up on our recent conversation regarding a partnership for the <b>Prix Galien USA 2026</b>.<br><br>Please don't hesitate to reach out if you have any questions about the partnership options or if you'd like to discuss next steps.<br><br>I remain available at your convenience.<br><br>Warm regards,${SIG}`
  }
];

(async () => {
  console.log(`Pushing ${suggestions.length} suggestions...`);
  for (let i = 0; i < suggestions.length; i++) {
    const s = suggestions[i];
    try {
      const res = await push(s);
      console.log(`  [${i+1}/${suggestions.length}] Step ${s.step} -> queued (${res.queued})`);
    } catch (err) {
      console.error(`  [${i+1}] FAILED step ${s.step}: ${err.message}`);
    }
  }
  console.log('Done!');
})();
