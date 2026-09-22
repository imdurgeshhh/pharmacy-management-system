'use strict';

const Tesseract = require('tesseract.js');
const fs = require('fs');
const path = require('path');

exports.scanInvoice = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No image uploaded' });
    }

    const imagePath = req.file.path;

    try {
        console.log(`Starting OCR on temporary upload`);
        const { data: { text } } = await Tesseract.recognize(imagePath, 'eng', {
            logger: m => console.log(m)
        });

        // Basic parsing logic to find items, quantities, and prices
        const lines = text.split('\n').filter(line => line.trim().length > 0);

        const parsedData = {
            rawText: text,
            potentialItems: []
        };

        // Heuristic: look for lines that might be line items (contain a number, some text, maybe a price)
        lines.forEach(line => {
            // Trying to match lines with formats like "MedicineName 10 15.50"
            const match = line.match(/^([a-zA-Z\s\-]+)\s+(\d+)\s+([\d\.]+)/);
            if (match) {
                parsedData.potentialItems.push({
                    name: match[1].trim(),
                    qty: parseInt(match[2], 10),
                    price: parseFloat(match[3])
                });
            }
        });

        return res.json({ message: 'OCR completed', data: parsedData });
    } catch (error) {
        console.error('OCR Error:', error);
        return res.status(500).json({ error: 'Failed to process invoice image' });
    } finally {
        // Guaranteed cleanup of uploaded temporary image
        try {
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        } catch (cleanupErr) {
            console.error('Failed to cleanup temporary upload:', cleanupErr.message);
        }
    }
};
