/** Tela cheia para desktop e mobile, com fallback para navegadores sem suporte. */

type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
  msFullscreenElement?: Element | null;
  msExitFullscreen?: () => Promise<void> | void;
};

type FullscreenTarget = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
  msRequestFullscreen?: () => Promise<void> | void;
};

export type FullscreenResult = 'entered' | 'exited' | 'unsupported';

/** Retorna true quando a página (ou um elemento) está em tela cheia. */
export function isFullscreen(): boolean {
  const doc = document as FullscreenDocument;
  return Boolean(
    doc.fullscreenElement ?? doc.webkitFullscreenElement ?? doc.msFullscreenElement,
  );
}

/** Indica se o navegador expõe alguma forma de entrar em tela cheia. */
export function canUseFullscreen(): boolean {
  const target = document.documentElement as FullscreenTarget;
  return Boolean(
    target.requestFullscreen ??
      target.webkitRequestFullscreen ??
      target.msRequestFullscreen,
  );
}

/** Entra ou sai da tela cheia. O alvo padrão é a página inteira (inclui os controles de toque). */
export async function toggleFullscreen(
  target: FullscreenTarget = document.documentElement as FullscreenTarget,
): Promise<FullscreenResult> {
  const doc = document as FullscreenDocument;

  if (isFullscreen()) {
    try {
      if (doc.exitFullscreen) await doc.exitFullscreen();
      else if (doc.webkitExitFullscreen) await doc.webkitExitFullscreen();
      else if (doc.msExitFullscreen) await doc.msExitFullscreen();
    } catch {
      // Alguns navegadores rejeitam a saída fora de um gesto do usuário.
    }
    return 'exited';
  }

  try {
    if (target.requestFullscreen) await target.requestFullscreen({ navigationUI: 'hide' });
    else if (target.webkitRequestFullscreen) await target.webkitRequestFullscreen();
    else if (target.msRequestFullscreen) await target.msRequestFullscreen();
    else return 'unsupported';
    return 'entered';
  } catch {
    return 'unsupported';
  }
}

/** Observa mudanças de tela cheia (inclui prefixos antigos). Retorna a função de limpeza. */
export function subscribeFullscreen(listener: (active: boolean) => void): () => void {
  const handler = (): void => listener(isFullscreen());
  document.addEventListener('fullscreenchange', handler);
  document.addEventListener('webkitfullscreenchange', handler);
  document.addEventListener('MSFullscreenChange', handler);
  return () => {
    document.removeEventListener('fullscreenchange', handler);
    document.removeEventListener('webkitfullscreenchange', handler);
    document.removeEventListener('MSFullscreenChange', handler);
  };
}

let toastTimer = 0;

/** Aviso amigável quando o navegador não suporta tela cheia (ex.: Safari no iPhone). */
export function showFullscreenUnsupported(): void {
  const toast = document.querySelector<HTMLElement>('#toast');
  if (!toast) return;

  const touch = window.matchMedia('(pointer: coarse)').matches;
  toast.textContent = touch
    ? 'Tela cheia indisponível. No iPhone: Compartilhar → Adicionar à Tela de Início.'
    : 'Tela cheia indisponível neste navegador.';

  toast.classList.add('show');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('show'), 3200);
}
