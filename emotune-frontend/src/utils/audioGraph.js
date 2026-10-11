// Do thi Web Audio dung chung cho 1 the <audio>: song am (AudioVisualizer) + tach giong karaoke (H15).
//
//   audio -> source -+-> dry (nhac goc) ------------------+-> analyser -> loa
//                    +-> [nhanh karaoke: bo giong] -> wet -+
//
// Bat / tat karaoke = keo dan dry <-> wet trong ~0.3s (khong tao lai do thi -> khong bi "bup" tieng).
//
// TACH GIONG KIEU "TRU 2 KENH" (center channel cancellation), xu ly tin hieu so ngay tren trinh duyet:
// - Giong ca si thuong duoc tron dung GIUA (trai = phai) -> L − R gan nhu mat giong, nhac cu dat lech 2 ben van con.
// - Nhung trong bass, kick cung nam giua -> mat theo. Bu lai: lay (L + R) / 2 qua loc thong thap ~150Hz (giong
//   nguoi hau het tren 150Hz nen khong lot vao) roi cong vao.
// - Han che (noi ro khi bao ve): khong sach nhu beat chuan; vang (reverb) cua giong van con; bai mono thi mat
//   gan het (chi con bass); nhac cu dat giua (vd tieng dan solo) cung bi nho theo.

const BASS_CUT_HZ = 150;
// tin hieu L − R thuong nho hon nhac goc -> khuech dai len cho am luong 2 che do gan bang nhau
const SIDE_GAIN = 0.9;
const FADE_S = 0.08;     // hang so thoi gian keo dan (setTargetAtTime): ~0.3s la xong

// 1 AudioContext dung chung; moi the <audio> chi duoc noi vao Web Audio 1 lan
// (StrictMode chay effect 2 lan -> lan 2 lay lai tu WeakMap thay vi tao moi, tao lai se bao loi)
let sharedCtx = null;
const graphs = new WeakMap();

// nhanh bo giong: tra ve node cuoi (merger 2 kenh). Export de thu bang OfflineAudioContext
export const buildVocalCut = (ctx, source) => {
    const splitter = ctx.createChannelSplitter(2);
    source.connect(splitter);

    // giong giua (mid) = (L + R) / 2 -> chi giu phan bass (2 tang loc -> doc 24 dB/quang tam, giong khong lot)
    const mid = ctx.createGain();
    mid.gain.value = 0.5;
    splitter.connect(mid, 0);
    splitter.connect(mid, 1);
    let bass = mid;
    for (let i = 0; i < 2; i++) {
        const lp = ctx.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.value = BASS_CUT_HZ;
        lp.Q.value = 0.7;
        bass.connect(lp);
        bass = lp;
    }

    // canh (side) = L − R: phan khac nhau giua 2 kenh -> giong o giua bi triet tieu
    const side = ctx.createGain();
    side.gain.value = SIDE_GAIN;
    const invertR = ctx.createGain();
    invertR.gain.value = -1;
    splitter.connect(side, 0);
    splitter.connect(invertR, 1);
    invertR.connect(side);
    // bo phan tram cua side (da co bass o tren, tranh bass bi doi)
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = BASS_CUT_HZ;
    side.connect(hp);

    // ghep lai 2 kenh: trai = bass + side, phai = bass − side (giu duoc do rong stereo)
    const merger = ctx.createChannelMerger(2);
    const sideInv = ctx.createGain();
    sideInv.gain.value = -1;
    bass.connect(merger, 0, 0);
    bass.connect(merger, 0, 1);
    hp.connect(merger, 0, 0);
    hp.connect(sideInv);
    sideInv.connect(merger, 0, 1);
    return merger;
};

export const getGraph = (audio) => {
    let graph = graphs.get(audio);
    if (graph) return graph;
    try {
        if (!sharedCtx) sharedCtx = new AudioContext();
        const ctx = sharedCtx;
        const source = ctx.createMediaElementSource(audio);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.75;
        // khoang dB rong hon mac dinh -> cot it bi cham tran khi nhac to
        analyser.minDecibels = -90;
        analyser.maxDecibels = -12;

        const dry = ctx.createGain();
        const wet = ctx.createGain();
        wet.gain.value = 0;
        source.connect(dry);
        buildVocalCut(ctx, source).connect(wet);
        dry.connect(analyser);
        wet.connect(analyser);
        // analyser -> loa (khong noi ra loa thi mat tieng)
        analyser.connect(ctx.destination);

        graph = { ctx, analyser, dry, wet };
        graphs.set(audio, graph);
        return graph;
    } catch (err) {
        // trinh duyet khong ho tro -> van phat nhac binh thuong, song am nam yen, khong co karaoke
        console.log("Khong tao duoc do thi Web Audio:", err);
        return null;
    }
};

// bat / tat bo giong ca si cho the <audio> nay
export const setVocalCut = (audio, on) => {
    const graph = audio && getGraph(audio);
    if (!graph) return;
    const now = graph.ctx.currentTime;
    graph.dry.gain.setTargetAtTime(on ? 0 : 1, now, FADE_S);
    graph.wet.gain.setTargetAtTime(on ? 1 : 0, now, FADE_S);
};
