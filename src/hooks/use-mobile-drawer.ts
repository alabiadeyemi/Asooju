import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type SyntheticEvent,
} from "react";

/**
 * Mobile drawer state.
 *
 * Keep open/close explicit — never block an intentional close.
 * Only the backdrop ignores the ghost click that iOS fires after the
 * opening tap (so the drawer does not instantly dismiss itself).
 */
export function useMobileDrawer() {
  const [open, setOpen] = useState(false);
  const ignoreOverlayUntilRef = useRef(0);

  const openDrawer = useCallback(() => {
    // Ignore overlay taps briefly; hamburger/X close always works.
    ignoreOverlayUntilRef.current = Date.now() + 350;
    setOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return;

    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);

    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const onOverlayPointerDown = useCallback(
    (event: SyntheticEvent) => {
      if (Date.now() < ignoreOverlayUntilRef.current) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      closeDrawer();
    },
    [closeDrawer]
  );

  return {
    open,
    openDrawer,
    closeDrawer,
    onOverlayPointerDown,
  };
}
