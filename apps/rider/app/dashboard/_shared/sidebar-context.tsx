"use client";

import { createContext, useContext } from 'react';

export const SidebarContext = createContext<{
  sidebarLocked: boolean;
  sidebarOpen: boolean;
}>({
  sidebarLocked: false,
  sidebarOpen: false,
});

export const useSidebar = () => useContext(SidebarContext);
