import { useCallback, useMemo, useState } from "react";
import { PlaybackContext } from "./playbackContext";

const PlaybackProvider = ({ children }) => {
    const [playlistRequest, setPlaylistRequest] = useState(null);
    const [playlistsVersion, setPlaylistsVersion] = useState(0);
    const [nowPlaying, setNowPlaying] = useState(null);
    const [songRequest, setSongRequest] = useState(null);

    // "at" de bam lai cung 1 playlist van tinh la yeu cau moi (phat lai tu dau)
    // Khong chuyen trang: HomePage luon duoc giu trong MainLayout nen nhac phat ngay o thanh duoi
    const playPlaylist = useCallback((playlistId, startIndex = 0) => {
        setPlaylistRequest({ playlistId, startIndex, at: Date.now() });
    }, []);

    const playSong = useCallback((song) => {
        setSongRequest({ song, at: Date.now() });
    }, []);

    const refreshPlaylists = useCallback(() => setPlaylistsVersion((v) => v + 1), []);

    const value = useMemo(
        () => ({ playlistRequest, playPlaylist, songRequest, playSong, playlistsVersion, refreshPlaylists, nowPlaying, setNowPlaying }),
        [playlistRequest, playPlaylist, songRequest, playSong, playlistsVersion, refreshPlaylists, nowPlaying]
    );

    return <PlaybackContext.Provider value={value}>{children}</PlaybackContext.Provider>;
};

export default PlaybackProvider;
