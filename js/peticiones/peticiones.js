
    document.addEventListener('DOMContentLoaded', () => {
    const form    = document.getElementById('contact-form');
    const btn     = document.getElementById('submit-button');
    const box     = document.getElementById('form-alert');
    const iframe  = document.getElementById('hidden_iframe');

    const COOLDOWN_MS = 60000; // 60s
    let submitted = false;
    let cooldownTimer = null;

    // --- helpers ---
    const now = () => Date.now();
    const getCooldownUntil = () => parseInt(localStorage.getItem('contactCooldownUntil') || '0', 10);
    const setCooldownUntil = (ts) => localStorage.setItem('contactCooldownUntil', String(ts));
    const clearCooldownUntil = () => localStorage.removeItem('contactCooldownUntil');

    function startCooldown(ms) {
        const until = now() + ms;
        setCooldownUntil(until);
        applyCooldown();
    }

    function applyCooldown() {
        const until = getCooldownUntil();
        if (until > now()) {
        btn.disabled = true;
        btn.dataset.defaultText = btn.dataset.defaultText || btn.textContent;

        function tick() {
            const remaining = Math.max(0, until - now());
            const secs = Math.ceil(remaining / 1000);
            btn.textContent = `Espera ${secs}s`;
            if (remaining <= 0) {
            stopCooldown();
            }
        }
        tick();
        clearInterval(cooldownTimer);
        cooldownTimer = setInterval(tick, 1000);
        } else {
        stopCooldown();
        }
    }

    function stopCooldown() {
        clearInterval(cooldownTimer);
        clearCooldownUntil();
        btn.disabled = false;
        btn.textContent = btn.dataset.defaultText || 'Enviar Petición';
    }

    function showMessage(type, text, autoHideMs) {
        if (!box) return;
        box.className = `mt-2 alert alert-${type}`;
        box.textContent = text;
        box.style.display = 'block';
        if (autoHideMs) {
        setTimeout(() => {
            box.style.display = 'none';
        }, autoHideMs);
        }
    }

    // Aplica cooldown si venimos de una sesión previa
    applyCooldown();

    form.addEventListener('submit', (e) => {
        // Si aún está en cooldown, bloquea
        if (getCooldownUntil() > now()) {
        e.preventDefault();
        const secs = Math.ceil((getCooldownUntil() - now()) / 1000);
        showMessage('warning', `Por favor espera ${secs}s antes de enviar otra petición.`, 5000);
        return;
        }

        submitted = true; // Marca que este submit es nuestro

        // UI enviando...
        btn.disabled = true;
        btn.dataset.oldText = btn.textContent;
        btn.textContent = 'Enviando…';
        if (box) { box.style.display='none'; box.className='mt-2'; box.textContent=''; }
        // El envío lo maneja el navegador (target=iframe)
    });

    iframe.addEventListener('load', () => {
        // Ignora cargas del iframe que no provienen de un submit real
        if (!submitted) return;
        submitted = false;

        form.reset();
        showMessage('success', 'Hemos recibido tu petición y la atenderemos. ¡Dios te bendiga!', 5000);

        // Rehabilita botón y arranca cooldown
        btn.disabled = false;
        btn.textContent = btn.dataset.oldText || 'Enviar Petición';
        startCooldown(COOLDOWN_MS);
    });
    });
