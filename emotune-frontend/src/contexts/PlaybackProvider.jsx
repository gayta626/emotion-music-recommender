import { useCallback, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { PlaybackContext } from "./playbackContext";

const PlaybackProvider = ({ children }) => {
    const [playlistRequest, setPlaylistRequest] = useState(null);
    const [playlistsVersion, setPlaylistsVersion] = useState(0);
    const navigate = useNavigate();
    const location = useLocation();

    // "at" de bam lai cung 1 playlist van tinh la yeu cau moi (phat lai tu dau)
    const playPlaylist = useCallback((playlistId) => {
        setPlaylistRequest({ playlistId, at: Date.now() });
        // dang o trang khac (vd /settings) -> ve trang chu, noi co trinh phat
        if (location.pathname !== "/") navigate("/");
    }, [location.pathname, navigate]);

    const refreshPlaylists = useCallback(() => setPlaylistsVersion((v) => v + 1), []);

    const value = useMemo(
        () => ({ playlistRequest, playPlaylist, playlistsVersion, refreshPlaylists }),
        [playlistRequest, playPlaylist, playlistsVersion, refreshPlaylists]
    );

    return <PlaybackContext.Provider value={value}>{children}</PlaybackContext.Provider>;
};

export default PlaybackProvider;
