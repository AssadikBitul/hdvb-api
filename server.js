const express = require('express');
const puppeteer = require('puppeteer-core');

const app = express();
const PORT = process.env.PORT || 3000;

// Browserless API Key
const BROWSERLESS_API_KEY = '2UNi96uG4emeJdQdcc02deb50049087aa1c434ed5f3f4b3d8'; 

app.get('/samui', async (req, res) => {
    const id = req.query.id;
    const debug = req.query.debug === '1';
    
    if (!id) return res.status(400).json({ error: "?id= required" });

    const url = `https://hrujo406fix.com/play/${id}`;
    let browser = null;
    let networkLogs = [];
    let pageHTML = "";

    try {
        browser = await puppeteer.connect({
            browserWSEndpoint: `wss://chrome.browserless.io?token=${BROWSERLESS_API_KEY}&--ignore-certificate-errors`,
            defaultViewport: null,
            ignoreHTTPSErrors: true
        });
        
        const page = await browser.newPage();
        let m3u8Url = null;

        // Set realistic User-Agent to avoid Bot/Cloudflare blocks
        await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36");

        await page.setRequestInterception(true);
        page.on('request', (request) => {
            const reqUrl = request.url();
            
            if (debug) networkLogs.push(reqUrl);

            // Ignore basic tracker URLs to speed up execution
            if (reqUrl.includes('google-analytics') || reqUrl.includes('pixel.filmstats')) {
                request.abort();
                return;
            }

            if (reqUrl.includes('.m3u8') && !reqUrl.includes('playlist.m3u8')) {
                m3u8Url = reqUrl;
                request.abort(); 
            } else {
                request.continue();
            }
        });

        await page.goto(url, { waitUntil: 'networkidle2', timeout: 25000 });
        
        // Extra wait time to ensure JS decryption finishes
        await new Promise(r => setTimeout(r, 3000));

        if (debug) {
            pageHTML = await page.content();
        }

        await browser.close();

        // If debug is on, return full JSON report
        if (debug) {
            return res.json({
                status: m3u8Url ? "Success" : "Failed",
                extracted_m3u8: m3u8Url,
                total_requests_made: networkLogs.length,
                network_requests: networkLogs,
                page_html_snippet: pageHTML.substring(0, 1500) // First 1500 chars to check for Cloudflare/Errors
            });
        }

        // Normal operation: Redirect to the stream
        if (m3u8Url) {
            res.redirect(m3u8Url); 
        } else {
            res.status(500).json({ error: "M3U8 not found." });
        }
    } catch (error) {
        if (browser) await browser.close();
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
