# Rang Pahadi Studio website

> **Upgrading to version 2?** Jump to [Upgrade to version 2](#upgrade-to-version-2) at the bottom.

A standalone website for the studio. It needs no Claude account and costs nothing to run.

- **Website** (`index.html`, `style.css`, `app.js`, `config.js`): hosted free on GitHub Pages.
- **Database**: a Google Sheet you own. `Code.gs` connects the website to it.

Students see the workshop calendar, book a seat and get your UPI ID to pay. Every booking lands in your Google Sheet. You manage everything from the Sheet.

The website works straight away with a **sample calendar**. Bookings go through WhatsApp until you connect the Sheet in step 3.

---

## Step 1: Put the website online (GitHub Pages, about 10 minutes)

1. Sign up at [github.com](https://github.com) (free).
2. Click **+** (top right) → **New repository**.
   - Name: `rang-pahadi-studio`
   - Choose **Public**, then click **Create repository**.
3. On the next page, click **uploading an existing file**.
4. Drag in these four files: `index.html`, `style.css`, `app.js`, `config.js`. Click **Commit changes**.
5. Go to **Settings** → **Pages**.
   - Source: **Deploy from a branch**
   - Branch: **main**, folder **/ (root)**, then click **Save**.
6. After 1–2 minutes your site is live at:
   `https://YOUR-GITHUB-NAME.github.io/rang-pahadi-studio/`

## Step 2: Create the Google Sheet (about 5 minutes)

1. Go to [sheets.new](https://sheets.new) and name the sheet **Rang Pahadi Studio**.
2. Click **Extensions** → **Apps Script**.
3. Delete the code that's there. Paste in everything from `Code.gs`, then click **Save** (the disk icon).
4. In the function list at the top, choose **setup** and click **Run**.
5. Google asks for permission. Click **Review permissions**, choose your account, then **Advanced** → **Go to project (unsafe)** → **Allow**. This warning is normal for your own scripts.
6. Go back to the Sheet. You now have four tabs: **Workshops**, **Bookings**, **Settings** and **Overview**.
7. Open **Settings** and fill in your WhatsApp number, UPI ID and address. You can also add your email next to `notifyEmail` to get an email for every booking.

## Step 3: Connect the website to the Sheet (about 5 minutes)

1. In Apps Script, click **Deploy** → **New deployment**.
2. Click the gear icon → **Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**
3. Click **Deploy** and copy the **Web app URL**. It ends in `/exec`.
4. On GitHub, open `config.js` → click the pencil icon. Paste the URL between the quotes:
   ```js
   SHEET_API_URL: "https://script.google.com/macros/s/AKfy.../exec",
   ```
5. Click **Commit changes**. After about a minute, refresh your website. The sample banner disappears and your real calendar shows.

---

## Running the studio day to day

| To do this | Do this in the Google Sheet |
| --- | --- |
| Add a workshop | **Workshops**: add a row. Type the title and the ID fills in by itself. Dates as `2026-11-14`, times as `11:00`. |
| Cancel a workshop | **Workshops**: set Status to **Cancelled**. |
| See who booked | **Bookings**: one row per booking, with name, phone, seats and amount. |
| Mark a payment | **Bookings**: tick **Paid**. |
| Add a WhatsApp or walk-in booking | **Bookings**: add a row, pick the Workshop ID, enter seats, set Status to **Confirmed**. The website's seat count updates. |
| Cancel a booking | **Bookings**: set Status to **Cancelled**. The seats open up again. |
| See how full each workshop is | **Overview**: seats booked, seats left, fill %, booked revenue and payments. |
| Change the studio name, story, artist bio or UPI | **Settings** tab. |

Changes in the Sheet show on the website within a minute or two.

## Good to know

- **Privacy:** the website only receives workshop details and seat counts. Names and phone numbers stay in your Sheet.
- **Full workshops:** the Sheet blocks a booking if there aren't enough seats left.
- **If you change `Code.gs` later:** go to **Deploy** → **Manage deployments** → pencil icon → Version: **New version** → **Deploy**. The URL stays the same.
- **Your own domain** (like `rangpahadi.in`): buy it from any registrar, then add it under GitHub **Settings** → **Pages** → **Custom domain**.
- **Free limits:** Google Apps Script easily handles a studio's traffic, which is thousands of visits a day.

---

## Upgrade to version 2

Version 2 adds:

- UPI payment QR codes
- gift vouchers and workshop passes
- coupon codes
- confirmation and reminder emails
- a waitlist
- a photo gallery
- workshop photos
- reviews
- a "Find my workshop" quiz
- the Try Aipan drawing canvas
- a Hindi / English switch
- a map
- group enquiries
- Google search events

### 1. Update the Google Sheet script (5 minutes)

1. Open your Sheet and go to **Extensions** → **Apps Script**.
2. Select everything in `Code.gs` and delete it. Paste in the new `Code.gs`, then click **Save**.
3. Choose **setup** in the function list and click **Run**. Allow the new permissions when asked (email, Google Drive for the gallery, and scheduled reminders).
   - Your existing workshops and bookings are kept. Setup only adds new columns and tabs.
4. Click **Deploy** → **Manage deployments** → the **pencil** icon → Version: **New version** → **Deploy**. The web app URL stays the same.

### 2. Update the website on GitHub (2 minutes)

1. Open your repository, then click **Add file** → **Upload files**.
2. Upload `index.html`, `app.js`, `style.css` and `qrcode.js`, plus the logo files if you haven't uploaded them yet.
3. Click **Commit changes**.
4. **Don't** upload `config.js`. Yours already has your Sheet link.

### 3. Fill in the new settings (Settings tab)

| Key | What to put |
| --- | --- |
| `upi` | Your UPI ID. Students get a QR code with the exact amount to pay. |
| `email` | Studio email. It's shown on the site, and replies to booking emails go here. |
| `notifyEmail` | Your email. You get an email for every booking, voucher, review and enquiry. |
| `address` | The full studio address. The map and directions use it. |
| `galleryFolderId` | The link of a Google Drive folder with workshop photos (see below). |
| `googleReviewUrl` | Your Google review link (Google Business Profile → "Ask for reviews"). |
| `siteUrl` | Your website address, used in emails and on voucher cards. |
| `voucherAmounts`, `passPrice`, `passValue` | Gift voucher amounts, and the workshop pass offer (default: pay ₹5,000, get ₹6,000). |
| `taglineHi`, `aboutHi` | Optional Hindi text for the हिं button. |

---

## Using the new features

| Feature | How it works |
| --- | --- |
| **UPI QR** | After booking, students see a QR code with the amount filled in. When the money arrives, tick **Paid** in Bookings. |
| **Confirmation & reminder emails** | If a student gives their email, they get a confirmation straight away and a reminder at about 9 AM the day before. The **Reminder sent** column fills in by itself. |
| **Workshop photos** | In **Workshops → Photo**, paste a Google Drive share link (set to "Anyone with the link") or any https image link. The photo shows on the card as "What you'll make". |
| **Gallery** | Make a Google Drive folder called "Rang Pahadi Gallery" and drop photos in. Paste the folder link into `galleryFolderId`. The newest 24 photos show on the site. The file name, or the file's description in Drive, becomes the caption. The site updates within about 15 minutes. |
| **Gift vouchers & passes** | Orders arrive in the **Vouchers** tab as "Awaiting payment". When the UPI payment arrives, tick **Paid**. The code then works at booking, and its **Balance** goes down as it's used. |
| **Coupon codes** | In **Coupons**, add a code, choose Type `%` or `₹`, enter a Value, and optionally a **Valid until** date and **Max uses**. Tick **Active** to switch it on. Two examples are there (switched off). |
| **Waitlist** | When a workshop is full, people can join the **Waitlist** tab. If someone cancels, message them and tick **Contacted**. |
| **Reviews** | Reviews from the website go to the **Reviews** tab. Tick **Show on website** to publish one. Nothing shows without your approval. |
| **Group enquiries** | The "Send an enquiry" form saves to the **Enquiries** tab and emails you. |
| **Hindi** | The हिं button switches the site to Hindi. For workshop names, fill in **Title (Hindi)** and **Description (Hindi)** in Workshops. |
| **Google search events** | Your upcoming workshops are described to Google automatically, so they can show up in Google's event results. Check one at search.google.com/test/rich-results. |
| **Try Aipan & quiz** | These work on their own. Nothing to set up. |
