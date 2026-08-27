/**
 * Plotly.js 懒加载器
 *
 * 不再将 plotly.js-dist 打包到 JS bundle 中，而是从 CDN 按需加载。
 * 首次调用时创建一个 <script> 标签加载脚本，后续直接返回缓存的 Promise。
 */

let loadingPromise: Promise<any> | null = null;

export function loadPlotly(): Promise<any> {
  if ((window as any).Plotly) {
    return Promise.resolve((window as any).Plotly);
  }

  if (!loadingPromise) {
    loadingPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src =
        "https://cdn.jsdelivr.net/npm/plotly.js-dist@3.6.0/plotly.min.js";
      script.async = true;
      script.onload = () => {
        resolve((window as any).Plotly);
      };
      script.onerror = (err) => {
        loadingPromise = null;
        reject(err);
      };
      document.head.appendChild(script);
    });
  }

  return loadingPromise;
}
