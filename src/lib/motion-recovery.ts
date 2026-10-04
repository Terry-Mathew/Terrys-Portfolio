export const MOTION_READY_EVENT = "portfolio:motion-ready";
export const MOTION_BOOT_TIMEOUT_MS = 5000;

// This parser-blocking script must work without the client bundle.
export const MOTION_BOOTSTRAP = `(()=>{const root=document.documentElement;const timer=setTimeout(()=>{root.setAttribute('data-motion-failed','');root.classList.remove('js')},${MOTION_BOOT_TIMEOUT_MS});document.addEventListener('${MOTION_READY_EVENT}',()=>clearTimeout(timer),{once:true});root.classList.add('js')})()`;

export function revealMotionFallback(root: HTMLElement) {
  root.setAttribute("data-motion-failed", "");
  root.classList.remove("js");
}

export function markMotionReady(document: Document) {
  document.dispatchEvent(new Event(MOTION_READY_EVENT));
}
