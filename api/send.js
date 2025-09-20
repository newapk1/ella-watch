const fetch = require('node-fetch');
const formidable = require('formidable');
const fs = require('fs');
const FormData = require('form-data');

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    if (!BOT_TOKEN || !CHAT_ID) {
        console.error("Server Error: Missing BOT_TOKEN or CHAT_ID.");
        return res.status(500).json({ error: 'Server configuration error.' });
    }

    const form = new formidable.Formidable({
        maxFiles: 5,
        maxFileSize: 5 * 1024 * 1024,
        keepExtensions: true,
    });

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
                const image = images[0];
                // --- گۆڕانکاری لێرەدایە: خوێندنەوەی فایل بۆ بۆفەر ---
                const fileBuffer = fs.readFileSync(image.filepath);
                formData.append('photo', fileBuffer, { filename: image.originalFilename || 'photo.jpg' });
                // ----------------------------------------------------
                formData.append('caption', message);
                formData.append('parse_mode', 'Markdown');
                
                await fetch(`${telegramApiUrl}/sendPhoto`, { method: 'POST', body: formData });

            } else {
                const media = [];
                images.forEach((image, index) => {
                    const attachmentName = `file${index}`;
                    // --- گۆڕانکاری لێرەدایە: خوێندنەوەی فایل بۆ بۆفەر ---
                    const fileBuffer = fs.readFileSync(image.filepath);
                    formData.append(attachmentName, fileBuffer, { filename: image.originalFilename || `photo${index}.jpg` });
                    // ----------------------------------------------------
                    media.push({
                        type: 'photo',
                        media: `attach://${attachmentName}`,
                        caption: index === 0 ? message : '',
                        parse_mode: 'Markdown'
                    });
                });
                formData.append('media', JSON.stringify(media));

                await fetch(`${telegramApiUrl}/sendMediaGroup`, { method: 'POST', body: formData });
            }
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
        // بۆ دیباگکردن، هەڵەکە لە وەڵامدا بنێرەوە
        res.status(500).json({ error: 'Failed to process request', details: error.message, stack: error.stack });
    }
};
