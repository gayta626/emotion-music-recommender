// LLM du phong cho tro ly giong noi: chi goi khi bo luat (assistantRules) khong hieu cau noi.
// Claude Haiku 5.5 (re + nhanh), tra JSON theo schema co dinh. KHONG tin thang ket qua:
// assistantRules.validateLlmAction kiem lai voi danh muc truoc khi dung.
// Khong co ANTHROPIC_API_KEY / loi mang / qua 6s -> tra null (tro ly noi "chua hieu", khong sap)
const { Anthropic } = require("@anthropic-ai/sdk");

const MODEL = "claude-haiku-5-5";

// moi truong deu bat buoc (structured outputs) -> truong khong dung thi LLM dien "", "none", 0
const ACTION_SCHEMA = {
    type: "object",
    properties: {
        type: { type: "string", enum: ["navigate", "play", "mood", "control", "unknown"] },
        path: { type: "string" },
        kind: { type: "string", enum: ["song", "artist", "playlist", "none"] },
        id: { type: "integer" },
        emotion: { type: "string", enum: ["happy", "sad", "angry", "surprise", "neutral", "none"] },
        command: { type: "string", enum: ["pause", "resume", "next", "volume_up", "volume_down", "mute", "not_for_me", "none"] },
        reply: { type: "string" },
    },
    required: ["type", "path", "kind", "id", "emotion", "command", "reply"],
    additionalProperties: false,
};

const SYSTEM_PROMPT = `Bạn là bộ hiểu lệnh của trợ lý giọng nói trong web nghe nhạc EmoTune.
Người dùng nói tiếng Việt; câu đã được chuyển thành chữ nên có thể sai chính tả hoặc thiếu dấu.
Chọn ĐÚNG MỘT hành động:
- navigate: mở một trang. path là một trong: "/" (trang chủ), "/scan" (quét cảm xúc bằng camera), "/now-playing" (màn đang phát), "/lyrics" (lời bài hát), "/stats" (thống kê cảm xúc), "/settings" (cài đặt), "/survey" (khảo sát gu nhạc), "/artist/<id>" (trang ca sĩ), "/playlist/<id>" (trang playlist).
- play: phát nhạc; kind là song, artist hoặc playlist; id lấy từ danh mục.
- mood: người dùng đang kể về cảm xúc, tâm trạng, một ngày của họ; emotion là happy, sad, angry, surprise hoặc neutral.
- control: điều khiển bài đang phát; command là pause, resume, next, volume_up, volume_down, mute hoặc not_for_me.
- unknown: không thuộc các loại trên.
Chỉ dùng id có trong danh mục. Trường không dùng: path "", kind "none", id 0, emotion "none", command "none".
reply: một câu tiếng Việt ngắn (dưới 20 từ), thân thiện, nói điều bạn sẽ làm.`;

const buildUserMessage = (text, catalog) => {
    const songs = catalog.songs.map((s) => `[${s.id}] ${s.title}${s.artist ? ` — ${s.artist}` : ""}`).join("\n");
    const artists = catalog.artists.map((a) => `[${a.id}] ${a.name}`).join("\n");
    const playlists = catalog.playlists.map((p) => `[${p.id}] ${p.name}`).join("\n");
    return `Danh mục\nBài hát:\n${songs}\nCa sĩ:\n${artists}\nPlaylist:\n${playlists || "(chưa có)"}\n\nCâu nói: "${text}"`;
};

let client = null;
const getClient = () => {
    if (!process.env.ANTHROPIC_API_KEY) return null;
    if (!client) client = new Anthropic({ timeout: 6000, maxRetries: 1 });
    return client;
};

const classifyWithLlm = async (text, catalog) => {
    const anthropic = getClient();
    if (!anthropic) return null;
    try {
        const response = await anthropic.messages.create({
            model: MODEL,
            max_tokens: 2048,
            system: SYSTEM_PROMPT,
            messages: [{ role: "user", content: buildUserMessage(text, catalog) }],
            output_config: { effort: "low", format: { type: "json_schema", schema: ACTION_SCHEMA } },
        });
        if (response.stop_reason !== "end_turn") return null;
        const block = response.content.find((b) => b.type === "text");
        return block ? JSON.parse(block.text) : null;
    } catch (err) {
        if (err instanceof Anthropic.APIError) console.log(`Loi goi Claude (${err.status}):`, err.message);
        else console.log("Loi goi Claude:", err.message);
        return null;
    }
};

module.exports = {
    classifyWithLlm: classifyWithLlm,
};
