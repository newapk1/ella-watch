const fetch = require('node-fetch'); // گەڕایەوە بۆ require
const formidable = require('formidable');
const fs = require('fs');
const FormData = require('form-data');

// تۆکن و ئایدی لە Environment Variables وەردەگیرێن
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

// Vercel پێویستی بەم ڕێکخستنەیە بۆ خوێندنەوەی فایل
module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    if (!BOT_TOKEN || !CHAT_ID) {
        console.error("Server Error: Missing BOT_TOKEN or CHAT_ID.");
        return res.status(500).json({ error: 'Server configuration error.' });
    }

    const form = formidable({ maxFiles: 5, maxFileSize: 5 * 1024 * 1024 });

    try {
        const [fields, files] = await new Promise((resolve, reject) => {
            form.parse(req, (err, fields, files) => {
                if (err) reject(err);
                resolve([fields, files]);
            });
        });

        const getText = (field) => field?.[0] || '';

        const customer_name = getText(fields.customer_name);
        const address = getText(fields.address);
        const phone1 = getText(fields.phone1);
        const phone2 = getText(fields.phone2) || 'نەنووسراوە';
        const watch_code = getText(fields.watch_code) || 'نەنووسراوە';
        const quantity = getText(fields.quantity);
        const notes = getText(fields.notes) || 'نەنووسراوە';
        const lang = getText(fields.language) || 'ku';

        let message = `🔔 **داواکاری نوێ لە ئێلا واچ** 🔔\n\n`;
        message += `👤 **ناوی کڕیار:** ${customer_name}\n`;
        message += `📍 **ناونیشان:** ${address}\n`;
        message += `📞 **مۆبایلی یەکەم:** ${phone1}\n`;
        message += `📞 **مۆبایلی دووەم:** ${phone2}\n`;
        message += `🔢 **کۆدی کاتژمێر:** ${watch_code}\n`;
        message += `📦 **بڕ (دانە):** ${quantity}\n`;
        message += `📝 **تێبینی:** ${notes}\n`;
        message += `🌐 **زمانی فۆرم:** ${lang.toUpperCase()}`;

        const images = files.watch_images || [];
        const telegramApiUrl = `https://api.telegram.org/bot${BOT_TOKEN}`;

        if (images.length > 0 ) {
            const formData = new FormData();
            formData.append('chat_id', CHAT_ID);

            if (images.length === 1) {
                formData.append('caption', message);
                formData.append('parse_mode', 'Markdown');
                formData.append('photo', fs.createReadStream(images[0].filepath));
            } else {
                formData.append('media', JSON.stringify(
                    images.map((image, index) => {
                        const attachmentName = `photo_${index}`;
                        formData.append(attachmentName, fs.createReadStream(image.filepath));
                        return { type: 'photo', media: `attach://${attachmentName}`, caption: index === 0 ? message : '', parse_mode: 'Markdown' };
                    })
                ));
            }
            const url = images.length === 1 ? `${telegramApiUrl}/sendPhoto` : `${telegramApiUrl}/sendMediaGroup`;
            await fetch(url, { method: 'POST', body: formData });

        } else {
            await fetch(`${telegramApiUrl}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: CHAT_ID, text: message, parse_mode: 'Markdown' })
            });
        }

        res.writeHead(302, { Location: '/success.html' });
        res.end();

    } catch (error) {
        console.error('Error processing form:', error);
        res.status(500).json({ error: 'Failed to process request', details: error.message });
    }
};
