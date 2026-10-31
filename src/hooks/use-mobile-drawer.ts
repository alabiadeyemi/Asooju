import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type SyntheticEvent,
} from "react";

/** iOS WebKit synthesizes click after touchend; ignore closes during that window. */
const CLOSE_GUARD_MS = 450;

/**
 * Mobile drawer open state with iOS ghost-click protection.
 * Newly mounted overlays must not receive the opening tap's synthetic click.
 */
export function useMobileDrawer() {
  const [open, setOpen] = useState(false);
  const [overlayInteractive, setOverlayInteractive] = useState(false);
  const openedAtRef = useRef(0);

  const openDrawer = useCallback(() => {
    openedAtRef.current = Date.now();
    setOverlayInteractive(false);
    setOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setOpen(false);
    setOverlayInteractive(false);
  }, []);

  const toggleDrawer = useCallback(() => {
    setOpen((wasOpen) => {
      if (wasOpen) {
        // Ghost click often retargets the hamburger (z above overlay) and would
        // immediately toggle closed — ignore closes inside the guard window.
        if (Date.now() - openedAtRef.current < CLOSE_GUARD_MS) {
          return true;
        }
        setOverlayInteractive(false);
        return false;
      }
      openedAtRef.current = Date.now();
      setOverlayInteractive(false);
      return true;
    });
  }, []);

  useEffect(() => {
    if (!open) {
      setOverlayInteractive(false);
      return;
    }
    const id = window.setTimeout(() => setOverlayInteractive(true), CLOSE_GUARD_MS);
    return () => window.clearTimeout(id);
  }, [open]);

  // Lock scroll without body position:fixed — that offsets fixed drawers on iOS
  // ("almost open" / clipped right edge).
  useEffect(() => {
    if (!open) return;

    const html = document.documentElement;
    const body = document.body;
    const prev = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      bodyTouch: body.style.touchAction,
      overscroll: body.style.overscrollBehavior,
    };

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.touchAction = "none";
    body.style.overscrollBehavior = "none";

    return () => {
      html.style.overflow = prev.htmlOverflow;
      body.style.overflow = prev.bodyOverflow;
      body.style.touchAction = prev.bodyTouch;
      body.style.overscrollBehavior = prev.overscroll;
    };
  }, [open]);

  const onOverlayPointerDown = useCallback(
    (event: SyntheticEvent) => {
      if (!overlayInteractive) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      closeDrawer();
    },
    [overlayInteractive, closeDrawer]
  );

  return {
    open,
    openDrawer,
    closeDrawer,
    toggleDrawer,
    overlayInteractive,
    onOverlayPointerDown,
  };
}
