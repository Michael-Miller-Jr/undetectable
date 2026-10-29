# Undetectable

![icon128](https://github.com/user-attachments/assets/d7a1a299-2d34-46d1-a14c-19d791d701d2)

**Undetectable** is a Chrome extension designed to work alongside your ad blocker - not replace it. While it doesn't block ads itself, it helps prevent websites from detecting that you're using an ad blocker, basically an ad block detection bypass. By simulating normal ad behavior, spoofing common detection methods, and hiding anti-adblock warnings, it keeps your browsing smooth and uninterrupted. All detection attempts are logged locally, and you stay in control with a clean, user-friendly popup and options interface.

For the sake of clarity: When the description says it "simulates normal ad behavior" or "spoofs normal ads," it means that the extension:
- Creates decoy ad elements like `<div class="adsbygoogle">` or `<ins class="ad-slot">` that look like real ads to detection scripts.
- Fakes global ad variables like window.adsbygoogle or window.google_ad_status so scripts that try to detect whether ads are loading see values that indicate ads are loading.
- Overrides or fills in attributes like data-ad-status="unfilled" → "filled" to make the page believe ads successfully loaded.

This tricks anti-adblock scripts into thinking ads are working normally, even though your ad blocker is still quietly blocking them in the background.

So to clarify: the extension doesn't block or display real ads, but it fakes the presence of ads just enough to fool detection mechanisms. That's the key to staying “undetectable.”

## 💡 Why This Exists
The author of this extension believes users should have the freedom to browse the internet without constant interruptions or coercive messaging. Just as individuals can walk down a street and choose to ignore advertisements in the physical world, they should be able to do the same online.

Undetectable was created to support this principle:
A quiet, respectful browsing experience where users - not aggressive scripts or popup warnings - remain in control.

This tool isn't about circumventing fair monetization; it's about pushing back against disruptive, invasive practices that degrade the web experience. While your ad blocker handles the job of stopping ads from being loaded or shown, Undetectable works alongside it to prevent detection scripts from realizing that ads are missing. It covers your tracks by faking the presence of ads, helping avoid nag screens, overlays, or content blocks.

Even major platforms and ad networks (including Google) have unknowingly served malicious ads, highlighting a serious flaw in the system: there's often no real-time oversight or "lifeguard on duty" when things go wrong. Being forced to swim in a sea of ads without that safety net is inherently risky. Furthermore, the FBI has stated "Use an ad blocking extension when performing internet searches" - Reference: (https://www.ic3.gov/PSA/2022/PSA221221) 

When paired with a trusted ad blocker, Undetectable adds another layer of control and protection - quietly helping users avoid both annoyance and potential harm.

---

## 🚀 Features

- **Block Ad Block Detection**  
  Prevents websites from detecting your ad blocker by spoofing ads, patching globals, and injecting decoys.

- **Hide Disable-Adblock Notices**  
  Automatically removes modals, banners, and overlays that ask you to turn off your ad blocker.

- **Inject Fake Ad Slots**  
  Simulates "filled" ad containers using hidden or dummy elements to fool detection scripts.

- **Spoof Detection Variables**  
  Mocks `adsbygoogle`, `google_ad_status`, and other commonly checked global variables.

- **Log Detection Attempts Locally**  
  Tracks and stores detection attempts in `chrome.storage.local`—view, export, or clear logs via the Options page.

- **Enable/Disable with One Click**  
  Use the popup toggle to instantly enable or disable stealth functionality. Includes a quick "Reload Page" button.

---

## 🧱 Works Best With These Ad Blockers
Undetectable is designed to complement popular ad blockers, not replace them. It works best when used alongside the following:

- **uBlock Origin**
Lightweight and highly customizable, with minimal resource usage.

- **Adblock Plus**
Widely used and easy to configure, with options for filter subscriptions.

- **Ghostery**
Focuses on privacy and tracker blocking, with some ad-blocking capabilities.

- **Brave Browser (Built-in Shield)**
Built-in ad and tracker blocking, which Undetectable enhances by helping suppress detection prompts.

- **Privacy Badger**
Created by the EFF, this tool blocks trackers and some ads based on behavior.

These tools handle the blocking. Undetectable ensures you don’t get hassled for using them.

---

## 🛠️ Installation

To protect your privacy and avoid detection, **Undetectable must be loaded manually as an unpacked extension**:

1. Download or clone this repository.
2. Open Chrome and go to `chrome://extensions/`
3. Enable **Developer mode** (top right).
4. Click **Load unpacked** and select the extension folder.

Undetectable will now appear in your toolbar and work silently across supported sites.

---

## ❓ Why Load as Unpacked?

### 🚫 Avoid Extension Fingerprinting

Chrome Web Store extensions have **permanent, globally known IDs**. Websites can detect these using:

- Requests to `chrome-extension://<ID>/`
- JS fingerprinting and DOM probes
- Known file or behavior signatures

**Unpacked extensions use randomized IDs**, making detection virtually impossible.

---

### 🔒 Avoid Store Restrictions & Auto-Updates

Google prohibits or limits functionality like:

- Spoofing detection variables
- Blocking adblock popups
- Interfering with ad scripts

By remaining unpacked:

- ✅ Avoids extension takedowns or forced restrictions  
- ✅ Retains complete privacy and control  
- ✅ Developer decides when and how the extension is updated, end users must update for new features and improvements

---

## 📁 File Structure

```
undetectable/
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── popup.html
├── popup.js
├── options.html
├── options.js
├── universal-stealth.js
├── youtube-stealth.js
├── stealth.min.js
├── injector.js
├── manifest.json
└── README.md
```

---

## ⚙️ Permissions Used

```json
{
  "permissions": ["storage"],
  "host_permissions": ["<all_urls>"]
}
```

- `storage`: For saving toggle states and detection logs.  
- `<all_urls>`: Needed to run stealth logic on any site (excluding YouTube, which uses its own logic).

---

## 🔐 Safe and Secure Practices

### ✅ 1. No Remote Code Execution  
- All scripts (e.g., `universal-stealth.js`, `youtube-stealth.js`) are locally stored and listed in `manifest.json`.  
- No use of `eval()`, `new Function()`, or dynamic script loading from external sources.

### ✅ 2. Minimal and Appropriate Permissions

```json
{
  "permissions": ["storage"],
  "host_permissions": ["<all_urls>"]
}
```

- `storage` is used solely for saving logs and user settings.  
- `<all_urls>` is justified due to the extension’s purpose of detecting and preventing adblock triggers across the web.

### ✅ 3. No Access to Sensitive APIs  
The extension does **not** use or request:  
- `tabs.executeScript`  
- `cookies`  
- `webRequest`  
- `history`  
- `identity` or `sessions`

### ✅ 4. Local-Only Logging  
- Detection logs are saved using `chrome.storage.local`.  
- No data is ever sent externally.  
- Logs can be viewed, cleared, or exported at any time.

### ✅ 5. Clean UI Input Handling  
- No user input is parsed or inserted into the DOM unsafely.  
- All UI elements (toggles, buttons) are strictly scoped and simple.

---

### ⚠️ Areas to Note (Safe but Worth Awareness)

- **`chrome.tabs.query()` in `popup.js`**  
  Used only to reload the current tab.  
  Does **not** require `tabs` permission under MV3 and does **not** access tab content.

- **Global Spoofing (`adsbygoogle`, `google_ad_status`)**  
  These are spoofed for stealth, which is effective but can be caught by aggressive detection scripts.  
  This is a stealth-evasion tradeoff, not a security concern.

- **`<all_urls>` Access**  
  While necessary, this is a broad permission. It’s safe because:  
  - Doesn’t fetch or execute external scripts  
  - Avoids unsafe APIs  
  - Doesn’t manipulate sensitive page content

---

### ❌ No Known Insecure Patterns

Avoided:  
- `eval()` or `setTimeout('code', ...)`  
- Inline script execution  
- External tracking or analytics  
- Untrusted user input parsing

---

### ✅ Final Verdict

This extension is secure, responsible, and well-designed.  
It follows modern Chrome Extension best practices for:  
- Script isolation  
- Local-only storage  
- Controlled permissions  
- Passive enhancement without violating user trust

---

## 🧪 Use Cases

- Prevent YouTube’s adblock warning overlays  
- Stop annoying popups on blogs or news sites  
- Log which sites are trying to detect ad blockers  
- Keep music playing in the background without interruptions

---

## 💡 Future Enhancements

- Site-specific enable/disable toggle  
- ~~Dark mode UI~~ (Now Included)  
- Optional remote sync or import/export rules  
- ~~Smarter fingerprint evasion~~ (Now Included)

---

## 📜 License

Proprietary / All Rights Reserved (No license declared)
- If a project has no license, you cannot legally reuse, copy, modify, or distribute the code. All rights are reserved by default under copyright law.

---

## 🙌 Contributing

Pull requests and issues are welcome! Whether it's improving stealth behavior or UI polish, feel free to contribute (Please Note: License will remain the same, Proprietary / All Rights Reserved regardless of your contribution).

---

## 🧊 Final Note

Undetectable is for users who want peace of mind and a smoother browsing experience - without being harassed by popup overlays, page blocks, or false ad prompts. Install it, toggle it, and browse quietly.
