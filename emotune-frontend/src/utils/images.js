import { API_URL } from '../config'

// Anh cua 1 bai hat: anh bia that (covers/, do `npm run fetch-images` tai) -> khong co thi anh ca si -> null
// (anh ca si: backend da tra san anh co lon neu co, khong thi avatar nho)
export const coverUrl = (song) => song?.cover ? `${API_URL}/covers/${song.cover}` : null;
export const songImageUrl = (song) => coverUrl(song)
    || (song?.artist_avatar ? `${API_URL}/avatars/${song.artist_avatar}` : null);
