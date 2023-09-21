const fs = require('fs');
const axios = require('axios');
const cheerio = require('cheerio');

const startUrl = process.argv[2];
const depth = parseInt(process.argv[3]);

if (!startUrl || isNaN(depth) || depth < 0) {
    console.error('Usage: node crawler.js <start_url: string> <depth: number>');
    process.exit(1);
}

const results = [];
let crawledCount = 0;
let expectedCount = depth;

async function crawl(url, currentDepth) {
    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
                    '(KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36',
            },
        });

        if (response.status === 403) {
            console.error(`Access to ${url} is forbidden. Skipping.`);
            return;
        }

        const $ = cheerio.load(response.data);

        // Find images on the current page and save them to results
        $('img').each((_, element) => {
            const imageUrl = $(element).attr('src');
            results.push({
                imageUrl,
                sourceUrl: url,
                depth: currentDepth,
            });
        });

        if (currentDepth === depth) {
            return; // Stop crawling further
        } else if(
            currentDepth < depth
        ) {
            const links = [];
            $('a').each((_, element) => {
                const link = $(element).attr('href');
                if (link && link.startsWith('http')) {
                    links.push(link);
                }
            });
            if(links.length >= currentDepth+1) {
                await crawl(links[currentDepth+1], currentDepth + 1);
            } else {
                console.log('no more link found')
                return
            }
        }
        else {
            return
        }
    } catch (error) {
        console.error(`Error crawling ${url}: ${error.message}`);
    } finally {

        crawledCount++; // Increment crawled count for each completed crawl
        if (crawledCount === expectedCount) {
            const jsonData = { results };
            fs.writeFileSync('./results.json', JSON.stringify(jsonData, null, 2));
            console.log('Crawling completed. Results saved to results.json');
        }
    }
}

(async () => {
    await crawl(startUrl, 0);
})();
