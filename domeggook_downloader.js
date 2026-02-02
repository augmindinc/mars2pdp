import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import DomeggookScraper from './src/domeggookScraper.js';

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
 * Slugify a string to make it folder-name friendly (supports Korean)
 */
function slugify(text) {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\s가-힣-]+/g, '') // Allow Korean characters
        .replace(/--+/g, '-')
        .slice(0, 80);
}

/**
 * Very basic mock translation for the folder name
 * In a real app, you might use a translation API
 */
function translateTitleToEnglish(title) {
    if (!title) return "product";

    // For specific common cases or if we want to be fancy
    // But since we are an AI, we can provide a better name if we are running this.
    // However, as a standalone script, we'll just return the slugified title 
    // unless it's pure Korean, then we might use the ID.
    const isKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(title);
    if (!isKorean) return slugify(title);

    // Fallback to a generic name or use the ID if we can't translate
    // But for the user, I will manually provide the translation for the run below.
    return slugify(title);
}

/**
 * Main function to scrape and download everything
 */
async function scrapeAndDownload(productId) {
    console.log(`🚀 Starting scrape for Domeggook product ID: ${productId}`);

    try {
        const data = await DomeggookScraper(productId);

        // 1. Prepare folder
        let englishTitle = translateTitleToEnglish(data.title);
        // If it's still Korean, let's at least prepend the ID to be unique
        if (/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(englishTitle)) {
            englishTitle = `domeggook-${productId}`;
        }

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

        // 3. Download Detail Images
        console.log('🖼️ Downloading detail images...');
        const detailImageUrls = data.detailImages || [];
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
        let mdContent = `# ${data.title}\n\n`;
        mdContent += `**Product ID:** ${data.productId}\n`;
        mdContent += `**Platform:** Domeggook\n`;

        if (data.options && data.options.length > 0) {
            mdContent += `**Pricing (Options):**\n\n`;
            mdContent += `| 옵션코드 | 옵션명 | 도매꾹판매단가 (+옵션추가금액) | 실판매단가 | 옵션별 수량 |\n`;
            mdContent += `| :--- | :--- | :--- | :--- | :--- |\n`;
            data.options.forEach(opt => {
                mdContent += `| ${opt.code} | ${opt.name} | ${opt.price} | ${opt.realPrice} | ${opt.stock} |\n`;
            });
            mdContent += `\n`;
        } else if (data.prices && data.prices.length > 0) {
            mdContent += `**Pricing:**\n`;
            data.prices.forEach(p => {
                mdContent += `- ${p.qty}: ${p.price}\n`;
            });
            mdContent += `\n`;
        }

        mdContent += `**Store:** ${data.storeInfo?.name}\n\n`;

        mdContent += `## Specifications\n\n`;
        if (data.specs && data.specs.length > 0) {
            data.specs.forEach(spec => {
                mdContent += `- **${spec.attrName}**: ${spec.attrValue}\n`;
            });
        } else {
            mdContent += `No specifications found.\n`;
        }

        mdContent += `\n## Supplier Information (공급사정보)\n\n`;
        if (data.supplierInfo && data.supplierInfo.length > 0) {
            data.supplierInfo.forEach(info => {
                mdContent += `- **${info.label}**: ${info.value}\n`;
            });
        } else {
            mdContent += `No supplier information found.\n`;
        }

        mdContent += `\n## Return/Exchange Information (반품/교환정보)\n\n`;
        if (data.returnInfo && data.returnInfo.length > 0) {
            data.returnInfo.forEach(info => {
                mdContent += `- **${info.label}**: ${info.value}\n`;
            });
        } else {
            mdContent += `No return/exchange information found.\n`;
        }

        mdContent += `\n## Features / Description\n\n`;
        mdContent += `Detail images have been downloaded to the \`images/\` folder.\n\n`;

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
if (process.argv[1].endsWith('domeggook_downloader.js')) {
    const id = process.argv[2];
    if (!id) {
        console.log('Usage: node domeggook_downloader.js <product_id_or_url>');
        process.exit(1);
    }

    // Extract ID from URL if provided (domeggook.com/53294491)
    const idMatch = id.match(/domeggook\.com\/(\d+)/) || id.match(/(\d+)/);
    const productId = idMatch ? idMatch[1] : id;

    scrapeAndDownload(productId);
}

export { scrapeAndDownload };
