/** 提取文本的首字符（支持几乎所有语言）
 * - 拉丁字母 → 第一个字符（保留原大小写，不再强制大写）
 * - CJK 字符（中日韩）→ 第一个字符
 * - emoji → 第一个 emoji（grapheme cluster）
 * - 组合字符（带重音/声调）→ 组合后的第一个完整字符
 * - 阿语/泰语等 → 第一个字符
 */
export function getDisplayInitial(text: string | undefined | null): string {
  if (!text) return "?";

  // 现代浏览器/Node 16+ 都支持 Intl.Segmenter
  try {
    // @ts-ignore - runtime check
    if (typeof Intl !== "undefined" && (Intl as any).Segmenter) {
      // @ts-ignore
      const seg = new (Intl as any).Segmenter(undefined, { granularity: "grapheme" });
      const it = seg.segment(text)[Symbol.iterator]();
      const first = it.next();
      if (!first.done && first.value && first.value.segment) {
        return first.value.segment;
      }
    }
  } catch {
    // 忽略错误
  }

  // 回退：Array.from 按 code point 拆分
  const arr = Array.from(text);
  return arr[0] || "?";
}
