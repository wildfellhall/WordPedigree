import { useEffect, useRef, type ReactNode } from 'react';
import { Flourish } from './Ornaments';

export default function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    const previouslyFocused = document.activeElement as HTMLElement;
    dialog.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { dialog.close(); document.body.style.overflow = previousOverflow; previouslyFocused?.focus(); };
  }, []);
  return <dialog ref={ref} className="folio-dialog" onCancel={onClose} onClick={event => { if (event.target === ref.current) onClose(); }} aria-labelledby="dialog-title">
    <div className="dialog-interior">
      <button className="dialog-close" onClick={onClose} aria-label="Close notes">×</button>
      <h2 id="dialog-title">{title}</h2><Flourish />
      {children}
    </div>
  </dialog>;
}
