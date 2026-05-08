const puppeteer = require('puppeteer');
(async () => {
    try {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        
        page.on('console', msg => {
            if(msg.type() === 'error') {
                console.log('BROWSER ERROR:', msg.text());
            }
        });
        
        page.on('pageerror', error => {
            console.log('PAGE ERROR:', error.message);
        });

        await page.goto('http://localhost:5173/dashboard');
        await new Promise(r => setTimeout(r, 2000));
        
        const palaceLinks = await page.$$('a[href^="/palace/"]');
        if(palaceLinks.length > 0) {
            await palaceLinks[0].click();
            await new Promise(r => setTimeout(r, 4000));
            
            await page.mouse.move(400, 400);
            await new Promise(r => setTimeout(r, 500));
            await page.mouse.move(500, 500);
            await new Promise(r => setTimeout(r, 500));
            await page.mouse.move(600, 600);
            await new Promise(r => setTimeout(r, 1000));
        } else {
            console.log('No palaces found on dashboard');
        }
        
        await browser.close();
    } catch(e) {
        console.error(e);
    }
})();
