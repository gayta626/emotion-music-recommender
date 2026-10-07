import { createContext, useContext } from "react";

// Kho dung chung giua SideBar / PlaylistPage (chon playlist) va HomePage (phat nhac):
// - playPlaylist(id, startIndex): bao HomePage phat playlist tu bai startIndex
// - playlistsVersion / refreshPlaylists(): them/xoa bai, tao/xoa playlist xong -> noi khac tai lai
// - playSong(song): phat ngay 1 bai (o tim kiem tren header)
// - nowPlaying { songId, playlistId }: bai dang phat (PlaylistPage to sang dong dang phat)
export const PlaybackContext = createContext({
    playlistRequest: null,
    playPlaylist: () => {},
    songRequest: null,
    playSong: () => {},
    playlistsVersion: 0,
    refreshPlaylists: () => {},
    nowPlaying: null,
    setNowPlaying: () => {},
});

export const usePlayback = () => useContext(PlaybackContext);
