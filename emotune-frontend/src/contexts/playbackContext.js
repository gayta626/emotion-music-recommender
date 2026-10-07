import { createContext, useContext } from "react";

// Kho dung chung giua cac trang (chon nhac) va PlayerHost (phat nhac, luon song trong MainLayout):
// - playScanResult(result): quet xong (hoac chon cam xuc) -> phat bai AI chon
// - playPlaylist(id, start) / playQueue({ name, songs, playlistId }, start) / playSong(song)
// - registerPlayer(fn): PlayerHost dang ky ham nhan lenh (goi thang, khong qua state -> bai va chuyen trang cap nhat cung luc)
// - lastMood { emotion, at }: cam xuc quet gan nhat (icon quet tren header, chon bai tiep khi dang luot)
// - nowPlaying { songId, playlistId }: trang playlist to sang dong dang phat
// - playlistsVersion / refreshPlaylists(): them/xoa bai, tao/xoa playlist xong -> noi khac tai lai
export const PlaybackContext = createContext({
    playScanResult: () => {},
    playPlaylist: () => {},
    playQueue: () => {},
    playSong: () => {},
    registerPlayer: () => () => {},
    lastMood: null,
    setLastMood: () => {},
    nowPlaying: null,
    setNowPlaying: () => {},
    playlistsVersion: 0,
    refreshPlaylists: () => {},
});

export const usePlayback = () => useContext(PlaybackContext);
