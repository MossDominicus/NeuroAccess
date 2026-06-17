"""
EEG 分析引擎 - NeuroAccess v2.0 (Fast Analyze)
支持完整的 EEG 分析：Overview + Quality + Frequency + Waveform + Literacy

v2.0 性能优化：
  - EDF only（不支持 BDF/GDF）
  - preload=False 避免全内存加载
  - 采样式分析（只读前 60s 数据做 bandpower/signal_quality）
  - 波形预览只读 8s 窗口
  - 通道限制：分析 16ch，预览 8ch
  - 文件大小上限 200MB
  - 不在分析时滤波全文件（用 scipy 对小段数据滤波）
  - 不生成 PNG waveform image（前端 Canvas 自绘）
"""
import mne
import numpy as np
import os
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
import sys
from scipy.signal import butter, filtfilt, welch

# ── 通道限制 ──────────────────────────────────────────────
MAX_ANALYSIS_CHANNELS = 16   # 分析最多16个EEG通道
MAX_PREVIEW_CHANNELS = 8     # 波形预览最多8个EEG通道
MAX_FILE_SIZE_MB = 200       # 文件大小上限

# ── 频段定义 ──────────────────────────────────────────────
BANDS = {
    'delta': (0.5, 4),
    'theta': (4, 8),
    'alpha': (8, 13),
    'beta':  (13, 30),
}

# ── EEG 通道关键字 ─────────────────────────────────────────
EEG_KEYWORDS = [
    "fp", "af", "f", "fc", "cp", "p", "po", "o",
    "cz", "c3", "c4", "p3", "p4", "o1", "o2", "fz", "pz"
]
EXCLUDE_KEYWORDS = {"eog", "ecg", "emg", "status", "stim", "trigger", "marker"}


def _is_eeg_channel(name: str) -> bool:
    """判断通道名是否为 EEG"""
    low = name.lower()
    for ex in EXCLUDE_KEYWORDS:
        if ex in low:
            return False
    clean = low.replace("eeg:", "").replace("eeg ", "").replace(".", "").strip()
    return any(k == clean or clean.startswith(k) for k in EEG_KEYWORDS)


def _pick_eeg_channels(raw) -> List[int]:
    """选出 EEG 通道索引，最多 MAX_ANALYSIS_CHANNELS 个"""
    ch_names = raw.ch_names
    picks = [i for i, ch in enumerate(ch_names) if _is_eeg_channel(ch)]
    
    if len(picks) < 2:
        # 回退：MNE pick_types
        try:
            picks = list(mne.pick_types(raw.info, eeg=True, eog=False, ecg=False,
                                        emg=False, stim=False, misc=False))
        except Exception:
            pass
    
    if len(picks) < 2:
        # 最终回退：排除刺激通道，取前 N 个
        picks = [i for i, ch in enumerate(ch_names)
                 if not any(k in ch.lower() for k in EXCLUDE_KEYWORDS)]
        picks = picks[:max(4, len(picks))]
    
    return picks[:MAX_ANALYSIS_CHANNELS]


# =====================================================================
# Fast-load 替代 preload=True
# =====================================================================

def fast_load_metadata(file_path: str) -> Dict[str, Any]:
    """只读元数据（通道名、采样率、时长），不加载信号数据
    
    Returns: {channel_count, sampling_rate, duration_seconds, channel_names, n_times}
    """
    ext = os.path.splitext(file_path)[1].lower()
    if ext != ".edf":
        raise ValueError(f"Unsupported format: {ext}. Only .edf files are supported in this version.")
    
    raw = mne.io.read_raw_edf(file_path, preload=False, verbose=False)
    info = raw.info
    duration = raw.n_times / info['sfreq'] if info['sfreq'] > 0 else 0
    
    return {
        "channel_count": len(info['ch_names']),
        "sampling_rate": float(info['sfreq']),
        "duration_seconds": float(duration),
        "channel_names": info['ch_names'],
        "n_times": raw.n_times,
    }


def fast_load_segment(file_path: str, duration_sec: float = 60.0, 
                      eeg_only: bool = True) -> tuple:
    """快速加载前 N 秒的 EEG 数据
    
    Args:
        file_path: EDF 文件路径
        duration_sec: 要加载的秒数（默认60s用于分析）
        eeg_only: 是否只保留 EEG 通道
        
    Returns:
        (data_uv, ch_names, sfreq, times)
        data_uv: (n_ch, n_samples) in microvolts
    """
    ext = os.path.splitext(file_path)[1].lower()
    if ext != ".edf":
        raise ValueError(f"Unsupported format: {ext}. Only .edf files are supported.")
    
    raw = mne.io.read_raw_edf(file_path, preload=False, verbose=False)
    sfreq = float(raw.info['sfreq'])
    
    # 只读前 duration_sec 的数据
    n_samples = min(int(duration_sec * sfreq), raw.n_times)
    
    if eeg_only:
        picks = _pick_eeg_channels(raw)
    else:
        picks = list(range(min(len(raw.ch_names), MAX_ANALYSIS_CHANNELS)))
    
    raw.pick(picks)
    ch_names = [raw.ch_names[i] for i in range(len(raw.ch_names))]
    
    # 加载数据
    data = raw.get_data(start=0, stop=n_samples)  # (n_ch, n_times), V
    data_uv = data * 1e6  # V → μV
    times = raw.times[:n_samples]
    
    return data_uv, ch_names, sfreq, times


def fast_preview_window(file_path: str, duration_sec: float = 8.0,
                         max_channels: int = MAX_PREVIEW_CHANNELS) -> Dict[str, Any]:
    """快速提取波形预览窗口（只读前8秒，最多8通道）
    
    Returns dict suitable for frontend canvas rendering:
        {times, channels, sampling_rate, duration_seconds, channel_names}
    """
    ext = os.path.splitext(file_path)[1].lower()
    if ext != ".edf":
        raise ValueError(f"Unsupported format: {ext}. Only .edf files are supported.")
    
    raw = mne.io.read_raw_edf(file_path, preload=False, verbose=False)
    sfreq = float(raw.info['sfreq'])
    
    picks = _pick_eeg_channels(raw)[:max_channels]
    raw.pick(picks)
    ch_names = [raw.ch_names[i] for i in range(len(raw.ch_names))]
    
    n_ch = len(ch_names)
    
    # 智能窗口选择：找前 8s 中变异最大的窗口
    total_n = min(int(duration_sec * sfreq), raw.n_times)
    data_v = raw.get_data(start=0, stop=total_n)  # V
    data_uv = data_v * 1e6  # μV
    times = raw.times[:total_n]
    
    # 每通道 robust normalize + 垂直偏移
    target_points = 1200
    step = max(1, len(times) // target_points)
    if len(times) // step < 500:
        step = max(1, len(times) // 500)
    
    times_plot = times[::step]
    channels_data = {}
    
    for i in range(n_ch):
        x = data_uv[i].copy().astype(np.float64)
        x = x - np.nanmedian(x)
        scale = float(np.nanpercentile(np.abs(x), 95))
        if not np.isfinite(scale) or scale <= 1e-9:
            scale = float(np.nanstd(x))
        if not np.isfinite(scale) or scale <= 1e-9:
            scale = 1.0
        x_norm = x / scale
        x_norm = np.clip(x_norm, -3, 3)
        offset = (n_ch - 1 - i) * 6
        y = x_norm + offset
        channels_data[ch_names[i]] = y[::step].astype(float).tolist()
    
    return {
        "times": times_plot.astype(float).tolist(),
        "channels": channels_data,
        "sampling_rate": sfreq,
        "duration_seconds": float(times_plot[-1]) if len(times_plot) > 0 else 0.0,
        "channel_names": ch_names,
    }


def quick_bandpower(data_uv: np.ndarray, sfreq: float) -> Dict[str, Any]:
    """快速计算频段功率（只取前30s数据，快速Welch）
    
    Args:
        data_uv: (n_ch, n_times) in microvolts
        sfreq: 采样率
        
    Returns:
        {bandpower, average_bandpower, bandpower_percent, dominant_frequency,
         frequency_distribution, relative_bandpower}
    """
    # 限制数据长度：最多用60s，最少用10s
    max_samples = min(int(60 * sfreq), data_uv.shape[1])
    min_samples = int(10 * sfreq)
    if data_uv.shape[1] < min_samples:
        data = data_uv  # 使用全部数据
    else:
        data = data_uv[:, :max_samples]
    
    n_ch, n_samples = data.shape
    
    # Welch 参数：4s窗口，50%重叠
    nperseg = min(int(4.0 * sfreq), 1024, n_samples)
    if nperseg < 16:
        nperseg = max(16, n_samples // 4)
    noverlap = nperseg // 2
    
    all_psds = []
    all_freqs = None
    for ch_data in data:
        freqs, psd = welch(ch_data, fs=sfreq, nperseg=nperseg,
                           noverlap=noverlap, window='hann',
                           detrend='constant', scaling='density')
        if all_freqs is None:
            all_freqs = freqs
        all_psds.append(psd)
    all_psds = np.array(all_psds)  # (n_ch, n_freq)
    
    df = all_freqs[1] - all_freqs[0] if len(all_freqs) > 1 else 1.0
    
    bandpower = {}
    average_bandpower = {}
    relative_bandpower = {}
    
    total_power_per_ch = np.sum(all_psds, axis=1) * df
    
    for band_name, (fmin, fmax) in BANDS.items():
        band_mask = (all_freqs >= fmin) & (all_freqs <= fmax)
        band_power = np.array([
            float(np.trapz(psd[band_mask], dx=df)) for psd in all_psds
        ])
        bandpower[band_name] = band_power.tolist()
        avg = float(np.mean(band_power))
        average_bandpower[band_name] = avg
        rel = float(avg / (np.mean(total_power_per_ch) + 1e-20) * 100)
        relative_bandpower[band_name] = rel
    
    # 主频率
    avg_psd = np.mean(all_psds, axis=0)
    peak_mask = (all_freqs >= 1.5) & (all_freqs <= 40.0)
    masked = avg_psd[peak_mask]
    if len(masked) > 0:
        peak_idx = np.argmax(masked)
        dominant_frequency = float(all_freqs[peak_mask][peak_idx])
    else:
        dominant_frequency = 10.0
    
    # 频率分布（用于图表，降采样至<=100点）
    freq_dist = []
    display_mask = (all_freqs >= 1.5) & (all_freqs <= 40.0)
    display_freqs = all_freqs[display_mask]
    display_psd = avg_psd[display_mask]
    step = max(1, len(display_freqs) // 100)
    for i in range(0, len(display_freqs), step):
        freq_dist.append({
            "frequency": float(display_freqs[i]),
            "power": float(display_psd[i])
        })
    
    # bandpower_percent for enhanced output
    bp_total = sum(average_bandpower.values())
    bandpower_percent = {k: f"{v/bp_total*100:.1f}%" for k, v in average_bandpower.items()} if bp_total > 0 else {k: "0%" for k in average_bandpower}
    
    return {
        "bandpower": average_bandpower,
        "average_bandpower": average_bandpower,
        "bandpower_percent": bandpower_percent,
        "dominant_frequency": dominant_frequency,
        "frequency_distribution": freq_dist,
        "frequency_distribution_array": freq_dist,
        "relative_bandpower": relative_bandpower,
    }


def quick_signal_quality(data_uv: np.ndarray, ch_names: List[str], lang: str = "zh") -> Dict[str, Any]:
    """快速信号质量评估（只检查前30s数据）
    
    综合指标：方差 + 峰度 + 梯度异常
    """
    import i18n
    
    n_ch, n_samples = data_uv.shape
    
    if n_samples < 100:
        return {
            "signal_quality_score": 50.0,
            "noisy_channels": [],
            "possible_artifacts": ["数据过短"],
            "missing_data": False,
            "clipping_detected": False,
            "high_frequency_noise": False,
            "quality_details": {"average_variance": 0, "max_variance": 0, "outlier_percentage": 0},
        }
    
    # 1. 方差检测
    variances = np.var(data_uv, axis=1)
    var_threshold = np.mean(variances) + 2 * np.std(variances)
    
    noisy_channels = []
    
    for i in range(n_ch):
        x = data_uv[i].astype(np.float64)
        
        # 检查 NaN / inf
        if not np.all(np.isfinite(x)):
            noisy_channels.append(ch_names[i])
            continue
        
        score = 0
        
        # 指标1：方差过高
        if variances[i] > var_threshold:
            score += 1
        
        # 指标2：峰度异常
        x_centered = x - np.mean(x)
        m2 = np.mean(x_centered ** 2)
        m4 = np.mean(x_centered ** 4)
        if m2 > 0:
            kurt = float(m4 / (m2 ** 2) - 3)
        else:
            kurt = 0
        if kurt > 10 or kurt < 1:
            score += 1
        
        # 指标3：梯度异常
        grad_std = float(np.std(np.diff(x)))
        grad_threshold = float(np.mean(variances)) * 10
        if grad_std > grad_threshold:
            score += 1
        
        if score >= 2:
            noisy_channels.append(ch_names[i])
    
    # 2. 异常值检测
    outlier_total = 0
    for i in range(n_ch):
        x = data_uv[i]
        std = float(np.std(x))
        if std > 0:
            outlier_total += np.sum(np.abs(x - np.mean(x)) > 5 * std)
    outlier_pct = outlier_total / max(1, n_ch * n_samples)
    
    # 3. 伪影检测
    possible_artifacts = []
    if len(noisy_channels) > n_ch * 0.1:
        possible_artifacts.append(i18n.get_artifact_text(lang, "many_noisy_channels"))
    if np.any(np.abs(data_uv) > 500):  # >500μV异常
        possible_artifacts.append(i18n.get_artifact_text(lang, "large_values"))
    if outlier_pct > 0.01:
        possible_artifacts.append(i18n.get_artifact_text(lang, "many_outliers"))
    
    # 4. 缺失/削波
    missing_data = bool(np.any(~np.isfinite(data_uv)))
    clipping_detected = False
    for i in range(n_ch):
        max_val = np.max(np.abs(data_uv[i]))
        if max_val > 0 and np.any(np.abs(data_uv[i]) > 0.99 * max_val):
            clipping_detected = True
            break
    
    # 5. 质量评分
    quality_score = 100.0
    quality_score -= min(len(noisy_channels) * 3, 30)
    quality_score -= min(len(possible_artifacts) * 6, 20)
    quality_score -= min(outlier_pct * 500, 15)
    if missing_data:
        quality_score -= 20
    if clipping_detected:
        quality_score -= 15
    quality_score = max(0, min(100, quality_score))
    
    return {
        "signal_quality_score": round(quality_score, 1),
        "noisy_channels": noisy_channels,
        "possible_artifacts": possible_artifacts,
        "missing_data": missing_data,
        "clipping_detected": clipping_detected,
        "high_frequency_noise": False,
        "quality_details": {
            "average_variance": float(np.mean(variances)),
            "max_variance": float(np.max(variances)),
            "outlier_percentage": round(outlier_pct * 100, 2),
        },
    }


def quick_literacy_scores(quality: Dict, overview: Dict) -> Dict[str, float]:
    """快速计算可读性评分"""
    score = quality.get("signal_quality_score", 50.0)
    noisy_count = len(quality.get("noisy_channels", []))
    artifact_count = len(quality.get("possible_artifacts", []))
    clipping = quality.get("clipping_detected", False)
    ch_count = overview.get("channel_count", 0)
    duration = overview.get("duration_seconds", 0)
    
    complexity = min(100, noisy_count * 3 + artifact_count * 10 + (15 if clipping else 0))
    readability = min(100, max(0, float(score)))
    clarity = min(100, max(0, float(score) - noisy_count * 4))
    beginner = min(100, max(0, float(score) - complexity * 0.6))
    if 8 <= ch_count <= 32:
        beginner = min(100, beginner + 10)
    research = min(100, max(0, float(score) - noisy_count * 2))
    
    return {
        "learning_readability_score": round(readability, 1),
        "signal_clarity_score": round(clarity, 1),
        "beginner_friendliness_score": round(beginner, 1),
        "research_usefulness_score": round(research, 1),
        "noise_complexity_score": round(complexity, 1),
    }


def quick_band_waveforms(file_path: str, duration_seconds: float = 10.0) -> Dict[str, Any]:
    """计算频段波形（Delta/Theta/Alpha/Beta）—— 只读前10s，scipy滤波
    
    返回 {times, delta, theta, alpha, beta}
    """
    try:
        data_uv, ch_names, sfreq, times = fast_load_segment(
            file_path, duration_sec=duration_seconds, eeg_only=True
        )
    except Exception as e:
        print(f"[WARN] quick_band_waveforms: {e}")
        return {"times": [], "delta": [], "theta": [], "alpha": [], "beta": []}
    
    try:
        n_samples = data_uv.shape[1]
        times_list = times.tolist()
        nyq = sfreq / 2
        result: Dict[str, Any] = {"times": times_list}
        
        for band_name, (low, high) in BANDS.items():
            b, a = butter(4, [low / nyq, high / nyq], btype="band")
            filtered = filtfilt(b, a, data_uv, axis=1)
            avg = np.nanmean(filtered, axis=0)
            result[band_name] = avg.tolist()
        
        return result
    except Exception as e:
        print(f"[WARN] quick_band_waveforms filter failed: {e}")
        return {"times": [], "delta": [], "theta": [], "alpha": [], "beta": []}


# =====================================================================
# 主分析入口
# =====================================================================

def analyze_edf(file_path: str, lang: str = "zh") -> Dict[str, Any]:
    """快速分析 EDF 文件（v2.0 — 只做基础分析，不含 AI/Picture/PDF）
    
    流程：
    1. 验证文件类型和大小
    2. 读取元数据（preload=False）
    3. 加载前60s数据做信号质量和频段分析
    4. 快速波形预览（8s窗口）
    5. 组装结果返回
    
    不在本函数中：Ollama AI解释、PDF生成、PNG波形图
    """
    # ── 格式验证 ──────────────────────────────────────
    ext = os.path.splitext(file_path)[1].lower()
    if ext != ".edf":
        if ext in (".bdf", ".gdf"):
            msg = "BDF/GDF format is no longer supported. Only .edf files are supported in this version."
            raise ValueError(msg)
        raise ValueError(f"Unsupported file format: {ext}. Only .edf files are supported.")
    
    # ── 文件大小检查 ──────────────────────────────────
    file_size_mb = os.path.getsize(file_path) / (1024 * 1024)
    if file_size_mb > MAX_FILE_SIZE_MB:
        raise ValueError(
            f"File too large for analysis ({file_size_mb:.1f}MB). "
            f"Maximum supported file size is {MAX_FILE_SIZE_MB}MB."
        )
    
    # ── 1. 元数据（preload=False，瞬间返回）─────────────
    meta = fast_load_metadata(file_path)
    filename = os.path.basename(file_path)
    minutes = int(meta["duration_seconds"] // 60)
    seconds = int(meta["duration_seconds"] % 60)
    
    overview = {
        "filename": filename,
        "channel_count": meta["channel_count"],
        "sampling_rate": meta["sampling_rate"],
        "duration": f"{minutes}分{seconds}秒",
        "channel_names": meta["channel_names"],
        "recording_duration_seconds": meta["duration_seconds"],
    }
    
    # ── 2. 快速信号质量和频段分析（只用前60s数据）─────
    try:
        data_uv, ch_names, sfreq, _ = fast_load_segment(file_path, duration_sec=60.0, eeg_only=True)
        # 限制分析通道数
        data_uv = data_uv[:MAX_ANALYSIS_CHANNELS]
        ch_names = ch_names[:MAX_ANALYSIS_CHANNELS]
        
        quality = quick_signal_quality(data_uv, ch_names, lang)
        freq = quick_bandpower(data_uv, sfreq)
        
        # literacy scores
        literacy = quick_literacy_scores(quality, overview)
    except Exception as e:
        print(f"[WARN] fast_load_segment failed: {e}, using fallback")
        # 回退：部分文件可能格式特殊，用完整加载兜底
        raw = mne.io.read_raw_edf(file_path, preload=True, verbose=False)
        picks = _pick_eeg_channels(raw)[:MAX_ANALYSIS_CHANNELS]
        raw.pick(picks)
        ch_names_2 = [raw.ch_names[i] for i in range(len(raw.ch_names))]
        # 只取前60s
        n_samples = min(int(60 * raw.info['sfreq']), raw.n_times)
        d = raw.get_data(start=0, stop=n_samples) * 1e6
        quality = quick_signal_quality(d, ch_names_2, lang)
        freq = quick_bandpower(d, raw.info['sfreq'])
        literacy = quick_literacy_scores(quality, overview)
    
    # ── 3. 波形预览（8s窗口，最多8通道）─────────────────
    waveform_preview = fast_preview_window(file_path, duration_sec=8.0, max_channels=MAX_PREVIEW_CHANNELS)
    
    # ── 4. 频段波形（scipy滤波，10s窗口）────────────────
    band_waveforms = quick_band_waveforms(file_path, duration_seconds=10.0)
    
    # ── 5. 组合结果 ─────────────────────────────────────
    def _safe(v):
        if isinstance(v, (np.integer, np.int32, np.int64)):
            return int(v)
        if isinstance(v, (np.floating, np.float32, np.float64)):
            return float(v)
        if isinstance(v, np.ndarray):
            return v.tolist()
        if isinstance(v, dict):
            return {k: _safe(v) for k, v in v.items()}
        if isinstance(v, list):
            return [_safe(item) for item in v]
        return v
    
    # 频道名称统一用 fast_load 获取的（取前 MAX_ANALYSIS_CHANNELS 个）
    # waveform_preview 已经有自己的 channel_names
    
    return _safe({
        "overview": overview,
        "signal_quality": quality,
        "frequency_analysis": {
            "bandpower": freq.get("bandpower", {}),
            "dominant_frequency": freq.get("dominant_frequency", 10.0),
            "frequency_distribution": freq.get("frequency_distribution", []),
            "average_bandpower": freq.get("average_bandpower", {}),
            "relative_bandpower": freq.get("relative_bandpower", {}),
            "bandpower_percent": freq.get("bandpower_percent", {}),
            "frequency_distribution_array": freq.get("frequency_distribution_array", []),
        },
        "waveform_preview": waveform_preview,
        "band_waveforms": band_waveforms,
        "literacy_scores": literacy,
        "what_this_data_cannot_tell": [
            "智商", "性格", "心理健康", "疾病", "情绪", "ADHD", "抑郁症"
        ],
        "file_size_mb": round(file_size_mb, 2),
    })
