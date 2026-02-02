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
 * Clean up OCR text (basic)
 */
export function cleanOCRText(text) {
    if (!text) return "";
    return text
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 2) // Filter out noise
        .join('\n');
}
