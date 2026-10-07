import { createContext, useContext } from "react";

// Kho dung chung giua SideBar (chon playlist) va HomePage (phat nhac):
// - playPlaylist(id): SideBar bao "phat playlist nay" -> HomePage nhan playlistRequest va chuyen sang che do playlist
// - playlistsVersion / refreshPlaylists(): them bai vao playlist xong -> SideBar tai lai so bai
export const PlaybackContext = createContext({
    playlistRequest: null,
    playPlaylist: () => {},
    playlistsVersion: 0,
    refreshPlaylists: () => {},
});

export const usePlayback = () => useContext(PlaybackContext);
