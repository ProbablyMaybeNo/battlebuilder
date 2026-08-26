import { forwardRef, useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';

const focusableSelector = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const join = (...values: Array<string | false | undefined>) => values.filter(Boolean).join(' ');

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default' | 'quiet' | 'accent' | 'danger' }>(function Button({ className, variant = 'default', ...props }, ref) {
  return <button ref={ref} className={join('button', `button--${variant}`, className)} type="button" {...props} />;
});

export function IconButton({ label, tooltip, className, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; tooltip?: string }) {
  return <span className="tooltip-wrap"><button className={join('icon-button', className)} type="button" aria-label={label} data-tooltip={tooltip ?? label} {...props}>{children}</button><span className="tooltip" role="tooltip">{tooltip ?? label}</span></span>;
}

export function Menu({ label, trigger, children }: { label: string; trigger: ReactNode; children: (close: () => void) => ReactNode }) {
  const [open, setOpen] = useState(false); const triggerRef = useRef<HTMLButtonElement>(null); const menuRef = useRef<HTMLDivElement>(null); const menuId = useId();
  const close = () => setOpen(false);
  useEffect(() => {
    if (!open) return undefined;
    const timer = window.setTimeout(() => menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus(), 0);
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); close(); triggerRef.current?.focus(); } };
    window.addEventListener('keydown', onKeyDown);
    return () => { window.clearTimeout(timer); window.removeEventListener('keydown', onKeyDown); };
  }, [open]);
  return <div className="menu-wrap"><Button ref={triggerRef} variant="quiet" aria-haspopup="menu" aria-expanded={open} aria-controls={open ? menuId : undefined} onClick={() => setOpen((value) => !value)}>{trigger}</Button>{open && <div ref={menuRef} id={menuId} className="menu" role="menu" aria-label={label}>{children(close)}</div>}</div>;
}

export function MenuItem({ children, onSelect, disabled = false }: { children: ReactNode; onSelect?: () => void; disabled?: boolean }) {
  return <button role="menuitem" className="menu-item" type="button" disabled={disabled} onClick={onSelect}>{children}</button>;
}

export function Drawer({ open, title, label, onClose, children }: { open: boolean; title: string; label?: string; onClose: () => void; children: ReactNode }) {
  const drawerRef = useRef<HTMLElement>(null); const priorFocus = useRef<HTMLElement | null>(null); const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    if (!open) return undefined;
    priorFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const timer = window.setTimeout(() => drawerRef.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus(), 0);
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape' && !event.defaultPrevented) { event.preventDefault(); onCloseRef.current(); } };
    window.addEventListener('keydown', onKeyDown);
    return () => { window.clearTimeout(timer); window.removeEventListener('keydown', onKeyDown); priorFocus.current?.focus(); };
  }, [open]);
  if (!open) return null;
  return <aside ref={drawerRef} className="drawer" aria-label={label ?? title}><div className="drawer__header"><div><p className="eyebrow">Workspace</p><h2>{title}</h2></div><IconButton label={`Close ${title}`} data-autofocus onClick={onClose}>×</IconButton></div><div className="drawer__body">{children}</div></aside>;
}

export function Dialog({ open, title, onClose, children, actions }: { open: boolean; title: string; onClose: () => void; children: ReactNode; actions?: ReactNode }) {
  const dialogRef = useRef<HTMLDivElement>(null); const priorFocus = useRef<HTMLElement | null>(null); const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    if (!open) return undefined;
    priorFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const timer = window.setTimeout(() => dialogRef.current?.querySelector<HTMLElement>('[data-autofocus], button, input')?.focus(), 0);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onCloseRef.current(); return; }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector)];
      if (!focusable.length) return;
      const first = focusable[0]; const last = focusable.at(-1)!;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => { window.clearTimeout(timer); window.removeEventListener('keydown', onKeyDown, true); priorFocus.current?.focus(); };
  }, [open]);
  if (!open) return null;
  return <div className="dialog-backdrop" role="presentation"><div ref={dialogRef} className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><div className="dialog__header"><h2 id="dialog-title">{title}</h2><IconButton label="Close dialog" data-autofocus onClick={onClose}>×</IconButton></div><div className="dialog__body">{children}</div>{actions && <div className="dialog__actions">{actions}</div>}</div></div>;
}

export function Popover({ open, label, children }: { open: boolean; label: string; children: ReactNode }) {
  return open ? <div className="popover" role="dialog" aria-label={label}>{children}</div> : null;
}

export function Tabs({ tabs, selected, onSelect }: { tabs: Array<{ id: string; label: string; content: ReactNode }>; selected: string; onSelect: (id: string) => void }) {
  const baseId = useId(); const current = tabs.find((tab) => tab.id === selected) ?? tabs[0];
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const index = tabs.findIndex((tab) => tab.id === selected);
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length;
    onSelect(tabs[next].id);
  };
  return <div className="tabs"><div className="tabs__list" role="tablist" aria-label="Inspector sections" onKeyDown={onKeyDown}>{tabs.map((tab) => <button key={tab.id} className="tabs__tab" role="tab" type="button" aria-selected={tab.id === current.id} aria-controls={`${baseId}-${tab.id}`} tabIndex={tab.id === current.id ? 0 : -1} onClick={() => onSelect(tab.id)}>{tab.label}</button>)}</div><div id={`${baseId}-${current.id}`} className="tabs__panel" role="tabpanel">{current.content}</div></div>;
}

export function NumberField({ label, value, min, max, onCommit }: { label: string; value: number; min?: number; max?: number; onCommit: (value: number) => void }) {
  const [draft, setDraft] = useState(String(value)); const [error, setError] = useState<string | null>(null);
  useEffect(() => { setDraft(String(value)); }, [value]);
  const commit = () => {
    if (draft.trim() === '') { setError(`${label} is required.`); return; }
    const number = Number(draft);
    if (!Number.isFinite(number) || (min !== undefined && number < min) || (max !== undefined && number > max)) { setError(`Enter a value${min !== undefined ? ` from ${min}` : ''}${max !== undefined ? ` to ${max}` : ''}.`); return; }
    setError(null); onCommit(number);
  };
  return <label className="number-field"><span>{label}</span><input inputMode="decimal" value={draft} aria-invalid={Boolean(error)} aria-describedby={error ? `${label}-error` : undefined} onChange={(event) => setDraft(event.target.value)} onBlur={commit} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }} />{error && <span id={`${label}-error`} className="field-error">{error}</span>}</label>;
}

export interface Toast { id: number; tone: 'info' | 'success' | 'warning'; message: string; }
export function ToastRegion({ toasts }: { toasts: Toast[] }) {
  return <div className="toast-region" aria-live="polite" aria-atomic="true">{toasts.map((toast) => <div key={toast.id} className={`toast toast--${toast.tone}`}>{toast.message}</div>)}</div>;
}
