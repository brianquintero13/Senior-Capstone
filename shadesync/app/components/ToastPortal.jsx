"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export default function ToastPortal({ children }) {
  const [mounted, setMounted] = useState(false);
  const [container, setContainer] = useState(null);

  useEffect(() => {
    setMounted(true);
    setContainer(document.body);
    return () => setMounted(false);
  }, []);

  if (!mounted || !container) return null;
  return createPortal(children, container);
}
