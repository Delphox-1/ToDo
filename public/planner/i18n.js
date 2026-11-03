// Language picker and one-time translation of static app markup.
(() => {
    'use strict';
    let language = 'ko';
    try {
        language = localStorage.getItem('todo-ui-language') === 'ja' ? 'ja' : 'ko';
    }
    catch { }
    const { t, html, locale } = ToDoLocale.create(language);
    function staticCopy() {
        document.documentElement.lang = language;
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        const nodes = [];
        while (walker.nextNode())
            nodes.push(walker.currentNode);
        for (const node of nodes) {
            if (node.parentElement.closest('script,style,textarea,[data-user-content]'))
                continue;
            const trimmed = node.textContent.trim().replace(/\s+/g, ' ');
            if (trimmed)
                node.textContent = node.textContent.replace(node.textContent.trim(), t(trimmed));
        }
        for (const el of document.querySelectorAll('[placeholder],[aria-label],[title]')) {
            for (const attr of ['placeholder', 'aria-label', 'title'])
                if (el.hasAttribute(attr))
                    el.setAttribute(attr, t(el.getAttribute(attr)));
        }
        document.title = t(document.title);
    }
    function createPicker() {
        const wrapper = document.createElement('div');
        wrapper.className = 'language-picker';
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'secondary language-button';
        button.setAttribute('aria-label', language === 'ja' ? '表示言語を選択' : '표시 언어 선택');
        button.setAttribute('aria-expanded', 'false');
        button.setAttribute('aria-controls', 'language-menu');
        button.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z"/></svg><span class="language-current">' + (language === 'ja' ? '日本語' : '한국어') + '</span><span class="language-chevron" aria-hidden="true">⌄</span>';
        const menu = document.createElement('div');
        menu.id = 'language-menu';
        menu.className = 'language-menu';
        menu.hidden = true;
        menu.setAttribute('role', 'group');
        menu.setAttribute('aria-label', 'Language / 언어 / 言語');
        const error = document.createElement('p');
        error.className = 'language-error';
        error.hidden = true;
        error.setAttribute('role', 'alert');
        for (const [code, label] of [['ko', '한국어'], ['ja', '日本語']]) {
            const option = document.createElement('button');
            option.type = 'button';
            option.lang = code;
            option.textContent = label;
            option.setAttribute('aria-pressed', String(code === language));
            option.onclick = () => {
                if (code === language) {
                    close();
                    button.focus();
                    return;
                }
                try {
                    localStorage.setItem('todo-ui-language', code);
                }
                catch {
                    error.textContent = language === 'ja'
                        ? '言語設定を保存できませんでした。ブラウザーのストレージ設定を確認してください。'
                        : '언어 설정을 저장하지 못했습니다. 브라우저 저장 공간 설정을 확인해 주세요.';
                    error.hidden = false;
                    return;
                }
                location.reload();
            };
            menu.append(option);
        }
        function close() { menu.hidden = true; button.setAttribute('aria-expanded', 'false'); }
        button.onclick = () => { menu.hidden = !menu.hidden; button.setAttribute('aria-expanded', String(!menu.hidden)); if (!menu.hidden)
            menu.querySelector('[aria-pressed="true"]').focus(); };
        wrapper.addEventListener('keydown', event => {
            if (event.key === 'Escape') {
                close();
                button.focus();
            }
            if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
                event.preventDefault();
                const options = [...menu.querySelectorAll('button')];
                if (menu.hidden) {
                    button.click();
                    return;
                }
                const current = options.indexOf(document.activeElement);
                const index = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1
                    : (current + (event.key === 'ArrowUp' ? -1 : 1) + options.length) % options.length;
                options[index].focus();
            }
        });
        document.addEventListener('click', e => { if (!wrapper.contains(e.target))
            close(); });
        wrapper.append(button, menu, error);
        return wrapper;
    }
    globalThis.ToDoI18n = { t, html, language, locale, createPicker };
    staticCopy();
    const target = document.querySelector('.topbar-actions') || document.querySelector('.auth-card,main');
    target?.prepend(createPicker());
})();
