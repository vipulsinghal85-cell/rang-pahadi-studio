/* Rang Pahadi Studio website (v2). Reads workshops, gallery and reviews from the Google Sheet (via Apps Script) and sends bookings, vouchers, reviews and enquiries to it. */
(() => {
'use strict';
const CFG = window.STUDIO_CONFIG || {};
const API = String(CFG.SHEET_API_URL || '').trim();
const CACHE_KEY = 'rp-studio-cache-v2';
const CATS = ['Traditional Indian art','Painting & drawing','Mixed media & texture','Candle making','Handicrafts','Kids'];

const S = { settings:{}, workshops:[], gallery:[], artworks:[], reviews:[], loaded:false, error:false, demo:!API, cat:'All', updated:null, lang:'en' };
try { S.lang = localStorage.getItem('rp-lang') === 'hi' ? 'hi' : 'en'; } catch {}

/* ---------------------------------------------------------------- words */
const I18N = {
  en: {
    nav_workshops:'Workshops', nav_gallery:'Gallery', nav_gift:'Gift', nav_about:'About us', nav_faq:'FAQ', nav_visit:'Visit', lang_btn:'हिं',
    see_all:'See all workshops', about_us:'About us', find_btn:'Find my workshop', parties:'Parties & groups', explore:'Explore', everything:'Everything',
    facts:['Batches of 10–16','All materials included','Take your art home'], next_ws:'Next workshop',
    seats_left:(l,t)=>`${l} of ${t} seats left`, full:'Fully booked', book:'Book a seat', waitlist:'Join waitlist', cancelled:'Cancelled',
    upcoming:'Upcoming workshops', scheduled:n=>`${n} scheduled`, not_sure:'Not sure which one to pick?',
    loading:'Loading upcoming workshops…', none_cat:'No upcoming workshops of this type. Try another one.', none:'New workshop dates are coming soon. Message us on WhatsApp to hear first.',
    make_label:'What you’ll make',
    gallery_h:'Made at Rang Pahadi', gallery_sub:'Real work by our students, straight from the studio table.',
    try_h:'Try Aipan right here', try_sub:'Draw with your finger or mouse. Every line is mirrored around the centre, the way Aipan patterns are built.',
    mirror:'Mirror', fine:'Fine line', thick:'Thick line', dots:'Dots', guide:'Guide', undo:'Undo', clear:'Clear', save:'Save image', share:'Share',
    try_cta:'Liked it? Learn real Aipan with us.',
    reviews_h:'What students say', reviews_none:'Be the first to share your experience.', write_review:'Write a review', google_review:'Review us on Google',
    gift_h:'Give the gift of art', gift_sub:'For birthdays, Diwali, Rakhi or just because.',
    voucher:'Gift voucher', voucher_d:'Any amount, good for any workshop. You get a voucher card ready to send.',
    pass:'Workshop pass', pass_d:(p,v)=>`Pay ${p}, get ${v} to spend on any workshops. Best value for regulars.`, buy:'Buy now', from:'from',
    about_eyebrow:'About us', about_h:['A studio rooted in the ','hills',', open to everyone'],
    pillars:[['Rooted in Uttarakhand','Aipan and pahadi colours sit beside modern mixed media.'],['No experience needed','Every session starts from the basics. You leave with a finished piece.'],['Small batches','10–16 people, so the artist can guide every student.']],
    meet:'Meet the artist',
    groups_h:'Parties & groups', groups_d:'Birthdays, kitty parties, bachelorettes, school visits and team offsites. Private sessions at the studio or at your venue, from 8 people.', enquire:'Send an enquiry', ask_wa:'Ask on WhatsApp',
    visit_h:'Visit & pay', visit_d:'Book a seat here, then pay by UPI to confirm it. All materials are included in the price.', studio:'Studio', hours:'Hours', email:'Email', upi:'UPI ID', directions:'Get directions',
    name:'Your name', mobile:'Mobile number', email_opt:'Email (for your confirmation and reminder)', seats:'Seats', note:'Note', note_ph:'Anything we should know? (optional)',
    code:'Gift voucher or coupon code', apply:'Apply', subtotal:'Subtotal', discount:'Discount', total:'Total (materials included)', confirm:'Confirm booking', booking:'Booking…',
    close:'Close', cancel:'Cancel', send_wa:'Send on WhatsApp', copy:'Copy', copied:'Copied',
    received:'Booking received', see_you:'See you at the studio!', booking_id:'Booking ID', to_pay:'Amount to pay', scan_pay:'Scan with any UPI app to pay', open_upi:'Pay with UPI app',
    add_cal:'Add to Google Calendar', send_ss:'Send payment screenshot', email_sent:'A confirmation is on its way to your email.', screenshot:'Take a screenshot of this for your records.', done:'Done', nothing_to_pay:'Nothing to pay: your code covers it.',
    err_name:'Please add your name.', err_phone:'Please add a 10-digit mobile number so the studio can reach you.', err_generic:'That didn’t go through. Check your connection and try again, or send it on WhatsApp.',
  },
  hi: {
    nav_workshops:'कार्यशालाएँ', nav_gallery:'गैलरी', nav_gift:'उपहार', nav_about:'हमारे बारे में', nav_faq:'सवाल', nav_visit:'पता', lang_btn:'EN',
    see_all:'सभी कार्यशालाएँ देखें', about_us:'हमारे बारे में', find_btn:'मेरी कार्यशाला खोजें', parties:'पार्टी और ग्रुप', explore:'देखें', everything:'सब',
    facts:['10–16 लोगों के बैच','सारी सामग्री शामिल','अपनी कला घर ले जाएँ'], next_ws:'अगली कार्यशाला',
    seats_left:(l,t)=>`${t} में से ${l} सीटें बाकी`, full:'सभी सीटें भर गईं', book:'सीट बुक करें', waitlist:'प्रतीक्षा सूची में जुड़ें', cancelled:'रद्द',
    upcoming:'आने वाली कार्यशालाएँ', scheduled:n=>`${n} कार्यशालाएँ`, not_sure:'तय नहीं कर पा रहे?',
    loading:'कार्यशालाएँ आ रही हैं…', none_cat:'इस तरह की कोई कार्यशाला अभी नहीं है। दूसरी देखें।', none:'नई तारीखें जल्द आएँगी। सबसे पहले जानने के लिए WhatsApp करें।',
    make_label:'आप क्या बनाएँगे',
    gallery_h:'रंग पहाड़ी में बना', gallery_sub:'हमारे विद्यार्थियों का असली काम, सीधे स्टूडियो की मेज़ से।',
    try_h:'यहीं ऐपण बनाकर देखिए', try_sub:'उँगली या माउस से बनाइए। हर रेखा बीच से चारों ओर दोहराई जाती है, जैसे ऐपण बनता है।',
    mirror:'दर्पण', fine:'पतली रेखा', thick:'मोटी रेखा', dots:'बिंदु', guide:'गाइड', undo:'वापस', clear:'साफ़ करें', save:'तस्वीर सेव करें', share:'शेयर करें',
    try_cta:'पसंद आया? हमारे साथ असली ऐपण सीखिए।',
    reviews_h:'विद्यार्थी क्या कहते हैं', reviews_none:'अपना अनुभव साझा करने वाले पहले व्यक्ति बनिए।', write_review:'समीक्षा लिखें', google_review:'Google पर समीक्षा दें',
    gift_h:'कला का उपहार दीजिए', gift_sub:'जन्मदिन, दिवाली, राखी या बस यूँ ही।',
    voucher:'गिफ़्ट वाउचर', voucher_d:'कोई भी राशि, किसी भी कार्यशाला के लिए। भेजने के लिए तैयार वाउचर कार्ड मिलेगा।',
    pass:'वर्कशॉप पास', pass_d:(p,v)=>`${p} दीजिए, ${v} की कार्यशालाएँ कीजिए। नियमित आने वालों के लिए सबसे अच्छा।`, buy:'अभी खरीदें', from:'शुरू',
    about_eyebrow:'हमारे बारे में', about_h:['पहाड़ों की ','गोद',' में, सबके लिए खुला स्टूडियो'],
    pillars:[['उत्तराखंड से जुड़ा','ऐपण और पहाड़ी रंग, आधुनिक मिक्स्ड मीडिया के साथ।'],['अनुभव ज़रूरी नहीं','हर सत्र शुरुआत से। आप पूरी कलाकृति लेकर जाते हैं।'],['छोटे बैच','10–16 लोग, ताकि कलाकार हर किसी को सिखा सके।']],
    meet:'कलाकार से मिलिए',
    groups_h:'पार्टी और ग्रुप', groups_d:'जन्मदिन, किटी पार्टी, स्कूल विज़िट और ऑफ़िस टीम। स्टूडियो में या आपकी जगह पर, 8 लोगों से।', enquire:'पूछताछ भेजें', ask_wa:'WhatsApp पर पूछें',
    visit_h:'पता और भुगतान', visit_d:'यहाँ सीट बुक करें, फिर UPI से भुगतान करके पक्का करें। सारी सामग्री कीमत में शामिल है।', studio:'स्टूडियो', hours:'समय', email:'ईमेल', upi:'UPI ID', directions:'रास्ता देखें',
    name:'आपका नाम', mobile:'मोबाइल नंबर', email_opt:'ईमेल (पुष्टि और याद दिलाने के लिए)', seats:'सीटें', note:'नोट', note_ph:'कुछ बताना चाहें? (वैकल्पिक)',
    code:'गिफ़्ट वाउचर या कूपन कोड', apply:'लगाएँ', subtotal:'कुल', discount:'छूट', total:'कुल राशि (सामग्री शामिल)', confirm:'बुकिंग पक्की करें', booking:'बुक हो रहा है…',
    close:'बंद करें', cancel:'रद्द करें', send_wa:'WhatsApp पर भेजें', copy:'कॉपी', copied:'कॉपी हो गया',
    received:'बुकिंग मिल गई', see_you:'स्टूडियो में मिलते हैं!', booking_id:'बुकिंग ID', to_pay:'भुगतान राशि', scan_pay:'किसी भी UPI ऐप से स्कैन करके भुगतान करें', open_upi:'UPI ऐप से भुगतान करें',
    add_cal:'Google Calendar में जोड़ें', send_ss:'भुगतान का स्क्रीनशॉट भेजें', email_sent:'पुष्टि आपके ईमेल पर आ रही है।', screenshot:'इसका स्क्रीनशॉट रख लें।', done:'ठीक है', nothing_to_pay:'कुछ भुगतान नहीं करना: आपका कोड पूरा कवर करता है।',
    err_name:'कृपया अपना नाम लिखें।', err_phone:'कृपया 10 अंकों का मोबाइल नंबर लिखें।', err_generic:'भेजा नहीं जा सका। कनेक्शन देखकर फिर कोशिश करें या WhatsApp पर भेजें।',
  }
};
const t = (k, ...a) => { const v = (I18N[S.lang] && I18N[S.lang][k] !== undefined) ? I18N[S.lang][k] : I18N.en[k]; return typeof v === 'function' ? v(...a) : v; };
const CAT_HI = {'Traditional Indian art':'पारंपरिक भारतीय कला','Painting & drawing':'चित्रकला','Mixed media & texture':'मिक्स्ड मीडिया और टेक्सचर','Candle making':'मोमबत्ती बनाना','Handicrafts':'हस्तशिल्प','Kids':'बच्चे'};
const catName = c => S.lang === 'hi' ? (CAT_HI[c] || c) : c;
const wTitle = w => (S.lang === 'hi' && w.titleHi) ? w.titleHi : w.title;
const wDesc = w => (S.lang === 'hi' && w.descriptionHi) ? w.descriptionHi : w.description;
const wUnit = w => (S.lang === 'hi' && (!w.unit || w.unit === 'per person')) ? 'प्रति व्यक्ति' : (w.unit || 'per person');

/* ------------------------------------------------------------ sample data */
function sampleData(){
  const base = new Date(); base.setHours(0,0,0,0);
  const day = n => { const d = new Date(base); d.setDate(d.getDate()+n); return iso(d); };
  const w = (id,title,category,n,start,durationMins,seats,price,unit,level,description,booked) => ({id,title,category,date:day(n),start,durationMins,seats,price,unit,level,description,status:'open',booked,photo:''});
  return {
    settings:{ name:'Rang Pahadi Studio', city:'Dehradun · Uttarakhand', hours:'Tue–Sun, 10 AM–7 PM', whatsapp:CFG.WHATSAPP||'', voucherAmounts:'1000,1500,2000,3000', passPrice:'5000', passValue:'6000', upiName:'Rang Pahadi Studio',
      tagline:"Hands-on art workshops in the Doon valley: Aipan, painting, texture art, candle making, block printing and kids' classes. All materials included.",
      taglineHi:'दून घाटी में हाथों से कला सीखिए: ऐपण, पेंटिंग, टेक्सचर आर्ट, मोमबत्ती बनाना, ठप्पा छपाई और बच्चों की कक्षाएँ। सारी सामग्री शामिल।',
      about:"Rang Pahadi Studio is a hands-on art studio in Dehradun, started by an artist who grew up with the colours of the hills. Many people say they \"can't draw\". The studio is here to prove them wrong, one afternoon at a time.\n\nWe teach the folk art of Uttarakhand and India, like Aipan, alongside painting, texture art, mixed media, candle making and block printing. Every workshop is guided step by step, all materials are included, and you take home something you made yourself.",
      artistName:'Akanksha Singhal', artistRole:'Founder & lead artist',
      artistBio:'Akanksha Singhal is a Dehradun-based artist working across painting, mixed media, texture art and traditional Indian folk forms. She started Rang Pahadi Studio to share the joy of making art with anyone who walks in, from first-timers to practising artists.',
      artistQuote:'Everyone can make art. Most people just need a table, good materials and an afternoon.' },
    workshops:[
      w('s1','Aipan Art (Kumaoni folk)','Traditional Indian art',5,'11:00',150,12,1200,'per person','Beginner · Ages 14+','Learn the geru-and-rice-paste patterns of Kumaon and paint your own Aipan plate.',4),
      w('s2','Texture Art on Canvas','Mixed media & texture',6,'11:00',180,12,1800,'per person','Beginner','Build raised floral textures with modelling paste and palette knives on a 12×12 canvas.',9),
      w('s3','Acrylic Paint & Sip','Painting & drawing',6,'17:00',150,16,1500,'per person','No experience needed','A guided Mussoorie sunset painting with mocktails. Good for friends and date nights.',6),
      w('s4',"Kids' Art Club (4 Saturdays)",'Kids',12,'10:00',90,15,3000,'per child / month','Ages 6–12','Drawing, colour and craft every Saturday. Screen-free and messy.',3),
      w('s5','Candle Making: Scented Soy Candles','Candle making',13,'11:00',150,12,1500,'per person','Beginner · Ages 12+','Pour two scented soy candles in glass jars and decorate a pillar candle to take home.',10),
      w('s6','Block Printing on Tote','Handicrafts',19,'11:00',150,12,1500,'per person','All levels','Hand-block print a cotton tote with traditional wooden blocks and fabric colours.',2),
    ], gallery:[], reviews:[]
  };
}

/* ---------------------------------------------------------------- helpers */
function el(tag, attrs, ...kids){
  const n = document.createElement(tag);
  if (attrs) for (const [k,v] of Object.entries(attrs)){
    if (v == null || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else if (k === 'html') n.innerHTML = v;
    else n.setAttribute(k, v === true ? (k.startsWith('aria-') ? 'true' : '') : v);
  }
  for (const k of kids.flat()){ if (k == null || k === false) continue; n.append(k.nodeType ? k : document.createTextNode(String(k))); }
  return n;
}
const iso = d => d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const inr = n => '₹' + Number(n||0).toLocaleString('en-IN');
const todayISO = () => iso(new Date());
const parseD = s => { const [y,m,d] = (s||'').split('-').map(Number); return new Date(y,(m||1)-1,d||1); };
const loc = () => S.lang === 'hi' ? 'hi-IN' : 'en-IN';
const fmtDay = s => parseD(s).toLocaleDateString(loc(),{weekday:'short',day:'numeric',month:'short'});
const fmtMonth = s => parseD(s).toLocaleDateString(loc(),{month:'short'});
const fmtTime = tm => { if(!tm) return ''; const [h,m] = tm.split(':').map(Number); return ((h%12)||12)+(m?':'+String(m).padStart(2,'0'):'')+' '+(h>=12?'PM':'AM'); };
const fmtDur = mins => { mins=Number(mins)||0; const h=Math.floor(mins/60), m=mins%60; return (h?h+' h':'')+(m?(h?' ':'')+m+' min':''); };
const digits = s => String(s||'').replace(/\D/g,'');
const studioName = () => S.settings.name || 'Rang Pahadi Studio';
function toast(msg){ const x = el('div',{class:'toast',role:'status'},msg); document.body.append(x); setTimeout(()=>x.remove(),2600); }
async function copyText(text, btn){
  try { await navigator.clipboard.writeText(text); toast(t('copied')); }
  catch { const r = document.createRange(); r.selectNodeContents(btn.previousSibling || btn); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }
}
function waNumber(){ const n = digits(S.settings.whatsapp || CFG.WHATSAPP); if(!n) return ''; return n.length===10 ? '91'+n : n; }
function waLink(text){ const n = waNumber(); return n ? 'https://wa.me/'+n+'?text='+encodeURIComponent(text) : null; }
const seatsLeft = w => Math.max(0, (Number(w.seats)||0) - (Number(w.booked)||0));
const upcoming = () => S.workshops.filter(w => w.date >= todayISO()).sort((a,b)=>(a.date+a.start).localeCompare(b.date+b.start));
const voucherList = () => { const a = String(S.settings.voucherAmounts||'').split(/[\s,;\/|]+/).map(Number).filter(n => n >= 100 && n <= 100000); return a.length ? a : [1000,1500,2000,3000]; };
const siteUrl = () => S.settings.siteUrl || (location.origin + location.pathname);
function copyChip(text){
  const b = el('button',{type:'button',class:'btn btn-ghost btn-sm',onclick:e=>copyText(text,e.currentTarget)},t('copy'));
  return el('span',{class:'copy'}, el('span',null,text), b);
}
async function api(action, data){
  const res = await fetch(API, {method:'POST', headers:{'Content-Type':'text/plain;charset=utf-8'}, body: JSON.stringify({action, ...data})});
  return res.json();
}
function upiLink(amount, note){
  const pa = (S.settings.upi||'').trim(); if (!pa) return null;
  return `upi://pay?pa=${encodeURIComponent(pa)}&pn=${encodeURIComponent(S.settings.upiName || studioName())}&am=${Number(amount).toFixed(2)}&cu=INR&tn=${encodeURIComponent(note)}`;
}
function qrSvg(text, size){
  if (typeof window.qrcode !== 'function') return null;
  const q = window.qrcode(0, 'M'); q.addData(text); q.make();
  const box = el('div',{class:'qr-box',html:q.createSvgTag({cellSize:4, margin:2, scalable:true})});
  box.style.width = box.style.height = size + 'px';
  return box;
}
function calLink(w){
  const d = w.date.replace(/-/g,''), [h,m] = w.start.split(':').map(Number);
  const s = h*60+m, e = Math.min(s + (w.durationMins||120), 1439);
  const f = x => String(Math.floor(x/60)).padStart(2,'0') + String(x%60).padStart(2,'0') + '00';
  return 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(`${w.title} · ${studioName()}`) +
    `&dates=${d}T${f(s)}/${d}T${f(e)}&ctz=Asia/Kolkata&location=` + encodeURIComponent(S.settings.address || 'Dehradun') +
    '&details=' + encodeURIComponent('All materials included. ' + siteUrl());
}
const isPhone = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

/* ---------------------------------------------------- themes & motifs */
const THEMES = {
  'Traditional Indian art': {band:'#9b3a22', motif:'aipan',   sub:'folk art of Kumaon and beyond',      subHi:'कुमाऊँ और देश की लोक कला', deva:'लोक कला'},
  'Painting & drawing':     {band:'#2b4a7a', motif:'brush',   sub:'paint the light of the Doon valley',  subHi:'दून घाटी की रोशनी रंगिए', deva:'चित्रकला'},
  'Mixed media & texture':  {band:'#86561a', motif:'texture', sub:'layers, textures and found things',   subHi:'परतें, बनावट और नए प्रयोग', deva:'मिश्रित कला'},
  'Candle making':          {band:'#4e3a63', motif:'flame',   sub:'wax, scent and a warm glow',          subHi:'मोम, खुशबू और गर्म रोशनी', deva:'मोमबत्ती'},
  'Handicrafts':            {band:'#2c5a50', motif:'block',   sub:'block prints, knots and bamboo',      subHi:'ठप्पा छपाई, गाँठें और बाँस', deva:'हस्तशिल्प'},
  'Kids':                   {band:'#8a2d60', motif:'kids',    sub:'messy, bright and screen-free',       subHi:'रंग-बिरंगा, मज़ेदार, स्क्रीन से दूर', deva:'बच्चों की कला'},
  default:                  {band:'#9b3a22', motif:'aipan',   sub:'art workshops from the hills',        subHi:'पहाड़ों से कला कार्यशालाएँ', deva:'रंग पहाड़ी'},
};
const wrapSVG = inner => `<svg viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="mclip"><circle cx="300" cy="300" r="290"/></clipPath></defs><g fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${inner}</g></svg>`;
const MOTIFS = {
  aipan(){
    const C = 300, T = Math.PI*2; let s = '';
    const pt = (r,a) => [(C+r*Math.cos(a)).toFixed(1), (C+r*Math.sin(a)).toFixed(1)];
    const dots = (r,n,size) => { for (let i=0;i<n;i++){ const [x,y]=pt(r,i/n*T); s+=`<circle cx="${x}" cy="${y}" r="${size}" fill="currentColor" stroke="none"/>`; } };
    [36,64,148,196,268,292].forEach(r => s += `<circle cx="${C}" cy="${C}" r="${r}"/>`);
    for (let i=0;i<8;i++){ const a=i/8*T, [x1,y1]=pt(8,a), [x2,y2]=pt(32,a-.22), [x3,y3]=pt(32,a+.22), [x4,y4]=pt(34,a); s+=`<path d="M${x1} ${y1} Q${x2} ${y2} ${x4} ${y4} Q${x3} ${y3} ${x1} ${y1}Z"/>`; }
    dots(50,16,3);
    for (let i=0;i<12;i++){ const a=i/12*T, [x1,y1]=pt(64,a), [x2,y2]=pt(146,a), [c1x,c1y]=pt(120,a-.3), [c2x,c2y]=pt(120,a+.3), [l1,l2]=pt(80,a), [l3,l4]=pt(128,a);
      s+=`<path d="M${x1} ${y1} Q${c1x} ${c1y} ${x2} ${y2} Q${c2x} ${c2y} ${x1} ${y1}Z"/><line x1="${l1}" y1="${l2}" x2="${l3}" y2="${l4}"/>`; }
    for (let i=0;i<12;i++){ const a=(i+.5)/12*T, [x,y]=pt(136,a); s+=`<circle cx="${x}" cy="${y}" r="4" fill="currentColor" stroke="none"/>`; }
    dots(172,36,2.6);
    const n=24, st=T/n;
    for (let i=0;i<n;i++){ const a=i*st, [x1,y1]=pt(196,a), [x2,y2]=pt(196,a+st), [cx,cy]=pt(262,a+st/2), [ix,iy]=pt(222,a+st/2);
      s+=`<path d="M${x1} ${y1} Q${cx} ${cy} ${x2} ${y2}"/><circle cx="${ix}" cy="${iy}" r="3.2" fill="currentColor" stroke="none"/>`; }
    dots(280,72,2.2);
    return wrapSVG(s);
  },
  brush(){
    let s=''; for (let r=40;r<=280;r+=34) s+=`<circle cx="300" cy="300" r="${r}" stroke-width="${(2+r/70).toFixed(1)}" stroke-dasharray="${(r*.9).toFixed(0)} ${(r*.25).toFixed(0)}" transform="rotate(${r*3} 300 300)"/>`;
    for (let i=0;i<36;i++){ const a=i/36*Math.PI*2, r1=i%2?286:270; s+=`<line x1="${(300+r1*Math.cos(a)).toFixed(1)}" y1="${(300+r1*Math.sin(a)).toFixed(1)}" x2="${(300+296*Math.cos(a)).toFixed(1)}" y2="${(300+296*Math.sin(a)).toFixed(1)}"/>`; }
    return wrapSVG(s+'<circle cx="300" cy="300" r="14" fill="currentColor" stroke="none"/>');
  },
  texture(){
    let s='', row=0; for (let y=10;y<=600;y+=30,row++) for (let x=(row%2?24:0);x<=624;x+=48) s+=`<path d="M${x-24} ${y} A24 24 0 0 1 ${x+24} ${y}"/>`;
    return wrapSVG(`<g clip-path="url(#mclip)" stroke-width="2">${s}</g><circle cx="300" cy="300" r="290"/>`);
  },
  wheel(){
    let d='M300 300'; for (let a=0;a<=Math.PI*22;a+=.08){ const r=4+a*4; d+=` L${(300+r*Math.cos(a)).toFixed(1)} ${(300+r*Math.sin(a)).toFixed(1)}`; }
    return wrapSVG(`<path d="${d}" stroke-width="2"/><circle cx="300" cy="300" r="290"/>`);
  },
  block(){
    let s=''; const buti=(x,y)=>{ let p=''; for(let k=0;k<4;k++){ const a=k*Math.PI/2, ex=(x+11*Math.cos(a)).toFixed(1), ey=(y+11*Math.sin(a)).toFixed(1); p+=`<ellipse cx="${ex}" cy="${ey}" rx="9" ry="5" transform="rotate(${k*90} ${ex} ${ey})"/>`; } return p+`<circle cx="${x}" cy="${y}" r="3.5" fill="currentColor" stroke="none"/>`; };
    for (let y=30;y<600;y+=60) for (let x=30;x<600;x+=60){ s+=buti(x,y); s+=`<circle cx="${x+30}" cy="${y+30}" r="2.5" fill="currentColor" stroke="none"/>`; }
    return wrapSVG(`<g clip-path="url(#mclip)" stroke-width="2">${s}</g><circle cx="300" cy="300" r="290"/><circle cx="300" cy="300" r="276" stroke-dasharray="2 10"/>`);
  },
  flame(){ // candle making: a flame with glow rings and small flames around
    const fl=(x,y,k,rot)=>`<path transform="translate(${x} ${y}) rotate(${rot}) scale(${k})" d="M0 -40 C18 -16 24 2 0 30 C-24 2 -18 -16 0 -40Z"/><path transform="translate(${x} ${y}) rotate(${rot}) scale(${k})" d="M0 -6 C8 6 8 14 0 22 C-8 14 -8 6 0 -6Z" fill="currentColor" stroke="none"/>`;
    let s=fl(300,290,3.2,0);
    [190,236,290].forEach((r,i)=>{ s+=`<circle cx="300" cy="300" r="${r}" stroke-dasharray="${i===1?'3 12':'none'}"/>`; });
    for (let i=0;i<12;i++){ const a=i/12*Math.PI*2-Math.PI/2; s+=fl((300+262*Math.cos(a)).toFixed(1),(300+262*Math.sin(a)).toFixed(1),.55,i*30); }
    for (let i=0;i<24;i++){ const a=(i+.5)/24*Math.PI*2; s+=`<circle cx="${(300+212*Math.cos(a)).toFixed(1)}" cy="${(300+212*Math.sin(a)).toFixed(1)}" r="3" fill="currentColor" stroke="none"/>`; }
    return wrapSVG(s+'<rect x="262" y="392" width="76" height="110" rx="8"/><line x1="262" y1="420" x2="338" y2="420"/>');
  },
  kids(){
    let s='', seed=7; const rnd=()=>{ seed=(seed*9301+49297)%233280; return seed/233280; };
    const star=(x,y,r)=>{ let p=''; for(let i=0;i<10;i++){ const a=-Math.PI/2+i*Math.PI/5, rr=i%2?r*.45:r; p+=(i?'L':'M')+(x+rr*Math.cos(a)).toFixed(1)+' '+(y+rr*Math.sin(a)).toFixed(1); } return `<path d="${p}Z"/>`; };
    for (let i=0;i<34;i++){ const x=40+rnd()*520, y=40+rnd()*520, k=i%4, z=14+rnd()*18;
      s += k===0 ? star(x,y,z) : k===1 ? `<path d="M${(x-z).toFixed(1)} ${y.toFixed(1)} q${(z/2).toFixed(1)} -${z.toFixed(1)} ${z.toFixed(1)} 0 t${z.toFixed(1)} 0"/>` : k===2 ? `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(z/2).toFixed(1)}"/>` : `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" fill="currentColor" stroke="none"/>`; }
    return wrapSVG(`<g clip-path="url(#mclip)">${s}</g><circle cx="300" cy="300" r="290" stroke-dasharray="14 12"/>`);
  },
};
const motifCache = {};
const motif = name => motifCache[name] || (motifCache[name] = MOTIFS[name]());

/* ============================================================ rendering */
function render(){
  const st = S.settings;
  document.documentElement.lang = S.lang;
  document.title = `${studioName()} · Art workshops in Dehradun`;
  document.getElementById('brandmini').textContent = studioName();
  document.querySelectorAll('[data-i18n]').forEach(n => { n.textContent = t(n.dataset.i18n); });
  const navGallery = document.querySelector('[data-i18n="nav_gallery"]'); if (navGallery) { navGallery.hidden = !(S.artworks.length || S.gallery.length || igUrl()); navGallery.setAttribute('href', (S.artworks.length || igUrl()) ? '#artwork' : '#gallery'); }

  const next = upcoming().find(w => w.status!=='cancelled' && (S.cat==='All' || w.category===S.cat));
  const picked = S.cat !== 'All';
  const theme = THEMES[picked ? S.cat : (next && next.category)] || THEMES.default;
  const words = picked ? theme : THEMES.default;
  const usedCats = CATS.filter(c => S.workshops.some(w => w.category===c));
  const groupWA = waLink(`Hi ${studioName()}! I'd like to know about private parties / group bookings.`);

  const hero = el('div',{style:`--band:${theme.band}`}, el('section',{class:'band'},
    el('div',{class:'mandala','aria-hidden':'true',html:motif(theme.motif)}),
    el('div',{class:'wrap hero'},
      el('div',null,
        el('img',{class:'hero-logo',src:'logo-512.png',alt:'',width:'132',height:'132'}),
        el('div',{class:'hero-top'}, el('span',{class:'eyebrow'}, picked ? catName(S.cat) : (st.city || 'Dehradun · Uttarakhand')), el('span',{class:'rule'}), el('span',{class:'deva',lang:'hi'},words.deva)),
        el('h1',null, studioName()),
        el('div',{class:'sub'}, S.lang==='hi' ? words.subHi : words.sub),
        el('p',{class:'lede'}, (S.lang==='hi' && st.taglineHi) ? st.taglineHi : (st.tagline || '')),
        el('ul',{class:'facts'}, t('facts').map(f => el('li',null,f))),
        el('div',{class:'hero-actions'},
          el('a',{class:'btn btn-onband',href:'#calendar'},t('see_all')),
          el('button',{type:'button',class:'btn btn-linkband',onclick:openQuiz},'✦ '+t('find_btn')),
          el('a',{class:'btn btn-linkband',href:'#groups'},t('parties'))),
        usedCats.length > 1 ? el('div',{class:'explore',role:'group','aria-label':t('explore')},
          el('span',{class:'eyebrow'},t('explore')),
          ['All',...usedCats].map(c => el('button',{type:'button','aria-pressed':S.cat===c,onclick:()=>{S.cat=c;render();}}, c==='All'?t('everything'):catName(c)))) : null
      ),
      nextTicket(next)
    )
  ), el('div',{class:'band-edge','aria-hidden':'true'}));

  const crafts = S.lang==='hi' ? ['ऐपण','पेंटिंग','टेक्सचर आर्ट','मोमबत्ती बनाना','ठप्पा छपाई','वॉटरकलर','पेंट एंड सिप','बच्चों का क्लब'] : ['Aipan','Painting','Texture art','Candle making','Block printing','Watercolour','Paint & sip','Kids’ art club'];
  const marquee = el('div',{class:'marquee','aria-label':crafts.join(', ')}, el('div',{class:'track','aria-hidden':'true'}, [...crafts,...crafts].map(c => el('span',null,c))));

  const list = upcoming().filter(w => S.cat==='All' || w.category===S.cat);
  const chips = el('div',{class:'chips',role:'group'}, ['All',...usedCats].map(c => el('button',{type:'button',class:'chip','aria-pressed':S.cat===c,onclick:()=>{S.cat=c;render();}}, c==='All'?t('everything'):catName(c))));
  let grid;
  if (!S.loaded) grid = el('div',{class:'empty'},t('loading'));
  else if (!list.length) grid = el('div',{class:'empty'}, S.workshops.length ? t('none_cat') : t('none'));
  else grid = el('div',{class:'grid'}, list.map(workshopCard));

  const notice = S.error && !S.workshops.length ? el('div',{class:'notice'},'The workshop calendar couldn’t load. Check your connection and refresh the page.')
    : S.error ? el('div',{class:'notice'},'Showing the last saved calendar. Seat counts may be out of date.') : null;

  document.getElementById('app').replaceChildren(...[
    S.demo ? el('div',{class:'demo'},'Sample calendar. Connect your Google Sheet in config.js to show real workshops (see README).') : null,
    festivalBanner(),
    hero, marquee,
    el('main',{class:'wrap',id:'calendar'},
      notice,
      el('div',{class:'section-head'}, el('h2',null,t('upcoming')),
        el('button',{type:'button',class:'quiz-link',onclick:openQuiz}, t('not_sure'),' ', el('b',null,t('find_btn')+' →'))),
      chips, grid,
      artworkSection(),
      gallerySection(),
      aipanSection(),
      reviewsSection(),
      giftSection(),
      faqSection(st),
      aboutSection(st),
      el('div',{class:'split',id:'groups'}, groupsPanel(groupWA), visitPanel(st))
    ),
    el('footer',null, el('div',{class:'wrap'},
      el('span',null, `© ${new Date().getFullYear()} ${studioName()} · ${st.city||'Dehradun, Uttarakhand'}`),
      igUrl() ? el('a',{class:'footer-ig',href:igUrl(),target:'_blank',rel:'noopener'}, igIcon(), ' ', igHandle()) : null,
      S.updated ? el('span',{class:'updated'}, 'Calendar updated '+new Date(S.updated).toLocaleString('en-IN',{day:'numeric',month:'short',hour:'numeric',minute:'2-digit'})) : null))
  ].filter(Boolean));
  updateStructuredData();
  waButton();
}

function seatMeter(w){
  const left = seatsLeft(w), total = Number(w.seats)||0, pct = total ? Math.round((total-left)/total*100) : 0;
  const full = left<=0, hot = !full && left <= Math.max(2, Math.ceil(total*0.25));
  return el('div',null,
    el('div',{class:'meter'+(hot||full?' hot':'')}, el('i',{style:`width:${pct}%`})),
    el('div',{class:'seats'+(full?' full':hot?' hot':''),style:'margin-top:5px'}, full ? t('full') : t('seats_left',left,total)));
}
function bookOrWait(w){
  if (w.status==='cancelled') return null;
  return seatsLeft(w) <= 0 ? el('button',{type:'button',class:'btn btn-ghost',onclick:()=>openWaitlist(w)},t('waitlist'))
                           : el('button',{type:'button',class:'btn btn-primary',onclick:()=>openBooking(w)},t('book'));
}
function dateBox(w){ const d = parseD(w.date); return el('div',{class:'datebox'}, el('b',null,d.getDate()), el('span',null,fmtMonth(w.date))); }

function nextTicket(w){
  if (!w) return el('aside',{class:'ticket'}, el('div',{class:'ticket-top'}, el('div',{class:'eyebrow'},t('next_ws')), el('h3',{style:'margin-top:10px'}, S.loaded ? 'New dates coming soon' : t('loading'))));
  return el('aside',{class:'ticket','aria-label':t('next_ws')},
    el('div',{class:'ticket-top'},
      el('div',{class:'eyebrow'},t('next_ws')),
      el('div',{class:'ticket-head'}, dateBox(w), el('div',{style:'min-width:0'}, el('div',{class:'cat'}, catName(w.category)), el('h3',null,wTitle(w)))),
      el('div',{class:'meta',style:'margin-top:10px'}, `${fmtDay(w.date)} · ${fmtTime(w.start)} · ${fmtDur(w.durationMins)}`)),
    el('div',{class:'ticket-perf'}),
    el('div',{class:'ticket-bottom'}, seatMeter(w),
      el('div',{class:'ticket-row'}, el('div',{class:'price'}, inr(w.price), ' ', el('small',null, wUnit(w))), bookOrWait(w))));
}

function workshopCard(w){
  const th = THEMES[w.category] || THEMES.default;
  const top = w.photo
    ? el('div',{class:'card-photo'}, el('img',{src:w.photo,alt:wTitle(w),loading:'lazy'}), el('span',{class:'card-photo-label'},t('make_label')))
    : el('div',{class:'card-band',style:`background:${th.band}`}, el('div',{class:'card-band-motif','aria-hidden':'true',html:motif(th.motif)}), el('span',{class:'deva'},th.deva));
  return el('article',{class:'card'+(w.photo?' has-photo':'')},
    top,
    el('div',{class:'card-body'},
      el('div',{class:'when'}, dateBox(w), el('div',{style:'min-width:0'}, el('div',{class:'cat'}, catName(w.category)), el('h3',null,wTitle(w)))),
      el('div',{class:'meta'}, `${fmtDay(w.date)} · ${fmtTime(w.start)} · ${fmtDur(w.durationMins)}${w.level?' · '+w.level:''}`),
      wDesc(w) ? el('p',{class:'desc'}, wDesc(w)) : null,
      w.status==='cancelled' ? el('span',{class:'pill bad'},t('cancelled')) : seatMeter(w),
      el('div',{class:'cardfoot'}, el('div',{class:'price'}, inr(w.price), ' ', el('small',null, wUnit(w))), bookOrWait(w))));
}

/* ------------------------------------------------------------ gallery */
function gallerySection(){
  if (!S.gallery.length) return null;
  return el('section',{class:'block',id:'gallery'},
    el('div',{class:'block-head'}, el('div',null, el('h2',null,t('gallery_h')), el('p',{class:'desc'},t('gallery_sub')))),
    el('div',{class:'gallery'}, S.gallery.map((g,i) => el('button',{type:'button',class:'g-item',onclick:()=>openLightbox(i, S.gallery),'aria-label':g.caption||'Photo'},
      el('img',{src:g.thumb,alt:g.caption||'',loading:'lazy'}), g.caption ? el('span',null,g.caption) : null))));
}
function openLightbox(i, list = S.gallery, isArt = false){
  const g = list[i]; if (!g) return;
  const go = d => openLightbox((i + d + list.length) % list.length, list, isArt);
  const info = isArt ? artInfo(g.caption) : {title:g.caption||'', price:''};
  const ask = isArt ? waLink(`Hi ${studioName()}! I love the artwork "${info.title || 'from your gallery'}". Is it available? ${g.full}`) : null;
  openModal(el('div',{class:'lightbox',role:'dialog','aria-modal':'true'},
    el('img',{src:g.full,alt:info.title||''}),
    el('div',{class:'lb-bar'}, el('button',{type:'button',class:'btn btn-ghost btn-sm',onclick:()=>go(-1),'aria-label':'Previous'},'←'),
      el('span',{class:'lb-cap'}, el('b',null,info.title||''), info.price ? el('span',{class:'art-price'}, info.price) : null),
      el('span',{class:'actions'},
        ask ? el('a',{class:'btn btn-primary btn-sm',href:ask,target:'_blank',rel:'noopener'}, info.price ? (S.lang==='hi'?'खरीदने के लिए पूछें':'Ask to buy') : (S.lang==='hi'?'इसके बारे में पूछें':'Ask about this piece')) : null,
        el('button',{type:'button',class:'btn btn-ghost btn-sm',onclick:()=>go(1),'aria-label':'Next'},'→'),
        el('button',{type:'button',class:'btn btn-ghost btn-sm',onclick:closeModal},t('close'))))), 'wide');
}

/* ----------------------------------------------- artist's own artwork */
function igHandle(){ const v = String(S.settings.instagram||'').trim(); if (!v) return ''; const m = v.match(/instagram\.com\/([A-Za-z0-9._]+)/i); return '@' + (m ? m[1] : v.replace(/^@/,'')); }
function igUrl(){ const h = igHandle(); return h ? 'https://www.instagram.com/' + h.slice(1) + '/' : ''; }
function igIcon(){ return el('span',{class:'ig-icon','aria-hidden':'true',html:'<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none"/></svg>'}); }
/* Caption from the Drive file description or name, e.g. "Monsoon Aipan · Acrylic on canvas · ₹4,500" */
function artInfo(caption){
  const parts = String(caption||'').split(/\s*[·|]\s*/).filter(Boolean);
  const pi = parts.findIndex(x => /₹|rs\.?\s*\d|^sold$/i.test(x));
  const price = pi >= 0 ? parts.splice(pi,1)[0].replace(/^rs\.?\s*/i,'₹') : '';
  return { title: parts[0] || '', detail: parts.slice(1).join(' · '), price: /^sold$/i.test(price) ? (S.lang==='hi'?'बिक गया':'Sold') : price };
}
function artworkSection(){
  const ig = igUrl(), artist = S.settings.artistName || '';
  if (!S.artworks.length && !ig) return null;
  const head = el('div',{class:'block-head'},
    el('div',null,
      el('div',{class:'eyebrow',style:'color:var(--geru);opacity:1'}, S.lang==='hi'?'गैलरी':'Gallery'),
      el('h2',null, artist ? (S.lang==='hi' ? `${artist} की कलाकृतियाँ` : `Artwork by ${artist}`) : (S.lang==='hi'?'हमारी कलाकृतियाँ':'Our artwork')),
      el('p',{class:'desc'}, S.lang==='hi'?'पेंटिंग, ऐपण, कैंडल और हस्तनिर्मित कृतियाँ। किसी भी तस्वीर पर टैप करके बड़ा देखें या खरीदने के लिए पूछें।':'Paintings, Aipan, candles and handmade pieces. Tap any piece to see it large or ask about buying it.')),
    ig ? el('a',{class:'btn btn-ghost ig-btn',href:ig,target:'_blank',rel:'noopener'}, igIcon(), ' ', igHandle()) : null);
  if (!S.artworks.length) return el('section',{class:'block',id:'artwork'}, head,
    el('a',{class:'ig-strip',href:ig,target:'_blank',rel:'noopener'}, igIcon(), el('span',null, S.lang==='hi'?'नई कलाकृतियाँ और कार्यशालाओं की झलक Instagram पर देखें':'See the latest artwork and workshop moments on Instagram'), el('b',null,'→')));
  return el('section',{class:'block',id:'artwork'}, head,
    el('div',{class:'art-grid'}, S.artworks.map((g,i) => { const a = artInfo(g.caption);
      return el('button',{type:'button',class:'art-item',onclick:()=>openLightbox(i, S.artworks, true),'aria-label':a.title||'Artwork'},
        el('img',{src:g.thumb,alt:a.title||'',loading:'lazy'}),
        (a.title || a.price) ? el('span',{class:'art-cap'}, el('span',null, el('b',null,a.title), a.detail ? el('small',null,a.detail) : null), a.price ? el('span',{class:'art-price'},a.price) : null) : null); })),
    ig ? el('a',{class:'ig-strip',href:ig,target:'_blank',rel:'noopener',style:'margin-top:16px'}, igIcon(), el('span',null, S.lang==='hi'?`और कलाकृतियाँ ${igHandle()} पर`:`More work and behind-the-scenes on ${igHandle()}`), el('b',null,'→')) : null);
}

/* ------------------------------------------------------------ reviews */
function reviewsSection(){
  const g = S.settings.googleReviewUrl;
  return el('section',{class:'block',id:'reviews'},
    el('div',{class:'block-head'}, el('h2',null,t('reviews_h')),
      el('div',{class:'actions'}, g ? el('a',{class:'btn btn-ghost',href:g,target:'_blank',rel:'noopener'},t('google_review')) : null,
        el('button',{type:'button',class:'btn btn-primary',onclick:openReview},t('write_review')))),
    S.reviews.length ? el('div',{class:'reviews'}, S.reviews.map(r => el('figure',{class:'review'},
      el('div',{class:'stars','aria-label':`${r.rating} out of 5`}, '★'.repeat(r.rating) + '☆'.repeat(5-r.rating)),
      el('blockquote',null, r.review),
      el('figcaption',null, el('b',null,r.name), r.workshop ? ' · '+r.workshop : '')))) : el('p',{class:'desc'},t('reviews_none')));
}

/* -------------------------------------------------------------- gifts */
function giftSection(){
  const st = S.settings;
  const amounts = voucherList();
  const pp = Number(st.passPrice)||5000, pv = Number(st.passValue)||6000;
  return el('section',{class:'block gifts',id:'gift'},
    el('div',{class:'block-head'}, el('div',null, el('h2',null,t('gift_h')), el('p',{class:'desc'},t('gift_sub')))),
    el('div',{class:'gift-grid'},
      el('div',{class:'gift-card voucher-card'},
        el('div',{class:'gift-motif','aria-hidden':'true',html:motif('aipan')}),
        el('div',{class:'eyebrow'},t('voucher')), el('div',{class:'gift-price'}, t('from'),' ',inr(Math.min(...amounts))),
        el('p',null,t('voucher_d')), el('button',{type:'button',class:'btn btn-onband',onclick:()=>openGift('voucher')},t('buy'))),
      el('div',{class:'gift-card pass-card'},
        el('div',{class:'gift-motif','aria-hidden':'true',html:motif('block')}),
        el('div',{class:'eyebrow'},t('pass')), el('div',{class:'gift-price'}, inr(pp),' → ',inr(pv)),
        el('p',null,t('pass_d',inr(pp),inr(pv))), el('button',{type:'button',class:'btn btn-onband',onclick:()=>openGift('pass')},t('buy')))));
}

/* -------------------------------------------------------------- about */
function aboutSection(st){
  const text = (S.lang==='hi' && st.aboutHi) ? st.aboutHi : (st.about || '');
  const story = text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean).map(p => el('p',null,p));
  const artist = st.artistName || '';
  const h = t('about_h');
  return el('section',{class:'about',id:'about','aria-labelledby':'about-title'},
    el('div',null,
      el('div',{class:'eyebrow'},t('about_eyebrow')),
      el('h2',{id:'about-title'}, h[0], el('em',null,h[1]), h[2]),
      el('div',{class:'story'}, story),
      el('ul',{class:'pillars'}, t('pillars').map(([b,s]) => el('li',null, el('b',null,b), el('span',null,s))))),
    artist ? el('aside',{class:'artist','aria-label':t('meet')},
      el('div',{class:'eyebrow',style:'color:var(--geru);opacity:1'},t('meet')),
      el('div',{class:'artist-head'}, el('img',{class:'avatar-img',src:'logo-192.png',alt:''}),
        el('div',null, el('h3',null, artist), el('div',{class:'role'}, st.artistRole || 'Founder & lead artist'))),
      st.artistBio ? el('p',null, st.artistBio) : null,
      st.artistQuote ? el('div',{class:'quote'}, '“'+st.artistQuote+'”') : null,
      igUrl() ? el('a',{class:'btn btn-ghost ig-btn',href:igUrl(),target:'_blank',rel:'noopener',style:'margin-top:16px'}, igIcon(), (S.lang==='hi'?' Instagram पर देखें ':' Follow on Instagram ')) : null) : null);
}

function groupsPanel(groupWA){
  return el('div',{class:'panel'},
    el('h2',null,t('groups_h')), el('p',{class:'desc'},t('groups_d')),
    el('div',{class:'actions',style:'justify-content:flex-start;margin-top:14px'},
      el('button',{type:'button',class:'btn btn-primary',onclick:openEnquiry},t('enquire')),
      groupWA ? el('a',{class:'btn btn-ghost',href:groupWA,target:'_blank',rel:'noopener'},t('ask_wa')) : null));
}
function visitPanel(st){
  const dir = st.mapsUrl || (st.address ? 'https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(st.address) : '');
  return el('div',{class:'panel',id:'visit'},
    el('h2',null,t('visit_h')), el('p',{class:'desc'},t('visit_d')),
    el('ul',{class:'list',style:'margin-top:10px'},
      st.address ? el('li',{class:'row'}, el('span',{class:'meta'},t('studio')), el('span',{style:'text-align:right'},st.address)) : null,
      st.hours ? el('li',{class:'row'}, el('span',{class:'meta'},t('hours')), el('span',null,st.hours)) : null,
      waNumber() ? el('li',{class:'row'}, el('span',{class:'meta'},'WhatsApp'), copyChip(digits(st.whatsapp||CFG.WHATSAPP))) : null,
      st.email ? el('li',{class:'row'}, el('span',{class:'meta'},t('email')), copyChip(st.email)) : null,
      st.upi ? el('li',{class:'row'}, el('span',{class:'meta'},t('upi')), copyChip(st.upi)) : null),
    st.address ? el('div',{class:'map'}, el('iframe',{title:'Map',loading:'lazy',referrerpolicy:'no-referrer-when-downgrade',src:'https://www.google.com/maps?q='+encodeURIComponent(st.address)+'&output=embed'})) : null,
    dir ? el('a',{class:'btn btn-ghost',href:dir,target:'_blank',rel:'noopener',style:'margin-top:12px'},'📍 '+t('directions')) : null);
}

/* ===================================================== Try Aipan canvas */
let aipanNode = null;
const AP = { strokes:[], cur:null, sym:8, brush:'fine', guide:true };
function aipanSection(){
  if (!aipanNode) aipanNode = buildAipan();
  aipanNode.querySelectorAll('[data-i18n]').forEach(n => { n.textContent = t(n.dataset.i18n); });
  return aipanNode;
}
function buildAipan(){
  const canvas = el('canvas',{class:'ap-canvas',width:'900',height:'900','aria-label':'Drawing area'});
  const ctx = canvas.getContext('2d');
  const guideImg = new Image();
  guideImg.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(MOTIFS.aipan().replace(/currentColor/g,'#ffffff'));
  guideImg.onload = () => draw();
  const W = 900, C = W/2;
  function bg(){ ctx.fillStyle = '#9b3a22'; ctx.fillRect(0,0,W,W); }
  function strokeAll(list){
    for (const s of list){
      const w = s.brush==='thick' ? 14 : 6;
      for (let k=0;k<s.sym;k++){
        for (const mirror of (s.sym>1 ? [1,-1] : [1])){
          ctx.save(); ctx.translate(C,C); ctx.rotate(k*2*Math.PI/s.sym); ctx.scale(mirror,1); ctx.translate(-C,-C);
          ctx.strokeStyle = ctx.fillStyle = '#fffaf2'; ctx.lineCap = ctx.lineJoin = 'round'; ctx.lineWidth = w;
          if (s.brush==='dots'){ let last=null; for (const p of s.pts){ if (!last || Math.hypot(p[0]-last[0],p[1]-last[1])>18){ ctx.beginPath(); ctx.arc(p[0],p[1],5.5,0,Math.PI*2); ctx.fill(); last=p; } } }
          else { ctx.beginPath(); s.pts.forEach((p,i)=> i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1])); if (s.pts.length===1) ctx.lineTo(s.pts[0][0]+.1,s.pts[0][1]); ctx.stroke(); }
          ctx.restore();
        }
      }
    }
  }
  function draw(withGuide = AP.guide){
    bg();
    if (withGuide && guideImg.complete){ ctx.globalAlpha = .13; ctx.drawImage(guideImg,0,0,W,W); ctx.globalAlpha = 1; }
    strokeAll(AP.strokes); if (AP.cur) strokeAll([AP.cur]);
  }
  const pos = e => { const r = canvas.getBoundingClientRect(); return [(e.clientX-r.left)*W/r.width, (e.clientY-r.top)*W/r.height]; };
  canvas.addEventListener('pointerdown', e => { canvas.setPointerCapture(e.pointerId); AP.cur = {pts:[pos(e)], sym:AP.sym, brush:AP.brush}; draw(); e.preventDefault(); });
  canvas.addEventListener('pointermove', e => { if (!AP.cur) return; AP.cur.pts.push(pos(e)); draw(); });
  const end = () => { if (AP.cur){ AP.strokes.push(AP.cur); AP.cur = null; draw(); } };
  canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);

  const seg = (items, get, set) => el('div',{class:'ap-seg'}, items.map(([v,key,label]) => { const b = el('button',{type:'button','aria-pressed':get()===v,onclick:()=>{ set(v); b.parentNode.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed', x===b)); }}, key ? el('span',{'data-i18n':key},t(key)) : label); return b; }));
  async function exportBlob(){ draw(false); const blob = await new Promise(r => canvas.toBlob(r,'image/png')); draw(); return blob; }
  const saveBtn = el('button',{type:'button',class:'btn btn-primary',onclick:async()=>{
    const blob = await exportBlob(); const a = el('a',{href:URL.createObjectURL(blob),download:'my-aipan-rang-pahadi.png'}); document.body.append(a); a.click(); a.remove(); }}, el('span',{'data-i18n':'save'},t('save')));
  const shareBtn = (navigator.canShare && navigator.share) ? el('button',{type:'button',class:'btn btn-ghost',onclick:async()=>{
    try { const blob = await exportBlob(); const file = new File([blob],'my-aipan.png',{type:'image/png'});
      if (navigator.canShare({files:[file]})) await navigator.share({files:[file], title:'My Aipan', text:`I made this Aipan on ${studioName()}'s website! ${siteUrl()}`}); } catch {} }}, el('span',{'data-i18n':'share'},t('share'))) : null;
  const tradWS = () => upcoming().find(w => w.category==='Traditional Indian art' && seatsLeft(w)>0);

  const node = el('section',{class:'block aipan',id:'try-aipan'},
    el('div',{class:'ap-text'},
      el('div',{class:'eyebrow',style:'color:var(--geru);opacity:1'},'ऐपण · Aipan'),
      el('h2',{'data-i18n':'try_h'},t('try_h')), el('p',{class:'desc','data-i18n':'try_sub'},t('try_sub')),
      el('div',{class:'ap-tools'},
        el('div',{class:'ap-label'}, el('span',{'data-i18n':'mirror'},t('mirror'))),
        seg([[1,null,'Off'],[6,null,'×6'],[8,null,'×8'],[12,null,'×12']], ()=>AP.sym, v=>{AP.sym=v;}),
        seg([['fine','fine'],['thick','thick'],['dots','dots']], ()=>AP.brush, v=>{AP.brush=v;}),
        el('div',{class:'actions',style:'justify-content:flex-start'},
          el('button',{type:'button',class:'btn btn-ghost btn-sm',onclick:()=>{AP.guide=!AP.guide;draw();}}, el('span',{'data-i18n':'guide'},t('guide'))),
          el('button',{type:'button',class:'btn btn-ghost btn-sm',onclick:()=>{AP.strokes.pop();draw();}}, el('span',{'data-i18n':'undo'},t('undo'))),
          el('button',{type:'button',class:'btn btn-ghost btn-sm',onclick:()=>{AP.strokes=[];draw();}}, el('span',{'data-i18n':'clear'},t('clear'))))),
      el('div',{class:'actions',style:'justify-content:flex-start;margin-top:16px'}, saveBtn, shareBtn),
      el('p',{class:'ap-cta'}, el('span',{'data-i18n':'try_cta'},t('try_cta')),' ',
        el('button',{type:'button',class:'quiz-link',onclick:()=>{ const w = tradWS(); if (w) openBooking(w); else { S.cat='Traditional Indian art'; render(); document.getElementById('calendar').scrollIntoView({behavior:'smooth'}); } }}, el('b',null,el('span',{'data-i18n':'book'},t('book')),' →')))),
    el('div',{class:'ap-stage'}, canvas));
  draw();
  return node;
}

/* =============================================================== modals */
let lastFocus = null;
function openModal(node, size){
  lastFocus = document.activeElement;
  const ov = el('div',{class:'overlay'+(size?' '+size:''),onclick:e=>{ if(e.target===ov) closeModal(); }}, node);
  document.getElementById('modalRoot').replaceChildren(ov);
  const f = node.querySelector('input:not([tabindex="-1"]),select,textarea,button'); if (f) f.focus({preventScroll:true});
}
function closeModal(){ document.getElementById('modalRoot').replaceChildren(); if (lastFocus && lastFocus.focus) lastFocus.focus({preventScroll:true}); }
document.addEventListener('keydown', e => { if (e.key==='Escape') closeModal(); });
const modal = (...kids) => el('div',{class:'modal',role:'dialog','aria-modal':'true'}, ...kids);
function loadContact(){ try { return JSON.parse(localStorage.getItem('rp-contact')||'{}'); } catch { return {}; } }
function saveContact(c){ try { localStorage.setItem('rp-contact', JSON.stringify({...loadContact(), ...c})); } catch {} }
const field = (label, input, full) => el('label',{class:full?'full':null}, label, input);
const honeypot = () => el('input',{tabindex:'-1',autocomplete:'off',class:'hp','aria-hidden':'true'});
function validPerson(name, phone, err){
  if (!name.value.trim()) { err.textContent = t('err_name'); name.focus(); return false; }
  if (digits(phone.value).length < 10) { err.textContent = t('err_phone'); phone.focus(); return false; }
  return true;
}

/* ---- booking */
function openBooking(w){
  const left = seatsLeft(w), c = loadContact();
  const name = el('input',{autocomplete:'name',value:c.name||''});
  const phone = el('input',{inputmode:'tel',autocomplete:'tel',value:c.phone||'',placeholder:'10-digit mobile'});
  const email = el('input',{type:'email',autocomplete:'email',value:c.email||'',placeholder:'you@example.com'});
  const seats = el('select',null, Array.from({length:Math.max(1,Math.min(6,left))},(_,i)=>el('option',{value:i+1},i+1)));
  const note = el('textarea',{placeholder:t('note_ph')});
  const code = el('input',{autocapitalize:'characters',placeholder:'e.g. GIFT-AB12C',style:'text-transform:uppercase'});
  const hp = honeypot();
  const codeMsg = el('div',{class:'meta'});
  let disc = 0, appliedCode = '';
  const sub = el('span'), discRow = el('div',{class:'sumrow',hidden:true}, el('span',null,t('discount')), el('span')), tot = el('strong');
  const err = el('div',{class:'err',role:'alert'});
  const msg = () => `Hi ${studioName()}! I'd like to book ${seats.value} seat(s) for "${w.title}" on ${fmtDay(w.date)} at ${fmtTime(w.start)}.\nName: ${name.value||'-'}\nPhone: ${phone.value||'-'}${code.value?'\nCode: '+code.value.toUpperCase():''}${note.value?'\nNote: '+note.value:''}`;
  const wa = el('a',{class:API?'btn btn-ghost':'btn btn-primary',target:'_blank',rel:'noopener'},t('send_wa'));
  const sync = () => {
    const gross = w.price*Number(seats.value);
    if (appliedCode && code.value.trim().toUpperCase() !== appliedCode) { disc = 0; appliedCode = ''; codeMsg.textContent = ''; }
    sub.textContent = inr(gross); discRow.hidden = !disc; discRow.lastChild.textContent = '− '+inr(Math.min(disc,gross)); tot.textContent = inr(Math.max(0,gross-disc));
    const l = waLink(msg()); if (l) wa.href = l; wa.hidden = !l;
  };
  [name,phone,seats,note,code].forEach(i => i.addEventListener('input', sync));
  seats.addEventListener('change', () => { if (appliedCode) applyCode(); sync(); });
  async function applyCode(){
    const v = code.value.trim().toUpperCase(); if (!v) return;
    if (!API) { codeMsg.textContent = 'Mention the code in your WhatsApp message.'; return; }
    codeMsg.textContent = '…';
    try { const r = await api('checkCode',{code:v, amount:w.price*Number(seats.value)});
      if (r.ok) { disc = r.discount; appliedCode = v; codeMsg.textContent = '✓ '+r.label; } else { disc = 0; appliedCode = ''; codeMsg.textContent = r.message; }
    } catch { codeMsg.textContent = t('err_generic'); }
    sync();
  }
  const submit = el('button',{type:'submit',class:'btn btn-primary'},t('confirm'));
  const form = el('form',{novalidate:true,onsubmit:async e=>{
    e.preventDefault(); err.textContent='';
    if (!validPerson(name, phone, err)) return;
    saveContact({name:name.value.trim(), phone:phone.value.trim(), email:email.value.trim()});
    submit.disabled = true; submit.textContent = t('booking');
    try {
      const out = await api('book',{workshopId:w.id, name:name.value.trim(), phone:phone.value.trim(), email:email.value.trim(), seats:Number(seats.value), note:note.value.trim(), code:code.value.trim().toUpperCase(), website:hp.value});
      if (out.ok) { showBooked(w, Number(seats.value), out, email.value.trim()); load(); return; }
      err.textContent = out.message || t('err_generic');
      if (out.error==='full' || out.error==='not_found') load();
    } catch { err.textContent = t('err_generic'); }
    submit.disabled = false; submit.textContent = t('confirm');
  }},
    el('div',{class:'form'},
      field(t('name'), name, true), field(t('mobile'), phone), field(t('seats'), seats),
      field(t('email_opt'), email, true),
      el('label',{class:'full'}, t('code'), el('div',{class:'inline'}, code, el('button',{type:'button',class:'btn btn-ghost',onclick:applyCode},t('apply'))), codeMsg),
      field(t('note'), note, true), el('label',{class:'hp','aria-hidden':'true'},'Leave empty', hp)),
    el('div',{class:'summary'}, el('div',{class:'sumrow'}, el('span',null,t('subtotal')), sub), discRow, el('div',{class:'sumrow total-row'}, el('span',null,t('total')), tot)),
    !API ? el('p',{class:'meta',style:'margin:10px 0 0'},'Send your booking on WhatsApp and the studio will confirm your seat.') : null,
    err,
    el('div',{class:'modal-foot'}, el('button',{type:'button',class:'btn btn-ghost',onclick:closeModal},t('close')), wa, API ? submit : null));
  sync();
  openModal(modal(el('div',{class:'cat'}, catName(w.category)), el('h2',null, wTitle(w)),
    el('div',{class:'meta'}, `${fmtDay(w.date)} · ${fmtTime(w.start)} · ${fmtDur(w.durationMins)} · ${t('seats_left',left,w.seats)}`), form));
}

function payBlock(amount, note, waText){
  const link = upiLink(amount, note);
  const wa = waLink(waText);
  return el('div',{class:'pay'},
    link ? el('div',{class:'pay-qr'}, qrSvg(link, 168)) : null,
    el('div',{class:'pay-text'},
      el('div',{class:'meta'}, t('to_pay')), el('div',{class:'pay-amt'}, inr(amount)),
      link ? el('div',{class:'meta',style:'margin:4px 0 10px'}, t('scan_pay')) : null,
      el('div',{class:'actions',style:'justify-content:flex-start'},
        link && isPhone() ? el('a',{class:'btn btn-primary btn-sm',href:link},t('open_upi')) : null,
        S.settings.upi ? copyChip(S.settings.upi) : null),
      wa ? el('a',{class:'wa-link',href:wa,target:'_blank',rel:'noopener'}, t('send_ss')+' →') : null));
}
function showBooked(w, seats, out, email){
  const amount = Number(out.amount)||0;
  openModal(modal(
    el('div',{class:'eyebrow',style:'color:var(--deodar);opacity:1'},t('received')),
    el('h2',{style:'margin-top:6px'}, t('see_you')),
    el('p',{class:'desc'}, `${wTitle(w)} · ${fmtDay(w.date)} · ${fmtTime(w.start)} · ${seats} × ${inr(w.price)}`),
    el('div',{class:'total'}, el('span',null,t('booking_id')), el('span',{class:'confirm-id'}, out.id)),
    amount > 0 ? payBlock(amount, `${out.id} ${w.title}`.slice(0,60), `Hi! I booked ${seats} seat(s) for "${w.title}" on ${fmtDay(w.date)}. Booking ID ${out.id}. Sharing my UPI payment of ${inr(amount)}.`)
               : el('div',{class:'info',style:'margin-top:12px'}, t('nothing_to_pay')),
    email ? el('p',{class:'meta',style:'margin:12px 0 0'}, '✉ '+t('email_sent')) : el('p',{class:'meta',style:'margin:12px 0 0'}, t('screenshot')),
    el('div',{class:'modal-foot'},
      el('a',{class:'btn btn-ghost',href:calLink(w),target:'_blank',rel:'noopener'},'📅 '+t('add_cal')),
      el('button',{type:'button',class:'btn btn-primary',onclick:closeModal},t('done')))));
}

/* ---- waitlist */
function openWaitlist(w){
  const c = loadContact();
  const name = el('input',{autocomplete:'name',value:c.name||''}), phone = el('input',{inputmode:'tel',value:c.phone||'',placeholder:'10-digit mobile'});
  const seats = el('select',null,[1,2,3,4].map(n=>el('option',{value:n},n))), hp = honeypot(), err = el('div',{class:'err',role:'alert'});
  const send = el('button',{type:'submit',class:'btn btn-primary'},t('waitlist'));
  const waText = () => `Hi! Please add me to the waitlist for "${w.title}" on ${fmtDay(w.date)}. Name: ${name.value}, phone: ${phone.value}, seats: ${seats.value}.`;
  openModal(modal(el('h2',null,t('waitlist')), el('p',{class:'desc'}, `${wTitle(w)} · ${fmtDay(w.date)}. We’ll message you if a seat opens up.`),
    el('form',{novalidate:true,onsubmit:async e=>{ e.preventDefault(); err.textContent='';
      if (!validPerson(name, phone, err)) return; saveContact({name:name.value.trim(), phone:phone.value.trim()});
      if (!API) { const l = waLink(waText()); if (l) window.open(l,'_blank','noopener'); closeModal(); return; }
      send.disabled = true;
      try { const r = await api('waitlist',{workshopId:w.id, name:name.value.trim(), phone:phone.value.trim(), seats:Number(seats.value), website:hp.value});
        if (r.ok) { closeModal(); toast('You’re on the waitlist. We’ll message you if a seat opens.'); return; } err.textContent = r.message || t('err_generic');
      } catch { err.textContent = t('err_generic'); } send.disabled = false; }},
      el('div',{class:'form'}, field(t('name'),name,true), field(t('mobile'),phone), field(t('seats'),seats), el('label',{class:'hp'},hp)), err,
      el('div',{class:'modal-foot'}, el('button',{type:'button',class:'btn btn-ghost',onclick:closeModal},t('close')), send))));
}

/* ---- quiz */
function openQuiz(){
  const ans = {};
  const Q = [
    {k:'who', q:S.lang==='hi'?'कौन आ रहा है?':'Who’s coming?', o:[['me',S.lang==='hi'?'सिर्फ़ मैं':'Just me'],['friends',S.lang==='hi'?'दोस्तों या साथी के साथ':'Me with friends or my partner'],['kid',S.lang==='hi'?'मेरा बच्चा (6–12 साल)':'My child (ages 6–12)'],['group',S.lang==='hi'?'एक ग्रुप, पार्टी या टीम':'A group, party or team']]},
    {k:'what', q:S.lang==='hi'?'क्या सबसे मज़ेदार लगता है?':'What sounds most fun?', o:[['Traditional Indian art',S.lang==='hi'?'पारंपरिक लोक डिज़ाइन':'Traditional folk patterns'],['Painting & drawing',S.lang==='hi'?'रंग और पेंटिंग':'Painting with colour'],['Candle making',S.lang==='hi'?'खुशबूदार मोमबत्तियाँ बनाना':'Making scented candles'],['Handicrafts',S.lang==='hi'?'कुछ काम की चीज़ बनाना':'Making something useful (bags, decor)'],['Mixed media & texture',S.lang==='hi'?'बनावट और प्रयोग':'Textures and experiments']]},
    {k:'exp', q:S.lang==='hi'?'कितना अनुभव है?':'How much experience do you have?', o:[['none',S.lang==='hi'?'बिल्कुल नहीं':'None at all'],['some',S.lang==='hi'?'थोड़ा बहुत':'A little'],['lots',S.lang==='hi'?'मैं पहले से बनाता/बनाती हूँ':'I already make art']]},
  ];
  const body = el('div');
  const step = i => {
    if (i >= Q.length) return result();
    const q = Q[i];
    if (q.k==='what' && (ans.who==='kid')) return step(i+2);
    body.replaceChildren(el('div',{class:'eyebrow',style:'color:var(--geru);opacity:1'}, `${i+1} / 3`), el('h2',{style:'margin:6px 0 16px'}, q.q),
      el('div',{class:'quiz-opts'}, q.o.map(([v,l]) => el('button',{type:'button',class:'quiz-opt',onclick:()=>{ ans[q.k]=v; step(i+1); }}, l))));
  };
  const result = () => {
    const cat = ans.who==='kid' ? 'Kids' : (ans.what || 'Traditional Indian art');
    let pool = upcoming().filter(w => w.category===cat && w.status!=='cancelled');
    if (ans.who==='friends') { const sip = pool.find(w => /sip/i.test(w.title)) || upcoming().find(w => /sip/i.test(w.title)); if (sip) pool = [sip, ...pool.filter(x=>x!==sip)]; }
    const pick = pool.find(w => seatsLeft(w)>0) || pool[0];
    const th = THEMES[cat] || THEMES.default;
    body.replaceChildren(...[
      el('div',{class:'quiz-result',style:`--band:${th.band}`}, el('div',{class:'gift-motif','aria-hidden':'true',html:motif(th.motif)}),
        el('div',{class:'eyebrow'}, S.lang==='hi'?'आपके लिए':'Your match'), el('h2',null, catName(cat)), el('div',{class:'sub'}, S.lang==='hi'?th.subHi:th.sub)),
      pick ? el('div',{class:'quiz-pick'}, dateBox(pick), el('div',{style:'flex:1;min-width:0'}, el('b',null,wTitle(pick)), el('div',{class:'meta'}, `${fmtDay(pick.date)} · ${fmtTime(pick.start)} · ${inr(pick.price)}`)), bookOrWait(pick))
           : el('p',{class:'desc',style:'margin-top:14px'}, S.lang==='hi'?'अभी इसकी कोई तारीख तय नहीं है। WhatsApp पर पूछिए।':'No dates for this yet. Message us on WhatsApp and we’ll tell you first.'),
      ans.who==='group' ? el('p',{class:'desc',style:'margin-top:12px'}, S.lang==='hi'?'ग्रुप के लिए हम निजी सत्र भी रखते हैं।':'For groups we also run private sessions on a date that suits you. ', el('button',{type:'button',class:'quiz-link',onclick:openEnquiry}, el('b',null,t('enquire')+' →'))) : null,
      el('div',{class:'modal-foot'},
        el('button',{type:'button',class:'btn btn-ghost',onclick:()=>{ Object.keys(ans).forEach(k=>delete ans[k]); step(0); }}, S.lang==='hi'?'फिर से':'Start again'),
        el('button',{type:'button',class:'btn btn-primary',onclick:()=>{ S.cat=cat; closeModal(); render(); document.getElementById('calendar').scrollIntoView({behavior:'smooth'}); }}, (S.lang==='hi'?'सभी देखें: ':'See all: ')+catName(cat)))].filter(Boolean));
  };
  step(0);
  openModal(modal(body));
}

/* ---- gift voucher & pass */
function openGift(kind){
  const st = S.settings, c = loadContact();
  const amounts = voucherList();
  const pp = Number(st.passPrice)||5000, pv = Number(st.passValue)||6000;
  let amount = amounts[1] || amounts[0];
  const amtBtns = el('div',{class:'chips',style:'margin:0'}, amounts.map(a => { const b = el('button',{type:'button',class:'chip','aria-pressed':a===amount,onclick:()=>{ amount=a; amtBtns.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',x===b)); }}, inr(a)); return b; }));
  const forName = el('input',{placeholder:'e.g. Asha'}), message = el('textarea',{placeholder:'Happy birthday! Go make something beautiful.'});
  const name = el('input',{autocomplete:'name',value:c.name||''}), phone = el('input',{inputmode:'tel',value:c.phone||''}), email = el('input',{type:'email',value:c.email||''});
  const hp = honeypot(), err = el('div',{class:'err',role:'alert'}), send = el('button',{type:'submit',class:'btn btn-primary'}, t('buy'));
  const isPass = kind==='pass';
  openModal(modal(
    el('div',{class:'eyebrow',style:'color:var(--geru);opacity:1'}, isPass ? t('pass') : t('voucher')),
    el('h2',{style:'margin-top:4px'}, isPass ? `${inr(pp)} → ${inr(pv)}` : (S.lang==='hi'?'किसी को कला का उपहार दें':'Give someone an afternoon of art')),
    el('p',{class:'desc'}, isPass ? t('pass_d',inr(pp),inr(pv)) : t('voucher_d')),
    el('form',{novalidate:true,onsubmit:async e=>{ e.preventDefault(); err.textContent='';
      if (!validPerson(name, phone, err)) return; saveContact({name:name.value.trim(), phone:phone.value.trim(), email:email.value.trim()});
      const payload = {kind, amount, forName:forName.value.trim(), message:message.value.trim(), name:name.value.trim(), phone:phone.value.trim(), email:email.value.trim(), website:hp.value};
      if (!API) { const l = waLink(`Hi! I'd like to buy a ${isPass?'workshop pass':'gift voucher of '+inr(amount)}${payload.forName?' for '+payload.forName:''}. Name: ${payload.name}, phone: ${payload.phone}.`); if (l) window.open(l,'_blank','noopener'); closeModal(); return; }
      send.disabled = true;
      try { const r = await api('voucher', payload); if (r.ok) { showVoucher(r, payload); return; } err.textContent = r.message || t('err_generic'); }
      catch { err.textContent = t('err_generic'); } send.disabled = false; }},
      el('div',{class:'form'},
        isPass ? null : el('div',{class:'full'}, el('div',{class:'meta',style:'font-weight:700;margin-bottom:6px'}, S.lang==='hi'?'राशि':'Amount'), amtBtns),
        isPass ? null : field(S.lang==='hi'?'किसके लिए':'For (their name)', forName),
        isPass ? null : field(S.lang==='hi'?'संदेश':'Message on the card', message, true),
        field(t('name'), name, true), field(t('mobile'), phone), field('Email', email), el('label',{class:'hp'},hp)),
      err, el('div',{class:'modal-foot'}, el('button',{type:'button',class:'btn btn-ghost',onclick:closeModal},t('close')), send))));
}
function showVoucher(r, p){
  const canvas = el('canvas',{width:'1200',height:'680',class:'voucher-canvas'});
  drawVoucher(canvas, r, p);
  const save = el('button',{type:'button',class:'btn btn-primary',onclick:()=>canvas.toBlob(b=>{ const a = el('a',{href:URL.createObjectURL(b),download:`${r.code}.png`}); document.body.append(a); a.click(); a.remove(); })}, S.lang==='hi'?'कार्ड सेव करें':'Save voucher card');
  openModal(modal(
    el('div',{class:'eyebrow',style:'color:var(--deodar);opacity:1'}, S.lang==='hi'?'ऑर्डर मिल गया':'Order received'),
    el('h2',{style:'margin-top:6px'}, r.code),
    el('p',{class:'desc'}, S.lang==='hi'?'भुगतान मिलते ही यह कोड चालू हो जाएगा। बुकिंग के समय इस कोड को डालें।':'The code works as soon as the studio confirms your payment. Enter it when booking any workshop.'),
    canvas, payBlock(r.price, `${r.code} ${r.kind}`, `Hi! I ordered ${r.kind} ${r.code} (${inr(r.value)}). Sharing my UPI payment of ${inr(r.price)}.`),
    el('div',{class:'modal-foot'}, save, el('button',{type:'button',class:'btn btn-ghost',onclick:closeModal},t('done')))), 'wide');
}
function drawVoucher(cv, r, p){
  const x = cv.getContext('2d'), W = cv.width, H = cv.height;
  x.fillStyle = r.kind==='Workshop pass' ? '#2c5a50' : '#9b3a22'; x.fillRect(0,0,W,H);
  const img = new Image(); img.onload = () => { x.globalAlpha = .18; x.drawImage(img, W-560, -120, 820, 820); x.globalAlpha = 1; text(); };
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(MOTIFS[r.kind==='Workshop pass'?'block':'aipan']().replace(/currentColor/g,'#ffffff'));
  function text(){
    x.fillStyle = '#fff'; x.textBaseline = 'alphabetic';
    x.font = '700 26px "Hanken Grotesk", sans-serif'; x.fillText((studioName() + ' · ' + (r.kind || 'Gift voucher')).toUpperCase(), 70, 100);
    x.font = '800 140px "Bricolage Grotesque", sans-serif'; x.fillText(inr(r.value), 64, 270);
    x.font = 'italic 48px "Instrument Serif", serif';
    x.fillText(p.forName ? `for ${p.forName}` : 'to spend on any workshop', 70, 345);
    if (p.message){ x.font = '500 28px "Hanken Grotesk", sans-serif'; wrap(p.message, 70, 410, 640, 38, 3); }
    x.fillStyle = '#fffaf2'; roundRect(70, H-170, 470, 100, 20); x.fill();
    x.fillStyle = '#1f1a17'; x.font = '700 20px "Hanken Grotesk", sans-serif'; x.fillText('CODE', 98, H-128);
    x.font = '800 44px "Bricolage Grotesque", sans-serif'; x.fillText(r.code, 98, H-86);
    x.fillStyle = '#fff'; x.font = '600 24px "Hanken Grotesk", sans-serif'; x.fillText('Book at ' + siteUrl().replace(/^https?:\/\//,'').replace(/\/$/,''), 580, H-100);
  }
  function wrap(s, X, Y, maxW, lh, maxLines){ const words = s.split(/\s+/); let line = '', n = 0; for (const w of words){ const tst = line ? line+' '+w : w; if (x.measureText(tst).width > maxW && line){ x.fillText(line, X, Y + n*lh); line = w; if (++n >= maxLines) return; } else line = tst; } if (line) x.fillText(line, X, Y + n*lh); }
  function roundRect(X,Y,w,h,rad){ x.beginPath(); x.moveTo(X+rad,Y); x.arcTo(X+w,Y,X+w,Y+h,rad); x.arcTo(X+w,Y+h,X,Y+h,rad); x.arcTo(X,Y+h,X,Y,rad); x.arcTo(X,Y,X+w,Y,rad); x.closePath(); }
}

/* ---- review */
function openReview(){
  const c = loadContact();
  const name = el('input',{autocomplete:'name',value:c.name||''});
  const titles = [...new Set(S.workshops.map(w=>w.title))];
  const ws = el('select',null, el('option',{value:''}, '—'), titles.map(x=>el('option',{value:x},x)), el('option',{value:'Other'},'Other'));
  let rating = 5;
  const stars = el('div',{class:'star-pick',role:'radiogroup','aria-label':'Rating'}, [1,2,3,4,5].map(n => el('button',{type:'button',role:'radio','aria-checked':n===5,'aria-label':`${n} stars`,onclick:()=>{ rating=n; paint(); }},'★')));
  const paint = () => [...stars.children].forEach((b,i)=>{ b.classList.toggle('on', i<rating); b.setAttribute('aria-checked', i+1===rating); });
  paint();
  const text = el('textarea',{placeholder:S.lang==='hi'?'आपको क्या अच्छा लगा?':'What did you make? What did you enjoy?'}), hp = honeypot(), err = el('div',{class:'err',role:'alert'});
  const send = el('button',{type:'submit',class:'btn btn-primary'}, S.lang==='hi'?'भेजें':'Send review');
  openModal(modal(el('h2',null,t('write_review')),
    el('form',{novalidate:true,onsubmit:async e=>{ e.preventDefault(); err.textContent='';
      if (!name.value.trim()) { err.textContent = t('err_name'); return; }
      if (text.value.trim().length < 5) { err.textContent = S.lang==='hi'?'कुछ शब्द लिखिए।':'Please write a few words.'; return; }
      if (!API) { const l = waLink(`Review (${rating}/5) from ${name.value}: ${text.value}`); if (l) window.open(l,'_blank','noopener'); closeModal(); return; }
      send.disabled = true;
      try { const r = await api('review',{name:name.value.trim(), workshop:ws.value, rating, review:text.value.trim(), website:hp.value});
        if (r.ok) { closeModal(); toast(S.lang==='hi'?'धन्यवाद! समीक्षा जल्द दिखेगी।':'Thank you! Your review will appear once the studio approves it.'); return; } err.textContent = r.message || t('err_generic');
      } catch { err.textContent = t('err_generic'); } send.disabled = false; }},
      el('div',{class:'form'}, field(t('name'),name), field(S.lang==='hi'?'कार्यशाला':'Workshop', ws), el('div',{class:'full'}, stars), field(S.lang==='hi'?'आपकी समीक्षा':'Your review', text, true), el('label',{class:'hp'},hp)),
      err, el('div',{class:'modal-foot'}, el('button',{type:'button',class:'btn btn-ghost',onclick:closeModal},t('close')), send))));
}

/* ---- group enquiry */
function openEnquiry(){
  const c = loadContact();
  const name = el('input',{autocomplete:'name',value:c.name||''}), phone = el('input',{inputmode:'tel',value:c.phone||''}), email = el('input',{type:'email',value:c.email||''});
  const org = el('input',{placeholder:'School, company or occasion'}), people = el('input',{type:'number',min:'1',value:'10'}), date = el('input',{type:'date'});
  const type = el('select',null, ['Birthday party','Kitty party / friends','Bachelorette','School visit','Corporate / team offsite','Other'].map(x=>el('option',{value:x},x)));
  const message = el('textarea',{placeholder:'Which workshop are you interested in? At the studio or at your venue?'}), hp = honeypot(), err = el('div',{class:'err',role:'alert'});
  const send = el('button',{type:'submit',class:'btn btn-primary'},t('enquire'));
  openModal(modal(el('h2',null,t('groups_h')), el('p',{class:'desc'},t('groups_d')),
    el('form',{novalidate:true,onsubmit:async e=>{ e.preventDefault(); err.textContent='';
      if (!validPerson(name, phone, err)) return; saveContact({name:name.value.trim(), phone:phone.value.trim(), email:email.value.trim()});
      const d = {name:name.value.trim(), phone:phone.value.trim(), email:email.value.trim(), org:org.value.trim(), type:type.value, people:people.value, date:date.value, message:message.value.trim(), website:hp.value};
      if (!API) { const l = waLink(`Hi! Group enquiry: ${d.type} for ${d.people} people${d.date?' on '+d.date:''}. ${d.message} — ${d.name}, ${d.phone}`); if (l) window.open(l,'_blank','noopener'); closeModal(); return; }
      send.disabled = true;
      try { const r = await api('enquiry', d); if (r.ok) { closeModal(); toast(S.lang==='hi'?'धन्यवाद! हम जल्द संपर्क करेंगे।':'Thank you! The studio will get back to you soon.'); return; } err.textContent = r.message || t('err_generic'); }
      catch { err.textContent = t('err_generic'); } send.disabled = false; }},
      el('div',{class:'form'}, field(t('name'),name,true), field(t('mobile'),phone), field('Email',email), field('Occasion',type), field('People',people),
        field('Organisation',org), field('Preferred date',date), field(t('note'),message,true), el('label',{class:'hp'},hp)),
      err, el('div',{class:'modal-foot'}, el('button',{type:'button',class:'btn btn-ghost',onclick:closeModal},t('close')), send))));
}


/* ===================================================== WhatsApp button */
function waButton(){
  let b = document.getElementById('waFloat');
  const link = waLink(S.lang==='hi' ? `नमस्ते ${studioName()}! मुझे एक कार्यशाला के बारे में पूछना है।` : `Hi ${studioName()}! I have a question about your workshops.`);
  if (!link) { if (b) b.remove(); return; }
  if (!b) {
    b = el('a',{id:'waFloat',class:'wa-float',target:'_blank',rel:'noopener'},
      el('span',{class:'wa-icon','aria-hidden':'true',html:'<svg viewBox="0 0 32 32" width="28" height="28"><path fill="#fff" d="M16 4C9.4 4 4 9 4 15.2c0 3.2 1.4 6 3.7 8.1L6.6 28l4.9-2.4c1.4.4 2.9.7 4.5.7 6.6 0 12-5 12-11.1S22.6 4 16 4z"/><circle cx="11" cy="15.4" r="1.7" fill="#1fa855"/><circle cx="16" cy="15.4" r="1.7" fill="#1fa855"/><circle cx="21" cy="15.4" r="1.7" fill="#1fa855"/></svg>'}),
      el('span',{class:'wa-label'}));
    document.body.append(b);
  }
  b.href = link;
  b.setAttribute('aria-label', S.lang==='hi' ? 'WhatsApp पर पूछें' : 'Ask us on WhatsApp');
  b.querySelector('.wa-label').textContent = S.lang==='hi' ? 'पूछें' : 'Ask us';
}

/* ================================================================== FAQ */
function faqItems(st){
  const hi = S.lang==='hi';
  const addr = st.address ? (hi ? `हमारा स्टूडियो ${st.address} पर है।` : `The studio is at ${st.address}.`) : '';
  const parking = st.parking || (hi ? 'पार्किंग और रास्ते के लिए हमें WhatsApp करें।' : 'Message us on WhatsApp for directions and parking.');
  const cancel = st.cancelPolicy || (hi
    ? 'कार्यशाला से 48 घंटे पहले तक आप तारीख मुफ़्त में बदल सकते हैं। उसके बाद पैसे वापस नहीं होते, लेकिन आप अपनी जगह किसी दोस्त को भेज सकते हैं।'
    : 'You can move to another date for free up to 48 hours before the workshop. After that we can’t refund, but you’re welcome to send a friend in your place.');
  return hi ? [
    ['क्या पहले से कला आनी चाहिए?','बिल्कुल नहीं। हर कार्यशाला शुरुआत से होती है और कलाकार हर कदम पर साथ रहती हैं।'],
    ['कीमत में क्या शामिल है?','सारी सामग्री: रंग, कैनवास, मोम, ब्रश, एप्रन। आप अपनी बनाई चीज़ घर ले जाते हैं।'],
    ['क्या पहनकर आएँ?','आरामदायक कपड़े जिन पर थोड़ा रंग लग जाए तो चिंता न हो। एप्रन हम देते हैं।'],
    ['बच्चे किस उम्र से आ सकते हैं?','बच्चों का आर्ट क्लब 6–12 साल के लिए है। ज़्यादातर बड़ों की कार्यशालाएँ 12–14 साल से ऊपर के लिए हैं; छोटे बच्चे किसी बड़े के साथ आ सकते हैं।'],
    ['भुगतान कैसे करें?','बुकिंग के बाद UPI QR कोड दिखता है। भुगतान करते ही आपकी सीट पक्की हो जाती है।'],
    ['क्या बुकिंग रद्द या बदल सकते हैं?', cancel],
    ['स्टूडियो कहाँ है? पार्किंग है?', `${addr} ${parking}`.trim()],
    ['ग्रुप या पार्टी के लिए?','हाँ! जन्मदिन, किटी पार्टी, स्कूल और ऑफ़िस टीम के लिए 8 लोगों से निजी सत्र रखते हैं। नीचे “पूछताछ भेजें” दबाइए।'],
    ['कलाकृति कब घर ले जा सकते हैं?','ज़्यादातर चीज़ें उसी दिन। टेक्सचर आर्ट को सूखने में एक दिन लग सकता है; हम बता देंगे।'],
  ] : [
    ['Do I need any art experience?','Not at all. Every workshop starts from the basics, and the artist guides you step by step.'],
    ['What’s included in the price?','All materials: paints, canvas, wax, brushes and aprons. You take home what you make.'],
    ['What should I wear?','Comfortable clothes you don’t mind getting a little paint or wax on. We provide aprons.'],
    ['How old do kids need to be?','The Kids’ Art Club is for ages 6–12. Most adult workshops are for ages 12–14 and up; younger children can join with an adult.'],
    ['How do I pay?','After you book, you’ll see a UPI QR code with the exact amount. Your seat is confirmed once the payment comes through.'],
    ['Can I cancel or change my date?', cancel],
    ['Where is the studio? Is there parking?', `${addr} ${parking}`.trim()],
    ['Can I book for a group or party?','Yes! We run private sessions for birthdays, kitty parties, schools and office teams, from 8 people. Use “Send an enquiry” below.'],
    ['When can I take my artwork home?','Most pieces go home the same day. Texture art can need a day to dry; we’ll let you know.'],
  ];
}
function faqSection(st){
  return el('section',{class:'block faq',id:'faq'},
    el('div',{class:'block-head'}, el('div',null, el('h2',null, S.lang==='hi'?'अक्सर पूछे जाने वाले सवाल':'Questions people ask'),
      el('p',{class:'desc'}, S.lang==='hi'?'जवाब नहीं मिला? WhatsApp पर पूछिए।':'Didn’t find your answer? Ask us on WhatsApp.'))),
    el('div',{class:'faq-list'}, faqItems(st).map(([q,a],i) => el('details',{class:'faq-item',open:i===0},
      el('summary',null, el('span',null,q), el('span',{class:'faq-plus','aria-hidden':'true'},'+')), el('p',null,a)))));
}

/* ====================================================== festival banner */
// Dates checked for 2026–27. Add new years here (or ask Claude) when they come up.
const FESTIVALS = [
  {key:'diwali', date:'2026-11-08', before:21, after:1, deco:'diya', bg:'#1f1633', accent:'#f2b544',
   en:{eyebrow:'Diwali special', title:'Diwali Diya & Candle Workshop', sub:'Paint your own diyas and pour scented candles to light up your home this Diwali.', cta:'Book your Diwali workshop'},
   hi:{eyebrow:'दिवाली विशेष', title:'दिवाली दीया और मोमबत्ती कार्यशाला', sub:'इस दिवाली अपने हाथों से दीये रंगिए और खुशबूदार मोमबत्तियाँ बनाइए।', cta:'दिवाली कार्यशाला बुक करें'},
   match:/diya|diwali|candle/i, cat:'Candle making'},
  {key:'christmas', date:'2026-12-25', before:24, after:1, deco:'star', bg:'#173528', accent:'#e8c46a',
   en:{eyebrow:'Christmas special', title:'Christmas Candles & Gifts', sub:'Make candles and hand-painted gifts, or give someone a workshop voucher.', cta:'See Christmas workshops'},
   hi:{eyebrow:'क्रिसमस विशेष', title:'क्रिसमस मोमबत्तियाँ और उपहार', sub:'मोमबत्तियाँ और हाथ से रंगे उपहार बनाइए, या किसी को वर्कशॉप वाउचर दीजिए।', cta:'क्रिसमस कार्यशालाएँ देखें'},
   match:/christmas|xmas|candle/i, cat:'Candle making', gift:true},
  {key:'holi', date:'2027-03-22', before:21, after:1, deco:'gulal', bg:'#3b1e4d', accent:'#ffd23f',
   en:{eyebrow:'Holi special', title:'Holi Colour Splash Painting', sub:'Celebrate the festival of colours with a bright, messy, joyful painting session.', cta:'Book a Holi session'},
   hi:{eyebrow:'होली विशेष', title:'होली रंग-बिरंगी पेंटिंग', sub:'रंगों के त्योहार को एक चटक, मज़ेदार पेंटिंग सत्र के साथ मनाइए।', cta:'होली सत्र बुक करें'},
   match:/holi|colour|color/i, cat:'Painting & drawing'},
  {key:'rakhi', date:'2027-08-17', before:21, after:1, deco:'rakhi', bg:'#4a1d2c', accent:'#f0a8c0',
   en:{eyebrow:'Raksha Bandhan special', title:'Make a Rakhi, Gift an Experience', sub:'Craft a handmade rakhi together, or gift your sibling an art workshop voucher.', cta:'Gift a workshop'},
   hi:{eyebrow:'रक्षाबंधन विशेष', title:'राखी बनाइए, अनुभव उपहार में दीजिए', sub:'साथ मिलकर हाथ से राखी बनाइए, या भाई-बहन को कला कार्यशाला का वाउचर दीजिए।', cta:'वर्कशॉप उपहार दें'},
   match:/rakhi|raksha/i, cat:'Handicrafts', gift:true},
];
function activeFestival(){
  const force = new URLSearchParams(location.search).get('festival');
  if (force) return FESTIVALS.find(f => f.key===force) || null;
  const today = parseD(todayISO());
  return FESTIVALS.find(f => { const d = parseD(f.date), diff = Math.round((d - today)/864e5); return diff <= f.before && diff >= -f.after; }) || null;
}
function festivalDeco(kind){
  if (kind==='diya') return Array.from({length:5},(_,i)=>`<g class="diya" style="--d:${(i*0.37).toFixed(2)}s" transform="translate(${40+i*90} 0)">
      <ellipse class="glow" cx="30" cy="34" rx="34" ry="34" fill="url(#fglow)"/>
      <path class="flame" d="M30 14 C38 26 38 34 30 42 C22 34 22 26 30 14Z" fill="#ffcf5a"/><path d="M30 26 C34 32 34 36 30 41 C26 36 26 32 30 26Z" fill="#fff3c4"/>
      <path d="M2 46 Q30 72 58 46 Z" fill="#c4582b"/><path d="M2 46 Q30 52 58 46" fill="none" stroke="#f2b544" stroke-width="2.5"/>
      <circle cx="16" cy="54" r="2.5" fill="#f2b544"/><circle cx="30" cy="58" r="2.5" fill="#f2b544"/><circle cx="44" cy="54" r="2.5" fill="#f2b544"/></g>`).join('');
  if (kind==='gulal') { const c=['#ff4f8b','#ffd23f','#3ec7e0','#7cdb5a','#ff8a3d','#b46cff']; let s=''; for (let i=0;i<16;i++){ const x=20+((i*73)%440), y=10+((i*37)%60), r=8+((i*13)%16); s+=`<circle class="puff" style="--d:${(i*.2).toFixed(1)}s" cx="${x}" cy="${y}" r="${r}" fill="${c[i%6]}" opacity=".85"/>`; } return s; }
  if (kind==='rakhi') return `<path d="M0 40 C120 20 340 60 480 38" stroke="#f0a8c0" stroke-width="5" fill="none"/>${[0,1,2,3,4,5,6,7].map(k=>`<ellipse cx="${240+28*Math.cos(k*Math.PI/4)}" cy="${40+28*Math.sin(k*Math.PI/4)}" rx="16" ry="9" transform="rotate(${k*45} ${240+28*Math.cos(k*Math.PI/4)} ${40+28*Math.sin(k*Math.PI/4)})" fill="#ffcf5a"/>`).join('')}<circle cx="240" cy="40" r="17" fill="#e2445c"/><circle cx="240" cy="40" r="7" fill="#fff3c4"/>`;
  if (kind==='star') { let s=''; for (let i=0;i<14;i++){ const x=20+((i*71)%450), y=8+((i*29)%64), r=3+(i%3)*2; s+=`<path class="twinkle" style="--d:${(i*.27).toFixed(2)}s" transform="translate(${x} ${y}) scale(${r/6})" d="M0 -6 L1.6 -1.6 L6 0 L1.6 1.6 L0 6 L-1.6 1.6 L-6 0 L-1.6 -1.6Z" fill="#fff6d8"/>`; } return s; }
  return '';
}
function festivalBanner(){
  const f = activeFestival(); if (!f) return null;
  try { if (sessionStorage.getItem('rp-fest-hide')===f.key) return null; } catch {}
  const w = (S.lang==='hi' ? f.hi : f.en), days = Math.round((parseD(f.date) - parseD(todayISO()))/864e5);
  const pick = upcoming().find(x => f.match.test(x.title) && seatsLeft(x)>0) || upcoming().find(x => x.category===f.cat && seatsLeft(x)>0);
  const go = () => {
    if (pick) return openBooking(pick);
    if (f.gift) { document.getElementById('gift')?.scrollIntoView({behavior:'smooth'}); return; }
    const l = waLink(`Hi ${studioName()}! I'm interested in your ${f.en.title}. When is the next one?`); if (l) window.open(l,'_blank','noopener');
  };
  const when = days > 1 ? (S.lang==='hi' ? `${days} दिन बाकी` : `${days} days to go`) : days === 1 ? (S.lang==='hi' ? 'कल है!' : 'Tomorrow!') : days === 0 ? (S.lang==='hi' ? 'आज है!' : 'Today!') : '';
  return el('section',{class:'festival fest-'+f.key, style:`--fbg:${f.bg};--facc:${f.accent}`, 'aria-label':w.eyebrow},
    el('div',{class:'wrap fest-inner'},
      el('div',{class:'fest-text'},
        el('div',{class:'fest-eyebrow'}, w.eyebrow, when ? el('span',{class:'fest-when'}, when) : null),
        el('h2',null, w.title), el('p',null, w.sub)),
      el('div',{class:'fest-deco','aria-hidden':'true',html:`<svg viewBox="0 0 480 80" preserveAspectRatio="xMidYMid meet"><defs><radialGradient id="fglow"><stop offset="0" stop-color="#ffcf5a" stop-opacity=".55"/><stop offset="1" stop-color="#ffcf5a" stop-opacity="0"/></radialGradient></defs>${festivalDeco(f.deco)}</svg>`}),
      el('div',{class:'fest-actions'},
        el('button',{type:'button',class:'btn fest-cta',onclick:go}, pick ? w.cta : (f.gift ? (S.lang==='hi'?'वाउचर देखें':'See gift vouchers') : t('ask_wa'))),
        el('button',{type:'button',class:'fest-close','aria-label':'Hide',onclick:()=>{ try { sessionStorage.setItem('rp-fest-hide', f.key); } catch {} render(); }},'×'))));
}

/* ======================================================= Google events */
let lastLD = '';
function updateStructuredData(){
  const st = S.settings, base = siteUrl();
  const place = {'@type':'Place', name:studioName(), address: st.address || 'Dehradun, Uttarakhand, India'};
  const logo = new URL('logo-512.png', base).href;
  const events = upcoming().filter(w => w.status!=='cancelled').slice(0,20).map(w => {
    const [h,m] = w.start.split(':').map(Number), end = h*60+m+(w.durationMins||120);
    return {'@type':'Event', name:w.title, description:w.description || `${w.category} workshop at ${studioName()}`,
      startDate:`${w.date}T${w.start}:00+05:30`, endDate:`${w.date}T${String(Math.floor(end/60)).padStart(2,'0')}:${String(end%60).padStart(2,'0')}:00+05:30`,
      eventStatus:'https://schema.org/EventScheduled', eventAttendanceMode:'https://schema.org/OfflineEventAttendanceMode',
      location:place, image:[w.photo || logo], organizer:{'@type':'Organization', name:studioName(), url:base},
      offers:{'@type':'Offer', price:String(w.price), priceCurrency:'INR', url:base+'#calendar', availability: seatsLeft(w)>0 ? 'https://schema.org/InStock' : 'https://schema.org/SoldOut'}};
  });
  const data = [{'@context':'https://schema.org','@type':'LocalBusiness', name:studioName(), image:logo, url:base, address:place.address, telephone:waNumber() ? '+'+waNumber() : undefined},
                ...events.map(e => ({'@context':'https://schema.org', ...e}))];
  data.push({'@context':'https://schema.org','@type':'FAQPage', mainEntity: faqItems(st).map(([q,a]) => ({'@type':'Question', name:q, acceptedAnswer:{'@type':'Answer', text:a}}))});
  const json = JSON.stringify(data);
  if (json === lastLD) return; lastLD = json;
  let tag = document.getElementById('ld-events');
  if (!tag) { tag = document.createElement('script'); tag.type = 'application/ld+json'; tag.id = 'ld-events'; document.head.append(tag); }
  tag.textContent = json;
}

/* ========================================================= data loading */
function apply(data){
  S.settings = data.settings || {};
  S.workshops = Array.isArray(data.workshops) ? data.workshops : [];
  S.gallery = Array.isArray(data.gallery) ? data.gallery : [];
  S.artworks = Array.isArray(data.artworks) ? data.artworks : [];
  S.reviews = Array.isArray(data.reviews) ? data.reviews : [];
  S.updated = data.updated || null;
  S.loaded = true;
}
async function load(){
  if (!API) { apply(sampleData()); render(); return; }
  try {
    const res = await fetch(API + (API.includes('?') ? '&' : '?') + 't=' + Date.now());
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'bad');
    apply(data); S.error = false;
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch {}
  } catch { S.error = true; S.loaded = true; }
  render();
}

document.getElementById('langBtn')?.addEventListener('click', () => { S.lang = S.lang==='hi' ? 'en' : 'hi'; try { localStorage.setItem('rp-lang', S.lang); } catch {} render(); });
try { const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); if (API && cached && cached.ok) apply(cached); } catch {}
render();
load();
setInterval(() => { if (!document.hidden && API && !document.getElementById('modalRoot').children.length) load(); }, 120000);
})();
