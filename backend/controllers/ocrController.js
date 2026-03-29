const Tesseract = require('tesseract.js');
const fs = require('fs');
const path = require('path');

exports.scanInvoice = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No image uploaded' });
    }

    const imagePath = path.join(__dirname, '..', req.file.path);

    try {
        console.log(`Starting OCR on ${imagePath}`);
        const { data: { text } } = await Tesseract.recognize(imagePath, 'eng', {
            logger: m => console.log(m)
        });

        // Basic parsing logic to find items, quantities, and prices
        // Since invoices are unstructured, this is a best-effort parse using regex
        const lines = text.split('\n').filter(line => line.trim().length > 0);

        let parsedData = {
            rawText: text,
            potentialItems: []
        };

        // Heuristic: look for lines that might be line items (contain a number, some text, maybe a price)
        // This is highly simplified
        lines.forEach(line => {
            // Trying to match lines with formats like "MedicneName 10 15.50"
            const match = line.match(/^([a-zA-Z\s\-]+)\s+(\d+)\s+([\d\.]+)/);
            if (match) {
                parsedData.potentialItems.push({
                    name: match[1].trim(),
                    qty: parseInt(match[2], 10),
                    price: parseFloat(match[3])
                });
            }
        });

        // Clean up the uploaded image to save space
        fs.unlinkSync(imagePath);

        res.json({ message: 'OCR completed', data: parsedData });
    } catch (error) {
        console.error('OCR Error:', error);
        res.status(500).json({ error: 'Failed to process invoice image' });
    }
};
