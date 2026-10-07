// So khop khong dau: "son tung" van tim ra "Sơn Tùng M-TP"
export const plain = (text) => (text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLowerCase();
