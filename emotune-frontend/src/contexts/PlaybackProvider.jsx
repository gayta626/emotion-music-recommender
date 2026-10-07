import { useCallback, useMemo, useRef, useState } from "react";
import { PlaybackContext } from "./playbackContext";
import { loadLastMood, saveLastMood } from "../utils/moodSession";

const PlaybackProvider = ({ children }) => {
    const [playlistsVersion, setPlaylistsVersion] = useState(0);
    const [nowPlaying, setNowPlaying] = useState(null);
    const [lastMood, setLastMoodState] = useState(() => loadLastMood());
    const playerRef = useRef(null);

    // PlayerHost dang ky 1 ham nhan lenh; tra ve ham huy dang ky (dung trong cleanup cua effect)
    const registerPlayer = useCallback((handler) => {
        playerRef.current = handler;
        return () => {
            if (playerRef.current === handler) playerRef.current = null;
        };
    }, []);

    const send = useCallback((command) => playerRef.current?.(command), []);

    const playScanResult = useCallback((result) => send({ kind: "scan", result }), [send]);
    const playPlaylist = useCallback((playlistId, start = 0) => send({ kind: "playlist", playlistId, start }), [send]);
    const playQueue = useCallback((queue, start = 0) => send({ kind: "queue", queue, start }), [send]);
    const playSong = useCallback((song) => send({ kind: "song", song }), [send]);

    const setLastMood = useCallback((emotion) => setLastMoodState(saveLastMood(emotion)), []);
    const refreshPlaylists = useCallback(() => setPlaylistsVersion((v) => v + 1), []);

    const value = useMemo(() => ({
        playScanResult, playPlaylist, playQueue, playSong, registerPlayer,
        lastMood, setLastMood, nowPlaying, setNowPlaying, playlistsVersion, refreshPlaylists,
    }), [playScanResult, playPlaylist, playQueue, playSong, registerPlayer,
        lastMood, setLastMood, nowPlaying, playlistsVersion, refreshPlaylists]);

    return <PlaybackContext.Provider value={value}>{children}</PlaybackContext.Provider>;
};

export default PlaybackProvider;
