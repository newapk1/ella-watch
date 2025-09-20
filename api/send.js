import { formidable } from 'formidable';
import fs from 'fs';
import fetch from 'node-fetch';
import FormData from 'form-data';

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

// گرنگ: ئەمە بە Vercel دەڵێت خۆی مامەڵە لەگەڵ body نەکات
export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    if (!BOT_TOKEN || !CHAT_ID) {
        return res.status(500).json({ message: 'Server configuration error' });
    }

    const form = formidable({ multiples: true });

    try {
        const [fields, files] = await form.parse(req);
        
        let images = files.watch_images || [];
        if (images && !Array.isArray(images)) {
            images = [images];
        }

        const getText = (field) => (Array.isArray(field) ? field[0] : field) || '';
        
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

        const telegramApiUrl = `https://api.telegram.org/bot${BOT_TOKEN}`;

        if (images.length > 0 ) {
            const formData = new FormData();
            formData.append('chat_id', CHAT_ID);

            if (images.length === 1) {
                const image = images[0];
                formData.append('photo', fs.createReadStream(image.filepath));
                formData.append('caption', message);
                formData.append('parse_mode', 'Markdown');
                await fetch(`${telegramApiUrl}/sendPhoto`, { method: 'POST', body: formData });
            } else {
                const media = [];
                images.forEach((image, index) => {
                    const attachmentName = `file${index}`;
                    media.push({ type: 'photo', media: `attach://${attachmentName}` });
                    formData.append(attachmentName, fs.createReadStream(image.filepath));
                });
                
                // پەیامەکە تەنها بۆ یەکەم وێنە زیاد دەکەین
                media[0].caption = message;
                media[0].parse_mode = 'Markdown';

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
        console.error(error);
        res.status(500).json({ message: 'Error uploading files', error: error.message });
    }
}
