document.addEventListener('DOMContentLoaded', () => {
    const langSelector = document.getElementById('lang-selector');
    const formLanguageInput = document.getElementById('form-language');
    let translations = {};

    async function loadTranslations() {
        try {
            const response = await fetch('translations.json');
            translations = await response.json();
            const savedLang = localStorage.getItem('language') || 'ku';
            setLanguage(savedLang);
        } catch (error) {
            console.error("Failed to load translations:", error);
        }
    }

    function setLanguage(lang) {
        if (!translations[lang]) return;

        const isRTL = lang !== 'en';
        document.documentElement.lang = lang;
        document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
        document.body.dir = isRTL ? 'rtl' : 'ltr';

        document.querySelectorAll('[data-key]').forEach(el => {
            const key = el.getAttribute('data-key');
            if (translations[lang][key]) el.textContent = translations[lang][key];
        });

        document.querySelectorAll('[data-key-placeholder]').forEach(el => {
            const key = el.getAttribute('data-key-placeholder');
            if (translations[lang][key]) el.placeholder = translations[lang][key];
        });

        langSelector.value = lang;
        formLanguageInput.value = lang;
        localStorage.setItem('language', lang);
    }

    langSelector.addEventListener('change', (e) => setLanguage(e.target.value));
    loadTranslations();

    const imageInput = document.getElementById('watch_images');
    const previewContainer = document.getElementById('image-preview-container');
    const form = document.getElementById('order-form');
    let selectedFiles = new DataTransfer();

    imageInput.addEventListener('change', () => {
        const maxFiles = 5;
        previewContainer.innerHTML = ''; 
        const newFiles = new DataTransfer();

        Array.from(imageInput.files).forEach(file => {
            if (newFiles.items.length < maxFiles) {
                newFiles.items.add(file);
            }
        });
        
        if (imageInput.files.length > maxFiles) {
            alert(`تەنها دەتوانیت ${maxFiles} وێنە هەڵبژێریت. تەنها ${maxFiles} وێنەی یەکەم هەڵبژێردرا.`);
        }

        selectedFiles = newFiles;
        imageInput.files = selectedFiles.files;

        Array.from(selectedFiles.files).forEach(renderPreview);
    });

    function renderPreview(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const wrapper = document.createElement('div');
            wrapper.classList.add('preview-image-wrapper');

            const img = document.createElement('img');
            img.src = e.target.result;
            img.classList.add('preview-image');

            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.classList.add('remove-image-btn');
            removeBtn.textContent = '×';
            
            removeBtn.addEventListener('click', () => {
                const newFiles = new DataTransfer();
                Array.from(selectedFiles.files).forEach(f => {
                    if (f !== file) {
                        newFiles.items.add(f);
                    }
                });
                selectedFiles = newFiles;
                imageInput.files = selectedFiles.files;
                wrapper.remove();
            });

            wrapper.appendChild(img);
            wrapper.appendChild(removeBtn);
            previewContainer.appendChild(wrapper);
        };
        reader.readAsDataURL(file);
    }
    
    form.addEventListener('submit', (e) => {
        imageInput.files = selectedFiles.files;
    });
});
