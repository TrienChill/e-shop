import React, { createContext, useContext, useState, ReactNode } from "react";

interface WebUIContextType {
  isCartDrawerOpen: boolean;
  openCartDrawer: () => void;
  closeCartDrawer: () => void;
  toggleCartDrawer: () => void;
}

const WebUIContext = createContext<WebUIContextType | undefined>(undefined);

export const WebUIProvider = ({ children }: { children: ReactNode }) => {
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);

  const openCartDrawer = () => setIsCartDrawerOpen(true);
  const closeCartDrawer = () => setIsCartDrawerOpen(false);
  const toggleCartDrawer = () => setIsCartDrawerOpen((prev) => !prev);

  return (
    <WebUIContext.Provider
      value={{
        isCartDrawerOpen,
        openCartDrawer,
        closeCartDrawer,
        toggleCartDrawer,
      }}
    >
      {children}
    </WebUIContext.Provider>
  );
};

export const useWebUI = () => {
  const context = useContext(WebUIContext);
  if (context === undefined) {
    throw new Error("useWebUI must be used within a WebUIProvider");
  }
  return context;
};
