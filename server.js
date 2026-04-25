const express = require('express');
const puppeteer = require('puppeteer-core'); // Lightweight core

const app = express();
const PORT = process.env.PORT || 3000;

// আপনার Browserless.io এর API Key এখানে বসান
const BROWSERLESS_API_KEY = '2UNi96uG4emeJdQdcc02deb50049087aa1c434ed5f3f4b3d8'; 

app.get('/samui', async (req, res) => {
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: "?id= required" });

    const url = `https://samui390dod.com/play/${id}`;
    let browser = null;

    try {
        // Render সার্ভারের বদলে ক্লাউড ব্রাউজার ব্যবহার করবে (সুপার ফাস্ট!)
        browser = await puppeteer.connect({
            browserWSEndpoint: `wss://chrome.browserless.io?token=${BROWSERLESS_API_KEY}`,
            defaultViewport: null
        });
        
        const page = await browser.newPage();
        let m3u8Url = null;

        await page.setRequestInterception(true);
        page.on('request', (request) => {
            const reqUrl = request.url();
            if (reqUrl.includes('.m3u8') && !reqUrl.includes('playlist.m3u8')) {
                m3u8Url = reqUrl;
                request.abort(); 
            } else {
                request.continue();
            }
        });

        await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });
        await new Promise(r => setTimeout(r, 2000));
        await browser.close();

        if (m3u8Url) {
            res.redirect(m3u8Url); // সরাসরি Oxoo তে রিডাইরেক্ট!
        } else {
            res.status(500).json({ error: "M3U8 not found." });
        }
    } catch (error) {
        if (browser) await browser.close();
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
