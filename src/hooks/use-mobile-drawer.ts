import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type SyntheticEvent,
} from "react";

/** iOS WebKit synthesizes click after touchend; ignore closes during that window. */
const CLOSE_GUARD_MS = 400;

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

  // iOS needs position:fixed lock — overflow:hidden alone still rubber-bands.
  useEffect(() => {
    if (!open) return;

    const body = document.body;
    const scrollY = window.scrollY;
    const prev = {
      overflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
      touchAction: body.style.touchAction,
    };

    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
    body.style.touchAction = "none";

    return () => {
      body.style.overflow = prev.overflow;
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.width = prev.width;
      body.style.touchAction = prev.touchAction;
      window.scrollTo(0, scrollY);
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
