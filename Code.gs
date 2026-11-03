/**
 * Rang Pahadi Studio: Google Sheets backend for the studio website (version 2).
 *
 * The website reads workshops, gallery photos and reviews from this Sheet,
 * and saves bookings, waitlist names, gift vouchers, reviews and group
 * enquiries into it. Emails go to students (confirmation + reminder) and to you.
 *
 * Upgrading from version 1? Paste this whole file over the old one, run
 * "setup" once (your data is kept), then Deploy > Manage deployments >
 * edit (pencil) > Version: New version > Deploy. The web app URL stays the same.
 */

const TAB = { W: 'Workshops', B: 'Bookings', S: 'Settings', O: 'Overview', V: 'Vouchers', C: 'Coupons', L: 'Waitlist', R: 'Reviews', E: 'Enquiries' };

const HEAD = {
  Workshops: ['ID', 'Title', 'Category', 'Date', 'Start time', 'Duration (min)', 'Seats', 'Price (₹)', 'Price label', 'Level', 'Description', 'Status', 'Photo', 'Title (Hindi)', 'Description (Hindi)'],
  Bookings: ['Booking ID', 'Created', 'Workshop ID', 'Workshop', 'Workshop date', 'Name', 'Phone', 'Seats', 'Amount (₹)', 'Note', 'Source', 'Paid', 'Status', 'Email', 'Code used', 'Discount (₹)', 'Reminder sent'],
  Vouchers: ['Code', 'Created', 'Type', 'Price (₹)', 'Value (₹)', 'Balance (₹)', 'Buyer', 'Buyer phone', 'Buyer email', 'For', 'Message', 'Paid', 'Status'],
  Coupons: ['Code', 'Type', 'Value', 'Valid until', 'Max uses', 'Used', 'Active', 'Note'],
  Waitlist: ['Created', 'Workshop ID', 'Workshop', 'Workshop date', 'Name', 'Phone', 'Seats', 'Contacted'],
  Reviews: ['Created', 'Name', 'Workshop', 'Rating', 'Review', 'Show on website'],
  Enquiries: ['Created', 'Name', 'Phone', 'Email', 'Organisation', 'Type', 'People', 'Preferred date', 'Message', 'Handled'],
};
const CATEGORIES = ['Traditional Indian art', 'Painting & drawing', 'Mixed media & texture', 'Candle making', 'Handicrafts', 'Kids'];
const NEW_TAGLINE = "Hands-on art workshops in the Doon valley: Aipan, painting, texture art, candle making, block printing and kids' classes. All materials included.";
const NEW_TAGLINE_HI = 'दून घाटी में हाथों से कला सीखिए: ऐपण, पेंटिंग, टेक्सचर आर्ट, मोमबत्ती बनाना, ठप्पा छपाई और बच्चों की कक्षाएँ। सारी सामग्री शामिल।';
const PUBLIC_SETTINGS = ['name', 'tagline', 'taglineHi', 'city', 'address', 'hours', 'whatsapp', 'upi', 'upiName', 'email', 'about', 'aboutHi',
  'artistName', 'artistRole', 'artistBio', 'artistQuote', 'mapsUrl', 'googleReviewUrl', 'voucherAmounts', 'passPrice', 'passValue', 'siteUrl', 'parking', 'cancelPolicy', 'instagram'];

/* ================================================================ web */

function doGet() {
  try { return json_(publicData_(true)); }
  catch (err) { return json_({ ok: false, error: 'server', message: String(err) }); }
}

function doPost(e) {
  let d;
  try { d = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: 'bad_request' }); }
  if (d.website) return json_({ ok: true, id: 'RP-OK', amount: 0 }); // spam bot trap
  const act = String(d.action || 'book');
  try {
    if (act === 'book') return json_(book_(d));
    if (act === 'checkCode') return json_(checkCode_(d));
    if (act === 'waitlist') return json_(waitlist_(d));
    if (act === 'voucher') return json_(voucher_(d));
    if (act === 'review') return json_(review_(d));
    if (act === 'enquiry') return json_(enquiry_(d));
    return json_({ ok: false, error: 'unknown_action' });
  } catch (err) {
    return json_({ ok: false, error: 'server', message: 'Something went wrong. Please try again or message us on WhatsApp.' });
  }
}

/* ============================================================ actions */

function book_(d) {
  const wid = clean_(d.workshopId, 40), name = clean_(d.name, 80), phone = phone_(d.phone);
  const email = email_(d.email), note = clean_(d.note, 300), seats = Math.floor(Number(d.seats));
  const code = clean_(d.code, 30).toUpperCase();
  if (!wid || !name) return { ok: false, error: 'missing', message: 'Please add your name.' };
  if (phone.replace(/\D/g, '').length < 10) return { ok: false, error: 'phone', message: 'Please add a 10-digit mobile number.' };
  if (!(seats >= 1 && seats <= 10)) return { ok: false, error: 'seats', message: 'Choose between 1 and 10 seats.' };

  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const data = publicData_(false);
    const w = data.workshops.find(x => x.id === wid);
    if (!w || w.status === 'cancelled') return { ok: false, error: 'not_found', message: 'This workshop is no longer open for booking.' };
    const left = w.seats - w.booked;
    if (seats > left) return { ok: false, error: 'full', left: Math.max(0, left), message: left > 0 ? `Only ${left} seat${left > 1 ? 's are' : ' is'} left.` : 'This workshop is fully booked.' };

    const gross = seats * w.price;
    let discount = 0, codeLabel = '';
    if (code) {
      const c = evalCode_(code, gross);
      if (!c.ok) return c;
      discount = c.discount; codeLabel = c.label;
      c.commit(); // count the coupon use / deduct the voucher balance
    }
    const amount = Math.max(0, gross - discount);
    const id = 'RP-' + Utilities.getUuid().replace(/-/g, '').slice(0, 6).toUpperCase();
    const sh = sheet_(TAB.B);
    appendByHeader_(sh, {
      'Booking ID': id, 'Created': new Date(), 'Workshop ID': wid, 'Workshop': w.title, 'Workshop date': w.date,
      'Name': name, 'Phone': "'" + phone, 'Seats': seats, 'Amount (₹)': amount, 'Note': note, 'Source': 'Website',
      'Paid': amount === 0, 'Status': 'Confirmed', 'Email': email, 'Code used': code, 'Discount (₹)': discount,
    });
    sh.getRange(sh.getLastRow(), colOf_(sh, 'Paid')).insertCheckboxes().setValue(amount === 0);

    const settings = readSettings_();
    notifyOwner_(settings, `New booking ${id}: ${w.title}`,
      `${name} (${phone}${email ? ', ' + email : ''}) booked ${seats} seat(s) for ${w.title} on ${w.date} at ${w.start}.\n` +
      `Amount: ₹${amount}${discount ? ` (₹${discount} off with ${code})` : ''}\nNote: ${note || '-'}`);
    if (email) sendBookingEmail_(settings, { id, w, name, email, seats, amount, discount, code }, false);
    return { ok: true, id, amount, discount, codeLabel };
  } finally { lock.releaseLock(); }
}

function checkCode_(d) {
  const code = clean_(d.code, 30).toUpperCase(), amount = Number(d.amount) || 0;
  if (!code) return { ok: false, error: 'code', message: 'Enter a code.' };
  const c = evalCode_(code, amount);
  if (!c.ok) return c;
  return { ok: true, discount: c.discount, label: c.label };
}

/** Looks up a coupon or gift voucher. Returns {ok, discount, label, commit()} or {ok:false, message}. */
function evalCode_(code, amount) {
  const tz = tz_(), today = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  // Coupons
  const cs = sheet_(TAB.C), crows = readTable_(cs);
  const ci = crows.findIndex(r => String(r['Code']).trim().toUpperCase() === code);
  if (ci >= 0) {
    const r = crows[ci];
    if (r['Active'] !== true) return { ok: false, error: 'code', message: 'This code is not active.' };
    const until = fmtDate_(r['Valid until'], tz);
    if (until && until < today) return { ok: false, error: 'code', message: 'This code has expired.' };
    const used = Number(r['Used']) || 0, max = Number(r['Max uses']) || 0;
    if (max && used >= max) return { ok: false, error: 'code', message: 'This code has been fully used.' };
    const pct = String(r['Type']).includes('%'), val = Number(r['Value']) || 0;
    const discount = Math.min(amount, Math.round(pct ? amount * val / 100 : val));
    return { ok: true, discount, label: pct ? `${val}% off` : `₹${val} off`,
      commit: () => cs.getRange(ci + 2, colOf_(cs, 'Used')).setValue(used + 1) };
  }
  // Gift vouchers and workshop passes
  const vs = sheet_(TAB.V), vrows = readTable_(vs);
  const vi = vrows.findIndex(r => String(r['Code']).trim().toUpperCase() === code);
  if (vi >= 0) {
    const r = vrows[vi];
    if (r['Paid'] !== true) return { ok: false, error: 'code', message: 'This voucher becomes active once its payment is confirmed by the studio.' };
    if (String(r['Status']).toLowerCase() === 'cancelled') return { ok: false, error: 'code', message: 'This voucher is no longer valid.' };
    const bal = Number(r['Balance (₹)']) || 0;
    if (bal <= 0) return { ok: false, error: 'code', message: 'This voucher has no balance left.' };
    const discount = Math.min(amount, bal);
    return { ok: true, discount, label: `${r['Type'] || 'Voucher'} · ₹${bal} balance`,
      commit: () => vs.getRange(vi + 2, colOf_(vs, 'Balance (₹)')).setValue(bal - discount) };
  }
  return { ok: false, error: 'code', message: 'We couldn’t find that code. Check the spelling.' };
}

function waitlist_(d) {
  const wid = clean_(d.workshopId, 40), name = clean_(d.name, 80), phone = phone_(d.phone), seats = Math.max(1, Math.min(10, Math.floor(Number(d.seats)) || 1));
  if (!name || phone.replace(/\D/g, '').length < 10) return { ok: false, error: 'missing', message: 'Please add your name and a 10-digit mobile number.' };
  const w = publicData_(false).workshops.find(x => x.id === wid);
  appendByHeader_(sheet_(TAB.L), { 'Created': new Date(), 'Workshop ID': wid, 'Workshop': w ? w.title : wid, 'Workshop date': w ? w.date : '', 'Name': name, 'Phone': "'" + phone, 'Seats': seats, 'Contacted': false });
  const sh = sheet_(TAB.L); sh.getRange(sh.getLastRow(), colOf_(sh, 'Contacted')).insertCheckboxes();
  notifyOwner_(readSettings_(), `Waitlist: ${w ? w.title : wid}`, `${name} (${phone}) wants ${seats} seat(s) if one opens up.`);
  return { ok: true };
}

function voucher_(d) {
  const s = readSettings_();
  const kind = d.kind === 'pass' ? 'Workshop pass' : 'Gift voucher';
  const name = clean_(d.name, 80), phone = phone_(d.phone), email = email_(d.email);
  if (!name || phone.replace(/\D/g, '').length < 10) return { ok: false, error: 'missing', message: 'Please add your name and a 10-digit mobile number.' };
  let price, value;
  if (kind === 'Workshop pass') { price = Number(s.passPrice) || 5000; value = Number(s.passValue) || 6000; }
  else {
    let allowed = String(s.voucherAmounts || '').split(/[\s,;\/|]+/).map(Number).filter(n => n >= 100 && n <= 100000);
    if (!allowed.length) allowed = [1000, 1500, 2000, 3000];
    price = value = Math.floor(Number(d.amount));
    if (!(price >= 500 && price <= 50000)) return { ok: false, error: 'amount', message: 'Choose a voucher amount.' };
    if (!allowed.includes(price) && price % 100) return { ok: false, error: 'amount', message: 'Choose a voucher amount.' };
  }
  const code = (kind === 'Workshop pass' ? 'PASS-' : 'GIFT-') + Utilities.getUuid().replace(/-/g, '').slice(0, 5).toUpperCase();
  const sh = sheet_(TAB.V);
  appendByHeader_(sh, { 'Code': code, 'Created': new Date(), 'Type': kind, 'Price (₹)': price, 'Value (₹)': value, 'Balance (₹)': value,
    'Buyer': name, 'Buyer phone': "'" + phone, 'Buyer email': email, 'For': clean_(d.forName, 80), 'Message': clean_(d.message, 300), 'Paid': false, 'Status': 'Awaiting payment' });
  sh.getRange(sh.getLastRow(), colOf_(sh, 'Paid')).insertCheckboxes();
  notifyOwner_(s, `New ${kind} ${code}`, `${name} (${phone}) ordered a ${kind} worth ₹${value} for ₹${price}.\nWhen the UPI payment arrives, tick Paid in the Vouchers sheet to activate it.`);
  return { ok: true, code, price, value, kind };
}

function review_(d) {
  const name = clean_(d.name, 60), text = clean_(d.review, 600), rating = Math.max(1, Math.min(5, Math.round(Number(d.rating)) || 5));
  if (!name || text.length < 5) return { ok: false, error: 'missing', message: 'Please add your name and a few words.' };
  const sh = sheet_(TAB.R);
  appendByHeader_(sh, { 'Created': new Date(), 'Name': name, 'Workshop': clean_(d.workshop, 100), 'Rating': rating, 'Review': text, 'Show on website': false });
  sh.getRange(sh.getLastRow(), colOf_(sh, 'Show on website')).insertCheckboxes();
  notifyOwner_(readSettings_(), `New review from ${name}`, `${rating}/5 · ${text}\n\nTick "Show on website" in the Reviews sheet to publish it.`);
  return { ok: true };
}

function enquiry_(d) {
  const name = clean_(d.name, 80), phone = phone_(d.phone);
  if (!name || phone.replace(/\D/g, '').length < 10) return { ok: false, error: 'missing', message: 'Please add your name and a 10-digit mobile number.' };
  const row = { 'Created': new Date(), 'Name': name, 'Phone': "'" + phone, 'Email': email_(d.email), 'Organisation': clean_(d.org, 100), 'Type': clean_(d.type, 40),
    'People': Math.max(0, Math.floor(Number(d.people)) || 0), 'Preferred date': clean_(d.date, 40), 'Message': clean_(d.message, 600), 'Handled': false };
  const sh = sheet_(TAB.E); appendByHeader_(sh, row); sh.getRange(sh.getLastRow(), colOf_(sh, 'Handled')).insertCheckboxes();
  notifyOwner_(readSettings_(), `Group enquiry: ${row.Type || 'Event'} for ${row.People || '?'} people`,
    `${name} (${phone}${row.Email ? ', ' + row.Email : ''})\nOrganisation: ${row.Organisation || '-'}\nPreferred date: ${row['Preferred date'] || '-'}\n\n${row.Message || ''}`);
  return { ok: true };
}

/* =============================================================== data */

function publicData_(withExtras) {
  const tz = tz_();
  const settings = readSettings_();
  const booked = {};
  readTable_(sheet_(TAB.B)).forEach(b => {
    if (String(b['Status']).toLowerCase() === 'cancelled') return;
    const k = String(b['Workshop ID']).trim();
    booked[k] = (booked[k] || 0) + (Number(b['Seats']) || 0);
  });
  const today = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  const workshops = readTable_(sheet_(TAB.W))
    .filter(w => String(w['ID']).trim() && String(w['Title']).trim())
    .map(w => {
      const id = String(w['ID']).trim();
      return {
        id, title: String(w['Title']).trim(), titleHi: String(w['Title (Hindi)'] || '').trim(),
        category: String(w['Category'] || '').trim(),
        date: fmtDate_(w['Date'], tz), start: fmtTime_(w['Start time'], tz),
        durationMins: Number(w['Duration (min)']) || 0, seats: Number(w['Seats']) || 0, price: Number(w['Price (₹)']) || 0,
        unit: String(w['Price label'] || 'per person').trim(), level: String(w['Level'] || '').trim(),
        description: String(w['Description'] || '').trim(), descriptionHi: String(w['Description (Hindi)'] || '').trim(),
        photo: photoUrl_(w['Photo']),
        status: String(w['Status'] || 'Open').trim().toLowerCase() === 'cancelled' ? 'cancelled' : 'open',
        booked: booked[id] || 0,
      };
    })
    .filter(w => w.date && w.date >= today)
    .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));

  const pub = {}; PUBLIC_SETTINGS.forEach(k => { pub[k] = settings[k] || ''; });
  const out = { ok: true, settings: pub, workshops, updated: new Date().toISOString() };
  if (withExtras) {
    out.reviews = readTable_(sheet_(TAB.R)).filter(r => r['Show on website'] === true && String(r['Review']).trim())
      .map(r => ({ name: String(r['Name']).trim(), workshop: String(r['Workshop'] || '').trim(), rating: Number(r['Rating']) || 5, review: String(r['Review']).trim() }))
      .reverse().slice(0, 12);
    out.gallery = gallery_(settings.galleryFolderId);
    out.artworks = gallery_(settings.artworkFolderId);
  }
  return out;
}

/** Photos from the Google Drive folder named in Settings > galleryFolderId (newest first, max 24). */
function gallery_(folderRef) {
  const id = driveId_(folderRef);
  if (!id) return [];
  const cache = CacheService.getScriptCache(), key = 'gallery-' + id;
  const hit = cache.get(key); if (hit) return JSON.parse(hit);
  const list = [];
  try {
    const it = DriveApp.getFolderById(id).getFiles();
    while (it.hasNext()) {
      const f = it.next();
      if (!/^image\//.test(f.getMimeType())) continue;
      try { if (f.getSharingAccess() !== DriveApp.Access.ANYONE_WITH_LINK) f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
      const caption = (f.getDescription() || f.getName().replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ')).trim();
      list.push({ id: f.getId(), caption, t: f.getDateCreated().getTime() });
    }
  } catch (e) { return []; }
  list.sort((a, b) => b.t - a.t);
  const out = list.slice(0, 24).map(x => ({ thumb: `https://drive.google.com/thumbnail?id=${x.id}&sz=w800`, full: `https://drive.google.com/thumbnail?id=${x.id}&sz=w1800`, caption: /^(img|dsc|image|photo|whatsapp image)\b|^\d+$/i.test(x.caption) ? '' : x.caption }));
  cache.put(key, JSON.stringify(out), 900);
  return out;
}

function photoUrl_(v) {
  const s = String(v || '').trim();
  if (!s) return '';
  const id = driveId_(s);
  if (id && /drive\.google|docs\.google/.test(s)) return `https://drive.google.com/thumbnail?id=${id}&sz=w1000`;
  return /^https:\/\//.test(s) ? s : '';
}
function driveId_(s) {
  s = String(s || '').trim(); if (!s) return '';
  const m = s.match(/\/d\/([\w-]{20,})/) || s.match(/[?&]id=([\w-]{20,})/) || s.match(/folders\/([\w-]{20,})/);
  if (m) return m[1];
  return /^[\w-]{20,}$/.test(s) ? s : '';
}

/* ============================================================== email */

function sendBookingEmail_(s, b, reminder) {
  const studio = s.name || 'Rang Pahadi Studio';
  const when = `${prettyDate_(b.w.date)} at ${prettyTime_(b.w.start)}`;
  const cal = calendarLink_(b.w, s);
  const subject = reminder ? `Reminder: ${b.w.title} is tomorrow, ${prettyTime_(b.w.start)}` : `Booking confirmed: ${b.w.title} (${b.id})`;
  const lines = [
    `Hi ${b.name},`, '',
    reminder ? `See you tomorrow at ${studio}!` : `Thank you for booking with ${studio}.`, '',
    `Workshop: ${b.w.title}`, `When: ${when} (${b.w.durationMins} min)`, `Seats: ${b.seats}`, `Booking ID: ${b.id}`,
    `Amount: ₹${b.amount}${b.discount ? ` (₹${b.discount} off with ${b.code})` : ''}`,
    s.address ? `Where: ${s.address}` : '',
    '', (!reminder && b.amount > 0 && s.upi) ? `Please pay by UPI to ${s.upi} to confirm your seat, and send a screenshot on WhatsApp${s.whatsapp ? ' to ' + s.whatsapp : ''}.` : '',
    `Add it to your calendar: ${cal}`,
    s.mapsUrl ? `Directions: ${s.mapsUrl}` : (s.address ? `Directions: https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(s.address)}` : ''),
    '', 'All materials are included. Wear clothes you don’t mind getting a little paint on.', '', `See you soon,`, studio,
  ].filter((l, i, a) => !(l === '' && a[i - 1] === ''));
  const opts = { name: studio };
  if (s.email) opts.replyTo = s.email;
  MailApp.sendEmail(b.email, subject, lines.join('\n'), opts);
}

/** Runs every morning: emails a reminder to everyone booked for tomorrow. */
function sendReminders() {
  const s = readSettings_(), tz = tz_();
  const tomorrow = Utilities.formatDate(new Date(Date.now() + 864e5), tz, 'yyyy-MM-dd');
  const ws = publicData_(false).workshops.filter(w => w.date === tomorrow && w.status !== 'cancelled');
  if (!ws.length) return;
  const sh = sheet_(TAB.B), rows = readTable_(sh), col = colOf_(sh, 'Reminder sent');
  rows.forEach((r, i) => {
    const w = ws.find(x => x.id === String(r['Workshop ID']).trim());
    const email = email_(r['Email']);
    if (!w || !email || r['Reminder sent'] || String(r['Status']).toLowerCase() === 'cancelled') return;
    try {
      sendBookingEmail_(s, { id: r['Booking ID'], w, name: r['Name'], email, seats: Number(r['Seats']) || 1, amount: Number(r['Amount (₹)']) || 0, discount: 0 }, true);
      sh.getRange(i + 2, col).setValue(new Date());
    } catch (e) {}
  });
}

function notifyOwner_(s, subject, body) {
  if (!s.notifyEmail) return;
  try { MailApp.sendEmail(s.notifyEmail, subject, body + '\n\nOpen your Google Sheet to see all details.'); } catch (e) {}
}

function calendarLink_(w, s) {
  const d = w.date.replace(/-/g, ''), [h, m] = w.start.split(':').map(Number);
  const startM = h * 60 + m, endM = startM + (w.durationMins || 120);
  const t = x => String(Math.floor(x / 60)).padStart(2, '0') + String(x % 60).padStart(2, '0') + '00';
  return 'https://calendar.google.com/calendar/render?action=TEMPLATE' +
    '&text=' + encodeURIComponent(`${w.title} · ${s.name || 'Rang Pahadi Studio'}`) +
    `&dates=${d}T${t(startM)}/${d}T${t(Math.min(endM, 1439))}&ctz=Asia/Kolkata` +
    '&location=' + encodeURIComponent(s.address || 'Dehradun') +
    '&details=' + encodeURIComponent('All materials included. Booked at ' + (s.siteUrl || 'our website') + '.');
}

/* ============================================================ helpers */

function sheet_(name) { return SpreadsheetApp.getActive().getSheetByName(name); }
function tz_() { return SpreadsheetApp.getActive().getSpreadsheetTimeZone() || 'Asia/Kolkata'; }

function readTable_(sh) {
  if (!sh || sh.getLastRow() < 2) return [];
  const v = sh.getRange(1, 1, sh.getLastRow(), sh.getLastColumn()).getValues();
  const head = v[0].map(h => String(h).trim());
  return v.slice(1).map(r => Object.fromEntries(head.map((h, i) => [h, r[i]])));
}

function readSettings_() {
  const sh = sheet_(TAB.S), out = {};
  if (!sh || sh.getLastRow() < 2) return out;
  sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues().forEach(([k, v]) => { if (String(k).trim()) out[String(k).trim()] = String(v).trim(); });
  return out;
}

function colOf_(sh, name) {
  const head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(h => String(h).trim());
  const i = head.indexOf(name); if (i < 0) throw new Error('Missing column ' + name + ' in ' + sh.getName() + '. Run setup.');
  return i + 1;
}

function appendByHeader_(sh, obj) {
  const head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(h => String(h).trim());
  sh.appendRow(head.map(h => (h in obj ? obj[h] : '')));
}

function fmtDate_(v, tz) {
  if (v instanceof Date) return Utilities.formatDate(v, tz, 'yyyy-MM-dd');
  const s = String(v || '').trim();
  const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return s;
}
function fmtTime_(v, tz) {
  if (v instanceof Date) return Utilities.formatDate(v, tz, 'HH:mm');
  const s = String(v || '').trim().toUpperCase();
  const m = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/);
  if (!m) return s;
  let h = Number(m[1]);
  if (m[3] === 'PM' && h < 12) h += 12;
  if (m[3] === 'AM' && h === 12) h = 0;
  return String(h).padStart(2, '0') + ':' + (m[2] || '00');
}
function prettyDate_(iso) { const [y, m, d] = iso.split('-').map(Number); return Utilities.formatDate(new Date(y, m - 1, d, 12), 'Asia/Kolkata', 'EEEE, d MMMM'); }
function prettyTime_(t) { const [h, m] = t.split(':').map(Number); return ((h % 12) || 12) + (m ? ':' + String(m).padStart(2, '0') : '') + (h >= 12 ? ' PM' : ' AM'); }
function clean_(s, max) { return String(s || '').replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max); }
function phone_(s) { return String(s || '').replace(/[^\d+]/g, '').slice(0, 15); }
function email_(s) { const e = String(s || '').trim().slice(0, 120); return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : ''; }
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

/* ========================================================== sheet UX */

function onEdit(e) {
  const sh = e.range.getSheet();
  if (sh.getName() !== TAB.W || e.range.getRow() < 2) return;
  for (let r = e.range.getRow(); r <= e.range.getLastRow(); r++) {
    const idCell = sh.getRange(r, 1), title = sh.getRange(r, 2).getValue();
    if (!idCell.getValue() && String(title).trim()) idCell.setValue('w' + Date.now().toString(36) + (r % 10));
  }
}

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Studio')
    .addItem('Set up / upgrade sheets', 'setup')
    .addItem('Send tomorrow’s reminders now', 'sendReminders')
    .addToUi();
}

/* ============================================================== setup */

/** Run once (and again after upgrading). Creates missing tabs and columns; never deletes your data. */
function setup() {
  const ss = SpreadsheetApp.getActive();
  ss.setSpreadsheetTimeZone('Asia/Kolkata');

  const w = ensure_(ss, TAB.W, HEAD.Workshops);
  if (w.getLastRow() < 2) {
    const rows = [
      ['w01', 'Aipan Art (Kumaoni folk)', 'Traditional Indian art', '2026-11-07', '11:00', 150, 12, 1200, 'per person', 'Beginner · Ages 14+', 'Learn the geru-and-rice-paste patterns of Kumaon and paint your own Aipan plate.', 'Open'],
      ['w02', 'Texture Art on Canvas', 'Mixed media & texture', '2026-11-08', '11:00', 180, 12, 1800, 'per person', 'Beginner', 'Build raised floral textures with modelling paste and palette knives on a 12×12 canvas.', 'Open'],
      ['w03', 'Acrylic Paint & Sip', 'Painting & drawing', '2026-11-08', '17:00', 150, 16, 1500, 'per person', 'No experience needed', 'A guided Mussoorie sunset painting with mocktails. Good for friends and date nights.', 'Open'],
      ['w04', "Kids' Art Club (4 Saturdays)", 'Kids', '2026-11-14', '10:00', 90, 15, 3000, 'per child / month', 'Ages 6–12', 'Drawing, colour and craft every Saturday in November. Screen-free and messy.', 'Open'],
      ['w05', 'Candle Making: Scented Soy Candles', 'Candle making', '2026-11-15', '11:00', 150, 12, 1500, 'per person', 'Beginner · Ages 12+', 'Pour two scented soy candles in glass jars and decorate a pillar candle to take home.', 'Open'],
      ['w06', 'Block Printing on Tote', 'Handicrafts', '2026-11-21', '11:00', 150, 12, 1500, 'per person', 'All levels', 'Hand-block print a cotton tote with traditional wooden blocks and fabric colours.', 'Open'],
    ];
    w.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  }
  w.getRange('D2:D').setNumberFormat('yyyy-mm-dd');
  w.getRange('E2:E').setNumberFormat('HH:mm');
  w.getRange('H2:H').setNumberFormat('₹#,##0');
  w.getRange('C2:C').setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(CATEGORIES, true).build());
  w.getRange('L2:L').setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['Open', 'Cancelled'], true).build());
  w.setColumnWidth(2, 260); w.setColumnWidth(11, 380);
  note_(w, 'Photo', 'Paste a Google Drive share link (set to "Anyone with the link") or any https image link. It shows on the workshop card.');

  const b = ensure_(ss, TAB.B, HEAD.Bookings);
  b.getRange('B2:B').setNumberFormat('dd mmm yyyy, hh:mm');
  b.getRange('I2:I').setNumberFormat('₹#,##0');
  b.getRange('C2:C').setDataValidation(SpreadsheetApp.newDataValidation().requireValueInRange(w.getRange('A2:A'), true).build());
  b.getRange('K2:K').setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['Website', 'WhatsApp', 'Phone', 'Walk-in', 'Instagram', 'Party / group'], true).build());
  b.getRange('M2:M').setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['Confirmed', 'Cancelled'], true).build());
  b.getRange('L2:L500').insertCheckboxes();

  const s = ensure_(ss, TAB.S, ['Key', 'Value', 'What it is']);
  const defaults = [
    ['name', 'Rang Pahadi Studio', 'Studio name'],
    ['tagline', NEW_TAGLINE, 'Short line under the name'],
    ['taglineHi', NEW_TAGLINE_HI, 'Tagline in Hindi (for the हिं button)'],
    ['city', 'Dehradun · Uttarakhand', 'Shown above the name'],
    ['address', '', 'Studio address (also used for the map and directions)'],
    ['hours', 'Tue–Sun, 10 AM–7 PM', 'Opening hours'],
    ['whatsapp', '', '10-digit WhatsApp number for bookings'],
    ['upi', '', 'UPI ID students pay to (used for the payment QR code)'],
    ['upiName', 'Rang Pahadi Studio', 'Name shown in the UPI app when paying'],
    ['email', '', 'Studio email shown on the site; replies to booking emails go here'],
    ['about', "Rang Pahadi Studio is a hands-on art studio in Dehradun, started by an artist who grew up with the colours of the hills. Many people say they \"can't draw\". The studio is here to prove them wrong, one afternoon at a time.\n\nWe teach the folk art of Uttarakhand and India, like Aipan, alongside painting, texture art, mixed media, candle making and block printing. Every workshop is guided step by step, all materials are included, and you take home something you made yourself.\n\nCome alone, bring friends, or bring the kids. Our studio is a calm, messy and welcoming place to slow down and make something.", 'About us story (blank line between paragraphs)'],
    ['aboutHi', '', 'Optional: About us story in Hindi'],
    ['artistName', 'Akanksha Singhal', 'Artist name'],
    ['artistRole', 'Founder & lead artist', 'Artist role'],
    ['artistBio', 'Akanksha Singhal is a Dehradun-based artist working across painting, mixed media, texture art and traditional Indian folk forms. She started Rang Pahadi Studio to share the joy of making art with anyone who walks in, from first-timers to practising artists.', 'Artist bio'],
    ['artistQuote', 'Everyone can make art. Most people just need a table, good materials and an afternoon.', 'A line in the artist’s words'],
    ['notifyEmail', '', 'Your email: get an email for every booking, voucher, review and enquiry'],
    ['galleryFolderId', '', 'Link of a Google Drive folder with workshop photos (shows as the gallery)'],
    ['mapsUrl', '', 'Optional: your Google Maps link (otherwise the address is used)'],
    ['googleReviewUrl', '', 'Optional: your Google review link (from Google Business Profile)'],
    ['voucherAmounts', '1000, 1500, 2000, 3000', 'Gift voucher amounts, separated by a comma and a space'],
    ['passPrice', '5000', 'Workshop pass: what the buyer pays (₹)'],
    ['passValue', '6000', 'Workshop pass: credit they get to spend (₹)'],
    ['siteUrl', '', 'Your website address, used in emails'],
    ['parking', '', 'Optional: parking / how to find us, shown in the FAQ'],
    ['cancelPolicy', '', 'Optional: your cancellation rule, shown in the FAQ (default: free date change up to 48 hours before)'],
    ['instagram', '', 'Your Instagram handle (e.g. rangpahadi) or profile link'],
    ['artworkFolderId', '', 'Link of a Google Drive folder with YOUR artwork (the Gallery section). Caption = file description, e.g. "Monsoon Aipan · Acrylic on canvas · ₹4,500"'],
  ];
  const have = new Set(s.getLastRow() > 1 ? s.getRange(2, 1, s.getLastRow() - 1, 1).getValues().map(r => String(r[0]).trim()) : []);
  const add = defaults.filter(r => !have.has(r[0]));
  if (add.length) s.getRange(s.getLastRow() + 1, 1, add.length, 3).setValues(add);
  // Google Sheets turns "1000,1500" into one big number: keep the amounts as text.
  const keys = s.getRange(2, 1, s.getLastRow() - 1, 2).getValues();
  keys.forEach((r, i) => {
    if (String(r[0]).trim() !== 'voucherAmounts') return;
    const ok = String(r[1]).split(/[\s,;\/|]+/).map(Number).filter(n => n >= 100 && n <= 100000).length;
    if (!ok || typeof r[1] === 'number') s.getRange(i + 2, 2).setNumberFormat('@').setValue('1000, 1500, 2000, 3000');
  });
  s.setColumnWidth(1, 140); s.setColumnWidth(2, 520); s.setColumnWidth(3, 360);
  s.getRange('B2:B').setWrap(true);

  const v = ensure_(ss, TAB.V, HEAD.Vouchers);
  v.getRange('B2:B').setNumberFormat('dd mmm yyyy'); v.getRange('D2:F').setNumberFormat('₹#,##0');
  v.getRange('M2:M').setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['Awaiting payment', 'Active', 'Cancelled'], true).build());

  const c = ensure_(ss, TAB.C, HEAD.Coupons);
  if (c.getLastRow() < 2) c.getRange(2, 1, 2, 8).setValues([['EARLYBIRD', '%', 10, '', 50, 0, false, 'Example: 10% off. Tick Active to switch it on.'], ['FRIEND200', '₹', 200, '', '', 0, false, 'Example: ₹200 off for referrals']]);
  c.getRange('B2:B').setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['%', '₹'], true).build());
  c.getRange('D2:D').setNumberFormat('yyyy-mm-dd');
  c.getRange('G2:G200').insertCheckboxes();

  ensure_(ss, TAB.L, HEAD.Waitlist).getRange('A2:A').setNumberFormat('dd mmm yyyy, hh:mm');
  const r = ensure_(ss, TAB.R, HEAD.Reviews); r.getRange('A2:A').setNumberFormat('dd mmm yyyy'); r.setColumnWidth(5, 420);
  const e = ensure_(ss, TAB.E, HEAD.Enquiries); e.getRange('A2:A').setNumberFormat('dd mmm yyyy, hh:mm'); e.setColumnWidth(9, 360);

  const o = ensure_(ss, TAB.O, ['Date', 'Workshop', 'Seats', 'Booked', 'Left', 'Fill', 'Booked revenue', 'Paid']);
  o.getRange('A2').setFormula('=ARRAYFORMULA(IF(Workshops!A2:A="",,Workshops!D2:D))');
  o.getRange('B2').setFormula('=ARRAYFORMULA(IF(Workshops!A2:A="",,Workshops!B2:B))');
  o.getRange('C2').setFormula('=ARRAYFORMULA(IF(Workshops!A2:A="",,Workshops!G2:G))');
  o.getRange('D2').setFormula('=ARRAYFORMULA(IF(Workshops!A2:A="",,SUMIFS(Bookings!H:H,Bookings!C:C,Workshops!A2:A,Bookings!M:M,"<>Cancelled")))');
  o.getRange('E2').setFormula('=ARRAYFORMULA(IF(Workshops!A2:A="",,C2:C-D2:D))');
  o.getRange('F2').setFormula('=ARRAYFORMULA(IF(Workshops!A2:A="",,IFERROR(D2:D/C2:C,0)))');
  o.getRange('G2').setFormula('=ARRAYFORMULA(IF(Workshops!A2:A="",,SUMIFS(Bookings!I:I,Bookings!C:C,Workshops!A2:A,Bookings!M:M,"<>Cancelled")))');
  o.getRange('H2').setFormula('=ARRAYFORMULA(IF(Workshops!A2:A="",,SUMIFS(Bookings!I:I,Bookings!C:C,Workshops!A2:A,Bookings!L:L,TRUE,Bookings!M:M,"<>Cancelled")))');
  o.getRange('A2:A').setNumberFormat('ddd d mmm'); o.getRange('F2:F').setNumberFormat('0%'); o.getRange('G2:H').setNumberFormat('₹#,##0');

  // Daily reminder emails at about 9 AM
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'sendReminders').forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('sendReminders').timeBased().atHour(9).everyDays(1).inTimezone('Asia/Kolkata').create();

  const first = ss.getSheets()[0];
  if (first.getName() === 'Sheet1' && first.getLastRow() === 0) ss.deleteSheet(first);
}

/** Creates the tab if missing; adds any missing header columns at the end. Keeps existing data. */
function ensure_(ss, name, head) {
  let sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); }
  const lastCol = Math.max(1, sh.getLastColumn());
  const existing = sh.getLastRow() ? sh.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h).trim()) : [];
  if (!existing.filter(Boolean).length) {
    sh.getRange(1, 1, 1, head.length).setValues([head]);
  } else {
    const missing = head.filter(h => !existing.includes(h));
    if (missing.length) sh.getRange(1, existing.filter(Boolean).length + 1, 1, missing.length).setValues([missing]);
  }
  sh.getRange(1, 1, 1, sh.getLastColumn()).setFontWeight('bold').setBackground('#f6e6df');
  sh.setFrozenRows(1);
  return sh;
}
function note_(sh, header, text) { try { sh.getRange(1, colOf_(sh, header)).setNote(text); } catch (e) {} }
