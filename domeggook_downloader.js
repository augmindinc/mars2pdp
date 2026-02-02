import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import DomeggookScraper from './src/domeggookScraper.js';
import { performOCR, cleanOCRText } from './src/imageProcessor.js';

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
 */
function translateTitleToEnglish(title) {
    if (!title) return "product";
    const isKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(title);
    if (!isKorean) return slugify(title);
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
        const thumbPaths = [];
        for (let i = 0; i < thumbnailUrls.length; i++) {
            const url = thumbnailUrls[i];
            const ext = path.extname(url).split('?')[0] || '.jpg';
            const fileName = `thumb_${i + 1}${ext}`;
            const fullPath = path.join(imagesDir, fileName);
            if (await downloadImage(url, fullPath)) {
                thumbPaths.push(fullPath);
            }
        }

        // 3. Download Detail Images & OCR
        console.log('🖼️ Downloading detail images & performing OCR...');
        const detailImageUrls = data.detailImages || [];
        let extractedContent = "";
        for (let i = 0; i < detailImageUrls.length; i++) {
            const url = detailImageUrls[i];
            if (url.includes('spacer.gif') || url.includes('pixel')) continue;

            const ext = path.extname(url).split('?')[0] || '.jpg';
            const fileName = `detail_${i + 1}${ext}`;
            const fullPath = path.join(imagesDir, fileName);

            if (await downloadImage(url, fullPath)) {
                // Perform OCR
                const text = await performOCR(fullPath);
                const cleaned = cleanOCRText(text);
                if (cleaned) {
                    extractedContent += `\n### Detail Image ${i + 1} Content\n\n${cleaned}\n`;
                }
            }
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
        }

        mdContent += `\n## Supplier Information (공급사정보)\n\n`;
        if (data.supplierInfo && data.supplierInfo.length > 0) {
            data.supplierInfo.forEach(info => {
                mdContent += `- **${info.label}**: ${info.value}\n`;
            });
        }

        mdContent += `\n## Return/Exchange Information (반품/교환정보)\n\n`;
        if (data.returnInfo && data.returnInfo.length > 0) {
            data.returnInfo.forEach(info => {
                mdContent += `- **${info.label}**: ${info.value}\n`;
            });
        }

        mdContent += `\n## OCR Extracted Content\n\n`;
        mdContent += extractedContent || "No text extracted from images.\n";

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
