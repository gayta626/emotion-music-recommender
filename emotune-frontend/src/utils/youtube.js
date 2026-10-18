// Nap YouTube IFrame Player API (https://www.youtube.com/iframe_api) 1 lan cho ca trang -> Promise<YT>.
// Dung trinh phat chinh thuc cua YouTube (dung dieu khoan: video luon hien tren man hinh, co nut cua YouTube).
// Khong co mang (mat Wi-Fi...) -> reject sau toi da 10 giay, web bao loi va phat tiep mp3.
let apiPromise = null;

export const loadYouTubeApi = () => {
    if (window.YT?.Player) return Promise.resolve(window.YT);
    if (apiPromise) return apiPromise;
    apiPromise = new Promise((resolve, reject) => {
        const fail = (reason) => {
            apiPromise = null;
            script.remove();
            reject(new Error(reason));
        };
        const previous = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
            previous?.();
            clearTimeout(timer);
            resolve(window.YT);
        };
        const script = document.createElement('script');
        script.src = 'https://www.youtube.com/iframe_api';
        script.async = true;
        script.onerror = () => { clearTimeout(timer); fail('offline'); };
        const timer = setTimeout(() => fail('timeout'), 10000);
        document.head.appendChild(script);
    });
    return apiPromise;
};

// trang thai trinh phat YouTube (YT.PlayerState)
export const YT_ENDED = 0;
export const YT_PLAYING = 1;
export const YT_BUFFERING = 3;
