const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const adminUserModel = require("../model/adminUserModel");
const { SAMPLE_USERNAMES } = require("./adminService");
const faceSamples = require("./faceSamples");

// Quan ly tai khoan tren trang admin (doi quyen, khoa, dat lai mat khau, xoa, xem chi tiet 1 nguoi).

const ROLES = ["user", "admin"];
const HISTORY_LIMIT = 100;
const TOP_LIMIT = 10;
// mat khau tam: bo cac ky tu de nham (0/O, 1/l/I) vi admin doc cho nguoi dung chep lai
const TEMP_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
const TEMP_LENGTH = 10;

const fail = (status, message) => {
    const err = new Error(message);
    err.status = status;
    return err;
};

// Ham thuan: admin (actorId) co duoc lam `action` voi tai khoan `target` khong? -> null = duoc, { status, message } = khong
// action: 'role' | 'lock' | 'unlock' | 'reset' | 'delete'
// Luat: (1) khong tu doi quyen / khoa / xoa chinh minh -> luon con it nhat 1 admin, khong tu khoa minh ngoai;
//       (2) khong khoa / xoa admin khac -> phai go quyen admin truoc (tranh bam nham 1 phat mat tai khoan quan tri)
const checkUserAction = (actorId, target, action) => {
    if (!target) return { status: 404, message: "User not found" };
    const self = target.id === actorId;
    if (self && ["role", "lock", "delete"].includes(action)) {
        return { status: 409, message: "You can't change your own role, lock or delete your own account" };
    }
    if (target.role === "admin" && ["lock", "delete"].includes(action)) {
        return { status: 409, message: "Remove the admin role first" };
    }
    return null;
};

// mat khau tam ngau nhien (crypto, khong dung Math.random) — du dai cho luat dang ky (>= 6 ky tu)
const makeTempPassword = (length = TEMP_LENGTH) => {
    const bytes = crypto.randomBytes(length);
    let out = "";
    for (let i = 0; i < length; i++) out += TEMP_ALPHABET[bytes[i] % TEMP_ALPHABET.length];
    return out;
};

// Ham thuan: cac dong (playlist x bai) -> [{ id, name, createdAt, songs: [{ id, title, artist }] }]
const groupPlaylists = (rows) => {
    const byId = new Map();
    for (const r of rows) {
        if (!byId.has(r.id)) byId.set(r.id, { id: r.id, name: r.name, createdAt: r.created_at, songs: [] });
        if (r.song_id != null) byId.get(r.id).songs.push({ id: r.song_id, title: r.title, artist: r.artist });
    }
    return [...byId.values()];
};

// Ham thuan: dem theo (cam xuc, hanh dong) -> so lan quet theo cam xuc + ket qua nghe
const summarizeMoods = (rows) => {
    const scansByEmotion = {};
    const outcomes = { good: 0, neutral: 0, bad: 0, declined: 0 };
    let scans = 0;
    for (const r of rows) {
        if (r.action === "suggested") {
            scansByEmotion[r.emotion] = (scansByEmotion[r.emotion] || 0) + r.count;
            scans += r.count;
        } else if (r.action in outcomes) {
            outcomes[r.action] += r.count;
        }
    }
    const listens = outcomes.good + outcomes.neutral + outcomes.bad + outcomes.declined;
    return { scans, scansByEmotion, outcomes, listens, completion: listens ? outcomes.good / listens : null };
};

const toListItem = (u) => ({
    id: u.id,
    username: u.username,
    role: u.role,
    locked: !!u.locked_at,
    lockedAt: u.locked_at,
    surveyDone: !!u.survey_done_at,
    createdAt: u.created_at,
    sample: SAMPLE_USERNAMES.includes(u.username),
});

const listUsers = async () => (await adminUserModel.listUsers()).map((u) => ({
    ...toListItem(u),
    scans: u.scans,
    listens: u.listens,
    playlists: u.playlists,
    likes: u.likes,
    lastAt: u.last_at,
}));

const getUserDetail = async (userId) => {
    const user = await adminUserModel.findUser(userId);
    if (!user) throw fail(404, "User not found");
    const [taste, moods, history, topSongs, preferences, playlists, liked] = await Promise.all([
        adminUserModel.getTaste(userId),
        adminUserModel.getMoodCounts(userId),
        adminUserModel.getHistory(userId, HISTORY_LIMIT),
        adminUserModel.getTopSongs(userId, TOP_LIMIT),
        adminUserModel.getTopPreferences(userId, TOP_LIMIT),
        adminUserModel.getPlaylists(userId),
        adminUserModel.getLiked(userId),
    ]);
    return {
        user: toListItem(user),
        taste,
        summary: summarizeMoods(moods),
        history: history.map((h) => ({
            id: h.id, createdAt: h.created_at, emotion: h.emotion, confidence: h.confidence,
            action: h.action, songId: h.song_id, title: h.title, artist: h.artist,
        })),
        historyLimit: HISTORY_LIMIT,
        topSongs: topSongs.map((s) => ({ id: s.id, title: s.title, artist: s.artist, plays: s.plays, lastPlayed: s.last_played })),
        preferences: preferences.map((p) => ({ id: p.id, title: p.title, artist: p.artist, emotion: p.emotion, score: p.score })),
        playlists: groupPlaylists(playlists),
        liked: liked.map((s) => ({ id: s.id, title: s.title, artist: s.artist, likedAt: s.liked_at })),
    };
};

// lay tai khoan dich + kiem tra luat; loi -> nem kem status
const loadTarget = async (actorId, userId, action) => {
    const target = await adminUserModel.findUser(userId);
    const denied = checkUserAction(actorId, target, action);
    if (denied) throw fail(denied.status, denied.message);
    return target;
};

// PATCH /admin/users/:id { role?, locked? } — moi lan 1 thay doi
const updateUser = async (actorId, userId, { role, locked }) => {
    if (role !== undefined) {
        if (!ROLES.includes(role)) throw fail(400, "Role must be 'user' or 'admin'");
        await loadTarget(actorId, userId, "role");
        await adminUserModel.setRole(userId, role);
    } else if (locked !== undefined) {
        if (typeof locked !== "boolean") throw fail(400, "locked must be true or false");
        await loadTarget(actorId, userId, locked ? "lock" : "unlock");
        await adminUserModel.setLocked(userId, locked);
    } else {
        throw fail(400, "Nothing to change");
    }
    return toListItem(await adminUserModel.findUser(userId));
};

// dat mat khau tam moi, tra ve 1 lan duy nhat de admin dua cho nguoi dung (DB chi luu ban bam bcrypt)
const resetPassword = async (actorId, userId) => {
    await loadTarget(actorId, userId, "reset");
    const password = makeTempPassword();
    await adminUserModel.setPasswordHash(userId, await bcrypt.hash(password, 10));
    return { password };
};

const deleteUser = async (actorId, userId) => {
    const target = await loadTarget(actorId, userId, "delete");
    await adminUserModel.deleteUser(userId);
    // anh mat nguoi nay da gop de train lai model (C15) cung xoa theo tai khoan
    faceSamples.removeUserFaces(userId);
    return { deleted: target.username };
};

module.exports = {
    ROLES, TEMP_ALPHABET, TEMP_LENGTH,
    checkUserAction, makeTempPassword, groupPlaylists, summarizeMoods,
    listUsers, getUserDetail, updateUser, resetPassword, deleteUser,
}
