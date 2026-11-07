"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import type { Mentor } from "@/lib/content";
import { MentorQuickViewModal } from "./mentor-quick-view-modal";

interface MentorQuickViewContextValue {
  selectedMentor: Mentor | null;
  openQuickView: (mentor: Mentor, options?: { forceModal?: boolean }) => void;
  closeQuickView: () => void;
  floatingMentor: Mentor | null;
  setFloatingMentor: (mentor: Mentor | null) => void;
  isFloatingOpen: boolean;
  setIsFloatingOpen: (open: boolean) => void;
  isQuickViewOpen: boolean;
}

const MentorQuickViewContext = createContext<MentorQuickViewContextValue | null>(null);

export function MentorQuickViewProvider({ children }: { children: React.ReactNode }) {
  const [selectedMentor, setSelectedMentor] = useState<Mentor | null>(null);

  const openQuickView = useCallback((mentor: Mentor) => {
    setSelectedMentor(mentor);
  }, []);

  const closeQuickView = useCallback(() => {
    setSelectedMentor(null);
  }, []);

  const isQuickViewOpen = Boolean(selectedMentor);

  return (
    <MentorQuickViewContext.Provider
      value={{
        selectedMentor,
        openQuickView,
        closeQuickView,
        floatingMentor: selectedMentor,
        setFloatingMentor: () => {},
        isFloatingOpen: false,
        setIsFloatingOpen: () => {},
        isQuickViewOpen,
      }}
    >
      {children}
      {selectedMentor && <MentorQuickViewModal mentor={selectedMentor} onClose={closeQuickView} />}
    </MentorQuickViewContext.Provider>
  );
}

const defaultContextValue: MentorQuickViewContextValue = {
  selectedMentor: null,
  openQuickView: () => {},
  closeQuickView: () => {},
  floatingMentor: null,
  setFloatingMentor: () => {},
  isFloatingOpen: false,
  setIsFloatingOpen: () => {},
  isQuickViewOpen: false,
};

export function useMentorQuickView() {
  const ctx = useContext(MentorQuickViewContext);
  return ctx || defaultContextValue;
}
