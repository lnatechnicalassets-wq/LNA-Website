"use client";

import { useEffect } from "react";

export function homepageNavigationHref(href: string) {
  return href === "/#mentors" ? "/?section=mentors#mentors" : href;
}

export function HomepageSectionScroll({ id }: { id: string }) {
  useEffect(() => {
    if (window.location.hash === `#${id}`) {
      document.getElementById(id)?.scrollIntoView?.({ behavior: "instant", block: "start" });
    }
  }, [id]);

  return null;
}
