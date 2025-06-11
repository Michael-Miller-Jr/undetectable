# Undetectable

![icon128](https://github.com/user-attachments/assets/fab0ba65-415a-4747-80f0-dcbf983f2962)

**Undetectable** is a Chrome extension that prevents websites from detecting ad blockers and hides annoying messages asking you to disable them. It simulates normal ad behavior, spoofs common detection variables, and logs detection attempts locally—all while giving you full control via an intuitive popup and options interface.

---

![stealth-level](https://github.com/user-attachments/assets/0b91e86d-a401-40ca-990c-5cb1e5873b94)

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
- Dark mode UI  
- Optional remote sync or import/export rules  
- Smarter fingerprint evasion

---

## 📜 License

GPL-3.0 license

---

## 🙌 Contributing

Pull requests and issues are welcome! Whether it's improving stealth behavior or UI polish, feel free to contribute.

---

## 🧊 Final Note

Undetectable is for users who want peace of mind and a smoother browsing experience—without being harassed by popup overlays, page blocks, or false ad prompts. Install it, toggle it, and browse quietly.
