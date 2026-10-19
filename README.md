# Shree Subha Laxmi Jewellery - Live Gold & Silver Rates TV Web App
# श्री शुभ लक्ष्मी ज्वेलरी - प्रत्यक्ष दरभाउ

A live digital rates display board designed specifically for Android TV browsers (1080p / 4K landscape screens) and store displays for **Shree Shubha Laxmi Jewellery (श्री शुभ लक्ष्मी ज्वेलरी)**.

### 📍 Visit Our Store
**Shree Shubha Laxmi Jewellery**  
Thakurbari Road, Ramjanaki Path, Biratnagar  
Koshi Province, Nepal  

**Direct Contact:**  
📞 **+977 9807313993**

---

## 🌟 Key Features

1. **Live Rates Integration**:
   - Fetches official daily rates in real time from **FENEGOSIDA** (Federation of Nepal Gold and Silver Dealers' Association):  
     `https://api.fenegosida.org/api/website/v1/Dashboard/today`
   - Automated refresh countdown timer (default: every 60 seconds) with visual progress ring.

2. **Custom Rate Adjustments (Store Formulas)**:
   - **24K Fine Gold (छापावाल सुन)**: Base Tola Price + **Rs. 500** (`24K Tola = Base + 500`)
   - **22K Hallmark Gold (२२ क्यारेट सुन)**: Calculated as **92% of 24K** (`22K = 24K × 92%`)
   - **Fine Silver (असली चाँदी दर)**: Base Tola Price + **Rs. 15** (`Silver Tola = Base + 15`)
   - Automatically computes 1 Tola and 10 Gram prices alongside day-to-day difference (`▲ +Rs. 500` / `▼ -Rs. 200`).

3. **Optimized for Android TV Browsers**:
   - Fixed `100vh` landscape display (zero vertical scrolling needed).
   - High-contrast royal gold luxury design with metallic gradients and glassmorphism.
   - Large, high-visibility typography readable from across the showroom floor.
   - Screen WakeLock support to prevent TV screen timeout/dimming.
   - Remote control shortcuts:
     - **F** or **Enter**: Toggle true Fullscreen kiosk mode
     - **S**: Open Store Settings Modal (adjust offsets, phone numbers, custom ticker text)
     - **R**: Refresh rates immediately

4. **Rotating Jewellery Showcase**:
   - Smooth 7-second crossfade carousel featuring high-resolution images (`necklace.jpg`, `bangles.jpg`, `rings.jpg`) with authentic Nepali & English captions.

5. **Movable Bottom Ticker (Continuous Marquee)**:
   - Smooth, hardware-accelerated scrolling ticker displaying:
     - Store Name: **श्री शुभ लक्ष्मी ज्वेलरी (Shree Subha Laxmi Jewellery)**
     - Contact numbers & WhatsApp
     - Store Location
     - Certified hallmark notices & festival greetings

6. **Vercel Deployment Ready**:
   - Includes `/api/rates.js` serverless function with edge caching and CORS headers to ensure continuous, error-free API access on Vercel.

---

## 🚀 Running Locally

```bash
# Clone the repository
git clone https://github.com/aman999ver/ratessubha.git
cd ratessubha

# Start the local server
npm start
# or: node server.js
```

Open your browser at **`http://localhost:3000`**.

---

## 🌐 Deploy to Vercel

1. Push this repository to GitHub (`main` branch).
2. Go to [Vercel Dashboard](https://vercel.com/new).
3. Import the `ratessubha` repository.
4. Framework Preset: **Other** (leave Root Directory as `./`).
5. Click **Deploy**!
