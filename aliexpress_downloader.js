import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import AliexpressProductScraper from './src/aliexpressProductScraper.js';

/**
 * Utility to download an image from a URL
 */
async function downloadImage(url, destPath) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        fs.writeFileSync(destPath, buffer);
        return true;
    } catch (error) {
        console.error(`Failed to download image ${url}:`, error.message);
        return false;
    }
}

/**
 * Slugify a string to make it folder-name friendly
 */
function slugify(text) {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')     // Replace spaces with -
        .replace(/[^\w-]+/g, '')  // Remove all non-word chars
        .replace(/--+/g, '-')     // Replace multiple - with single -
        .slice(0, 50);            // Limit length
}

/**
 * Extract all image URLs from description HTML
 */
function extractImagesFromHtml(html) {
    if (!html) return [];
    const $ = cheerio.load(html);
    const images = [];
    $('img').each((i, el) => {
        const src = $(el).attr('src') || $(el).attr('data-src');
        if (src) {
            // Ensure absolute URL
            const absoluteUrl = src.startsWith('//') ? `https:${src}` : src;
            images.push(absoluteUrl);
        }
    });
    return images;
}

/**
 * Main function to scrape and download everything
 */
async function scrapeAndDownload(productId) {
    console.log(`🚀 Starting scrape for product ID: ${productId}`);

    try {
        const data = await AliexpressProductScraper(productId);

        // 1. Prepare folder
        const englishTitle = slugify(data.title || `product-${productId}`);
        const outputDir = path.join(process.cwd(), 'outputs', englishTitle);
        const imagesDir = path.join(outputDir, 'images');

        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
        if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });

        console.log(`📂 Created directory: ${outputDir}`);

        // 2. Download Thumbnail Images
        console.log('🖼️ Downloading thumbnail images...');
        const thumbnailUrls = data.images || [];
        for (let i = 0; i < thumbnailUrls.length; i++) {
            const url = thumbnailUrls[i];
            const ext = path.extname(url).split('?')[0] || '.jpg';
            const fileName = `thumb_${i + 1}${ext}`;
            await downloadImage(url, path.join(imagesDir, fileName));
        }

        // 3. Download Detail Images from description
        console.log('🖼️ Extracting and downloading detail images...');
        const detailImageUrls = extractImagesFromHtml(data.description);
        for (let i = 0; i < detailImageUrls.length; i++) {
            const url = detailImageUrls[i];
            // Skip tracking pixels or small icons if any
            if (url.includes('spacer.gif') || url.includes('pixel')) continue;

            const ext = path.extname(url).split('?')[0] || '.jpg';
            const fileName = `detail_${i + 1}${ext}`;
            await downloadImage(url, path.join(imagesDir, fileName));
        }

        // 4. Create Markdown file
        console.log('📝 Generating markdown file...');
        const price = data.salePrice?.min?.formatedAmount || data.originalPrice?.min?.formatedAmount || 'N/A';

        let mdContent = `# ${data.title}\n\n`;
        mdContent += `**Product ID:** ${data.productId}\n`;
        mdContent += `**Price:** ${price}\n`;
        mdContent += `**Orders:** ${data.orders}\n`;
        mdContent += `**Store:** ${data.storeInfo?.name} (${data.storeInfo?.rating} Positive)\n\n`;

        mdContent += `## Specifications\n\n`;
        if (data.specs && data.specs.length > 0) {
            data.specs.forEach(spec => {
                mdContent += `- **${spec.attrName}**: ${spec.attrValue}\n`;
            });
        } else {
            mdContent += `No specifications found.\n`;
        }

        mdContent += `\n## Features / Description\n\n`;
        // We could extract text from HTML description if needed, 
        // but often the description is just images.
        // Let's at least mention the images are downloaded.
        mdContent += `Detail images have been downloaded to the \`images/\` folder.\n\n`;

        if (data.variants && data.variants.length > 0) {
            mdContent += `## Variants\n\n`;
            data.variants.forEach(variant => {
                mdContent += `- ${variant.title}\n`;
            });
        }

        const mdPath = path.join(outputDir, 'README.md');
        fs.writeFileSync(mdPath, mdContent);

        console.log(`✅ Success! Data saved to ${outputDir}`);
        return outputDir;

    } catch (error) {
        console.error('❌ Error during scrape and download:', error);
        throw error;
    }
}

// If run directly
if (process.argv[1].endsWith('aliexpress_downloader.js')) {
    const id = process.argv[2];
    if (!id) {
        console.log('Usage: node aliexpress_downloader.js <product_id_or_url>');
        process.exit(1);
    }

    // Extract ID from URL if provided
    const idMatch = id.match(/item\/(\d+)\.html/) || id.match(/item\/(\d+)/);
    const productId = idMatch ? idMatch[1] : id;

    scrapeAndDownload(productId);
}

export { scrapeAndDownload };
