// LLM du phong cho tro ly giong noi: chi goi khi bo luat (assistantRules) khong hieu cau noi.
// Google Gemini Flash (goi MIEN PHI, key tao o aistudio.google.com), tra JSON theo schema co dinh. KHONG tin thang ket qua:
// assistantRules.validateLlmAction kiem lai voi danh muc truoc khi dung.
// Ngoai cac lenh co san, Gemini con: goi y theo mo ta (queue), hoi dap / tro chuyen (answer), nhieu lenh 1 cau (sequence).
// Khong co GEMINI_API_KEY / het luot mien phi (429) / loi mang / qua 8s -> tra null (tro ly noi "chua hieu", khong sap)
const { GoogleGenAI } = require("@google/genai");

// Flash-Lite: do 10/10 voi dung cau lenh that cua tro ly (kho ~70 bai + khuon JSON): 3.5-flash-lite ~1.8s, 3.6-flash ~3.3s,
// 3.8-flash qua 20s khong tra loi (goi free) -> tro ly giong noi can nhanh nen dung Flash-Lite.
// Google doi ten model kha thuong xuyen -> doi bang GEMINI_MODEL trong .env, khong can sua code
const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
const TIMEOUT_MS = 8000;
const COMMANDS = ["pause", "resume", "next", "prev", "volume_up", "volume_down", "mute", "not_for_me", "like", "mv_on", "mv_off"];

// moi truong deu bat buoc (structured outputs) -> truong khong dung thi LLM dien "", "none", 0, []
const STEP_FIELDS = {
    path: { type: "string" },
    kind: { type: "string", enum: ["song", "artist", "playlist", "none"] },
    id: { type: "integer" },
    command: { type: "string", enum: [...COMMANDS, "none"] },
    ids: { type: "array", items: { type: "integer" } },
    title: { type: "string" },
};
const STEP_SCHEMA = {
    type: "object",
    properties: { type: { type: "string", enum: ["navigate", "play", "control", "queue"] }, ...STEP_FIELDS },
    required: ["type", ...Object.keys(STEP_FIELDS)],
    additionalProperties: false,
};
const ACTION_SCHEMA = {
    type: "object",
    properties: {
        type: { type: "string", enum: ["navigate", "play", "mood", "control", "queue", "answer", "sequence", "unknown"] },
        ...STEP_FIELDS,
        emotion: { type: "string", enum: ["happy", "sad", "angry", "surprise", "neutral", "none"] },
        steps: { type: "array", items: STEP_SCHEMA },
        reply: { type: "string" },
    },
    required: ["type", ...Object.keys(STEP_FIELDS), "emotion", "steps", "reply"],
    additionalProperties: false,
};

const RULES = `Bạn là trợ lý giọng nói NYX trong web nghe nhạc EmoTune (web chọn nhạc theo cảm xúc khuôn mặt).
Người dùng nói tiếng Việt; câu đã được chuyển thành chữ nên có thể sai chính tả hoặc thiếu dấu.
Chọn ĐÚNG MỘT hành động:
- navigate: mở một trang. path là một trong: "/" (trang chủ), "/scan" (quét cảm xúc bằng camera), "/now-playing" (màn đang phát), "/lyrics" (lời bài hát), "/stats" (thống kê cảm xúc), "/settings" (cài đặt), "/survey" (khảo sát gu nhạc), "/liked" (bài đã thích), "/artist/<id>" (trang ca sĩ), "/playlist/<id>" (trang playlist).
- play: phát nhạc; kind là song, artist hoặc playlist; id lấy từ danh mục.
- mood: người dùng kể về cảm xúc, tâm trạng, một ngày của họ; emotion là happy, sad, angry, surprise (ngạc nhiên hoặc muốn khám phá điều mới) hoặc neutral.
- control: điều khiển bài đang phát; command là pause, resume, next, prev (bài trước), volume_up, volume_down, mute, not_for_me (không thích, bỏ qua), like (thích / lưu bài), mv_on (mở / xem MV), mv_off (tắt MV).
- queue: người dùng tả kiểu nhạc muốn nghe (hoàn cảnh, hoạt động, thời tiết, "giống bài X"...). Chọn 3–8 bài hợp nhất TRONG danh mục, dựa vào vibe, thể loại, ca sĩ; ids là danh sách id; title là tên ngắn cho danh sách (≤ 5 từ, ví dụ "Tối mưa").
- sequence: người dùng nói NHIỀU lệnh trong một câu ("nhỏ tiếng rồi mở MV rồi bài kế"). steps là các bước theo đúng thứ tự (tối đa 5), mỗi bước là navigate, play, control hoặc queue.
- answer: câu hỏi hoặc trò chuyện không cần đổi nhạc: hỏi về bài đang phát, ca sĩ, nhạc nói chung; chào hỏi; an ủi; kể chuyện vui ngắn. reply là câu trả lời.
- unknown: không hiểu được.
Quy tắc:
- Chỉ dùng id có trong danh mục. Trường không dùng: path "", kind "none", id 0, command "none", ids [], title "", emotion "none", steps [].
- reply luôn bằng tiếng Việt, thân thiện, xưng "mình". Với lệnh: một câu ngắn (dưới 20 từ) bắt đầu bằng "Mình sẽ ..." (lệnh chạy SAU khi bạn nói xong, đừng nói "đã"). Với answer: tối đa 3 câu (dưới 60 từ) vì sẽ được đọc to; không dùng markdown, emoji hay danh sách; answer KHÔNG đổi nhạc nên đừng nói "mình bật nhạc", có thể gợi ý người dùng nói ví dụ "mở nhạc vui".
- Không chắc thông tin (năm phát hành, đời tư ca sĩ...) thì nói là không chắc, đừng bịa. Bạn không tra được Internet.
- Yêu cầu ngoài âm nhạc và trò chuyện nhẹ (làm bài tập, viết code, tin tức...): dùng answer, từ chối khéo một câu và gợi ý nghe nhạc.
- "bài này" = bài đang phát trong phần Ngữ cảnh. Dùng Hội thoại trước để hiểu câu hỏi nối tiếp.`;

const songLine = (s) => `[${s.id}] ${s.title}${s.artist ? ` — ${s.artist}` : ""} · ${s.emotion || "?"} · ${s.genre || "?"}${s.youtube_id ? " · có MV" : ""}`;

// HAM THUAN (unit test duoc): danh muc + ngu canh + lich su -> { system, input } gui cho Gemini.
// Phan co dinh (luat + kho nhac + playlist) nam trong system instruction (giong nhau giua cac cau -> Gemini tu cache);
// phan thay doi moi cau (bai dang phat, cam xuc, lich su, cau noi) nam trong input.
// context: { nowPlaying: song | null, mood: "sad" | null }; history: [{ role: "user" | "assistant", text }]
const buildRequest = (text, catalog, context = {}, history = []) => {
    const songs = catalog.songs.map(songLine).join("\n");
    const artists = catalog.artists.map((a) => `[${a.id}] ${a.name}`).join("\n");
    const playlists = catalog.playlists.map((p) => `[${p.id}] ${p.name}`).join("\n");
    const system = `${RULES}\n\nDanh mục (mỗi bài: [id] tên — ca sĩ · vibe · thể loại)\nBài hát:\n${songs}\nCa sĩ:\n${artists}\nPlaylist:\n${playlists || "(chưa có)"}`;

    const now = context.nowPlaying;
    const lines = [
        "Ngữ cảnh:",
        `- Đang phát: ${now ? songLine(now) : "không có bài nào"}`,
        `- Cảm xúc quét gần nhất: ${context.mood || "chưa quét"}`,
    ];
    if (history.length) {
        lines.push("", "Hội thoại trước:");
        history.forEach((h) => lines.push(`${h.role === "user" ? "Người dùng" : "Trợ lý"}: ${h.text}`));
    }
    lines.push("", `Câu nói: "${text}"`);
    return { system, input: lines.join("\n") };
};

// ly do loi Google tra ve trong body (vd "API key not valid", schema khong hop le) -> log de biet sua gi
const googleMessage = (err) => {
    try {
        const body = typeof err.body === "string" ? JSON.parse(err.body) : err.body;
        return (Array.isArray(body) ? body[0] : body)?.error?.message || null;
    } catch {
        return null;
    }
};

let client = null;
const getClient = () => {
    if (!process.env.GEMINI_API_KEY) return null;
    if (!client) client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    return client;
};

// C11: micro an luc quet mat -> chi hoi "cau nay la cam xuc gi" (khong gui kho nhac -> nhanh, it token)
const MOOD_SCHEMA = {
    type: "object",
    properties: { emotion: { type: "string", enum: ["happy", "sad", "angry", "surprise", "neutral", "none"] } },
    required: ["emotion"],
    additionalProperties: false,
};
const MOOD_RULES = `Bạn đọc một câu người dùng vừa nói (tiếng Việt, đã chuyển thành chữ nên có thể sai chính tả hoặc thiếu dấu) trong lúc web nghe nhạc EmoTune quét khuôn mặt họ.
Cho biết câu đó có kể cảm xúc, tâm trạng hay một ngày của CHÍNH người nói không:
- happy: vui, hào hứng, có chuyện tốt; sad: buồn, mệt mỏi, chán nản, cô đơn, áp lực; angry: bực, tức, khó chịu; surprise: ngạc nhiên hoặc muốn khám phá điều mới; neutral: bình thường, bình yên, thư giãn.
- none: câu không nói về cảm xúc của người nói (ra lệnh, hỏi đáp, nói chuyện với người khác, tên bài hát...).`;

// HAM THUAN (unit test duoc)
const buildMoodRequest = (text) => ({ system: MOOD_RULES, input: `Câu nói: "${text}"` });

// gui 1 yeu cau JSON theo schema -> object, hoac null (khong co key / loi / het luot / qua gio)
const askGemini = async ({ system, input }, schema) => {
    const gemini = getClient();
    if (!gemini) return null;
    try {
        const interaction = await gemini.interactions.create({
            model: MODEL,
            system_instruction: system,
            input,
            // JSON dung khuon schema; suy nghi it ("low") cho tro ly giong noi tra loi nhanh
            response_format: { type: "text", mime_type: "application/json", schema },
            generation_config: { thinking_level: "low", max_output_tokens: 2048 },
            // khong de Google luu lai cau hoi / cau tra loi
            store: false,
        // KHONG tu thu lai: mac dinh SDK thu lai voi moi lan qua gio -> treo rat lau, timeout 8s mat tac dung
        }, { timeout_ms: TIMEOUT_MS, retries: { strategy: "none" } });
        const u = interaction.usage || {};
        console.log(`Gemini: ${u.total_input_tokens ?? "?"} in (${u.total_cached_tokens ?? 0} cache) / ${u.total_output_tokens ?? "?"} out, status=${interaction.status}`);
        if (interaction.status !== "completed" || !interaction.output_text) return null;
        return JSON.parse(interaction.output_text);
    } catch (err) {
        const status = err.statusCode ?? err.status;
        if (status === 429) console.log("Gemini: het luot mien phi (429), thu lai sau / ngay mai");
        else console.log(`Loi goi Gemini${status ? ` (${status})` : ""}:`, googleMessage(err) || err.message);
        return null;
    }
};

const classifyWithLlm = (text, catalog, context, history) => askGemini(buildRequest(text, catalog, context, history), ACTION_SCHEMA);

// -> "sad" | ... | null (khong phai cau ke cam xuc / Gemini khong tra loi duoc)
const moodWithLlm = async (text) => {
    const raw = await askGemini(buildMoodRequest(text), MOOD_SCHEMA);
    return raw && MOOD_SCHEMA.properties.emotion.enum.includes(raw.emotion) && raw.emotion !== "none" ? raw.emotion : null;
};

module.exports = {
    buildRequest: buildRequest,
    buildMoodRequest: buildMoodRequest,
    classifyWithLlm: classifyWithLlm,
    moodWithLlm: moodWithLlm,
};
