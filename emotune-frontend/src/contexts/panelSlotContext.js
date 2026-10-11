import { createContext, useContext } from "react";

// O trong cot ben phai cua MainLayout (the DOM). MusicPlayer ve cot "Now playing" vao day bang portal
// -> moi trang thai phat (thoi gian, MV, loi bai) van nam o MusicPlayer, chi cho ve la o cot phai.
export const PanelSlotContext = createContext(null);
export const usePanelSlot = () => useContext(PanelSlotContext);
