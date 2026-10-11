import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import api from "../api";
import { PlaybackContext } from "./playbackContext";
import { loadLastMood, saveLastMood } from "../utils/moodSession";

const PlaybackProvider = ({ children }) => {
    const [playlistsVersion, setPlaylistsVersion] = useState(0);
    const [nowPlaying, setNowPlaying] = useState(null);
    const [lastMood, setLastMoodState] = useState(() => loadLastMood());
    // bai da thich (♥), moi nhat truoc — giu o day de thanh phat, man loi, trang Liked Songs cung thay 1 danh sach
    const [likedSongs, setLikedSongs] = useState([]);
    const likedRef = useRef(likedSongs);
    useEffect(() => { likedRef.current = likedSongs; });
    const playerRef = useRef(null);

    useEffect(() => {
        api.get("/likes").then((res) => setLikedSongs(res.data)).catch(() => { });
    }, []);

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
    const control = useCallback((command) => send({ kind: "control", command }), [send]);

    const setLastMood = useCallback((emotion) => setLastMoodState(saveLastMood(emotion)), []);
    const refreshPlaylists = useCallback(() => setPlaylistsVersion((v) => v + 1), []);

    // bam ♥: doi mau NGAY (khong cho server), goi API sau; loi -> tra lai nhu cu.
    // Xong thi tai lai danh sach (bai tu /suggest thieu album, thoi luong -> trang Liked Songs can du lieu day du)
    const toggleLike = useCallback((song) => {
        const before = likedRef.current;
        const wasLiked = before.some((s) => s.id === song.id);
        setLikedSongs(wasLiked
            ? before.filter((s) => s.id !== song.id)
            : [{ ...song, added_at: new Date().toISOString() }, ...before]);
        (wasLiked ? api.delete(`/likes/${song.id}`) : api.post(`/likes/${song.id}`))
            .then(() => api.get("/likes"))
            .then((res) => setLikedSongs(res.data))
            .catch(() => setLikedSongs(before));
        return !wasLiked;
    }, []);
    const likedIds = useMemo(() => new Set(likedSongs.map((s) => s.id)), [likedSongs]);

    const value = useMemo(() => ({
        playScanResult, playPlaylist, playQueue, playSong, control, registerPlayer,
        lastMood, setLastMood, nowPlaying, setNowPlaying, playlistsVersion, refreshPlaylists,
        likedSongs, likedIds, toggleLike,
    }), [playScanResult, playPlaylist, playQueue, playSong, control, registerPlayer,
        lastMood, setLastMood, nowPlaying, playlistsVersion, refreshPlaylists,
        likedSongs, likedIds, toggleLike]);

    return <PlaybackContext.Provider value={value}>{children}</PlaybackContext.Provider>;
};

export default PlaybackProvider;
