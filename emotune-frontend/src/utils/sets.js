// bật / tắt 1 id trong Set (trả Set mới để React thấy thay đổi): chọn thể loại / ca sĩ ở /survey và /settings
export const toggleId = (set, id) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
};

// 2 Set có cùng phần tử không (Settings: còn thay đổi chưa lưu hay không)
export const sameIds = (a, b) => a.size === b.size && [...a].every((id) => b.has(id));
