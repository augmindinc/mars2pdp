import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { createWorker } from 'tesseract.js';

/**
 * Remove background from an image using the Python script
 */
export async function removeBackground(inputPath) {
    const dir = path.dirname(inputPath);
    const ext = path.extname(inputPath);
    const base = path.basename(inputPath, ext);
    const outputPath = path.join(dir, `${base}_nobg.png`);

    console.log(`🎨 Removing background: ${inputPath} -> ${outputPath}`);

    try {
        const scriptPath = path.join(process.cwd(), 'scripts', 'remove_bg.py');
        execSync(`python3 "${scriptPath}" "${inputPath}" "${outputPath}"`, { stdio: 'inherit' });
        return outputPath;
    } catch (error) {
        console.error(`Failed to remove background for ${inputPath}:`, error.message);
        return null;
    }
}

/**
 * Perform OCR on an image and return text
 */
export async function performOCR(imagePath) {
    console.log(`🔍 Performing OCR on: ${imagePath}`);
    try {
        const worker = await createWorker(['kor', 'eng']);
        const { data: { text } } = await worker.recognize(imagePath);
        await worker.terminate();
        return text;
    } catch (error) {
        console.error(`OCR failed for ${imagePath}:`, error.message);
        return "";
    }
}

/**
 * Clean up OCR text (improved filtering)
 */
export function cleanOCRText(text) {
    if (!text) return "";

    return text
        .split('\n')
        .map(line => line.trim())
        .filter(line => {
            // Remove very short lines
            if (line.length < 2) return false;

            // Count alphanumeric and Korean characters
            const meaningfulChars = line.match(/[a-zA-Z0-9가-힣]/g) || [];
            const symbols = line.match(/[^a-zA-Z0-9가-힣\s]/g) || [];

            // If the line is mostly symbols/noise, discard it
            if (meaningfulChars.length < 2 && symbols.length > 0) return false;

            // If the ratio of meaningful characters is too low, it's probably noise
            const ratio = meaningfulChars.length / line.length;
            if (ratio < 0.3 && line.length > 5) return false;

            // Filter out lines that are just sequences of dots, bars, etc.
            if (/^[.\-|+=_:/\s]+$/.test(line)) return false;

            return true;
        })
        .join('\n')
        .replace(/\n{3,}/g, '\n\n'); // Remove excessive newlines
}
