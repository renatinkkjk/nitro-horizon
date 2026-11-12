/**
 * PWA do Nitro Horizon: registra o service worker (jogo offline e
 * instalável) e cuida do botão "BAIXE NOSSO JOGO" no canto da tela.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'nitro-install-dismissed';

let toastTimer = 0;

/** Mostra o aviso rápido (#toast) por alguns segundos. */
export function showToast(message: string, duration = 4200): void {
  const toast = document.querySelector<HTMLElement>('#toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('show'), duration);
}

/** Registra o service worker (offline + instalável). */
export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return;
  const base = import.meta.env.BASE_URL || '/';
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${base}sw.js`).catch(() => {
      /* sem service worker: o jogo funciona igual, só não fica offline */
    });
  });
}

/**
 * Botão de instalação. Aparece quando o navegador permite instalar o app
 * (Chrome/Edge desktop e Android). No iOS (Safari) não existe prompt, então
 * mostramos o caminho manual.
 */
export function setupInstallButton(): void {
  const button = document.querySelector<HTMLButtonElement>('#install');
  if (!button) return;

  const dismissed = (): boolean => {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  };

  const hide = (): void => {
    button.classList.remove('show');
  };

  // Já está rodando como app instalado? Não mostra o botão.
  if (window.matchMedia('(display-mode: standalone)').matches) {
    hide();
    return;
  }

  if (dismissed()) hide();

  let deferred: BeforeInstallPromptEvent | null = null;

  // O botão fica sempre visível (o usuário pediu no canto da tela): se o
  // navegador permitir instalar, o clique instala; senão, mostra o caminho
  // manual (iOS/Firefox).
  button.classList.add('show');

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferred = event as BeforeInstallPromptEvent;
    if (!dismissed()) button.classList.add('show');
  });

  window.addEventListener('appinstalled', () => {
    deferred = null;
    hide();
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignora */
    }
    showToast('Nitro Horizon instalado! Abre pelo ícone na sua tela. 🏎️');
  });

  const close = button.querySelector<HTMLElement>('[data-close]');
  close?.addEventListener('click', (event) => {
    event.stopPropagation();
    hide();
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignora */
    }
  });

  button.addEventListener('click', async () => {
    if (deferred) {
      deferred.prompt();
      const choice = await deferred.userChoice;
      deferred = null;
      hide();
      if (choice.outcome === 'accepted') {
        showToast('Instalado! 🚀');
      }
      return;
    }

    // Sem prompt nativo (iOS Safari, Firefox): instructions.
    const touch = window.matchMedia('(pointer: coarse)').matches;
    showToast(
      touch
        ? 'No celular: toque em Compartilhar (⬆) → "Adicionar à Tela de Início".'
        : 'No PC: clique no ícone de instalar (⊕) da barra de endereços, ou no menu do navegador → "Instalar Nitro Horizon".',
      6000,
    );
  });
}
