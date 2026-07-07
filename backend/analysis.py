"""
EEG 分析引擎 - NeuroAccess v2.0 (Fast Analyze)
支持完整的 EEG 分析：Overview + Quality + Frequency + Waveform + Literacy

v2.0 性能优化：
  - EDF only（不支持 BDF/GDF）
  - preload=False 避免全内存加载
  - 采样式分析（只读前 60s 数据做 bandpower/signal_quality）
  - 波形预览只读 8s 窗口
  - 通道限制：分析 64ch，预览 128ch
  - 文件大小上限 200MB
  - 不在分析时滤波全文件（用 scipy 对小段数据滤波）
  - 不生成 PNG waveform image（前端 Canvas 自绘）
"""
import mne
import numpy as np
import os
from typing import Dict, List, Any, Optional
from scipy.signal import butter, filtfilt, welch

# ── 通道限制 ──────────────────────────────────────────────
MAX_ANALYSIS_CHANNELS = 64    # 分析最多64个EEG通道
MAX_PREVIEW_CHANNELS = 128    # 波形预览最多128个EEG通道（覆盖标准64/128导联帽）
MAX_FILE_SIZE_MB = 200       # 文件大小上限

# ── 频段定义 ──────────────────────────────────────────────
BANDS = {
    'delta': (0.5, 4),
    'theta': (4, 8),
    'alpha': (8, 13),
    'beta':  (13, 30),
}

# ── 文件格式支持 ──────────────────────────────────────
SUPPORTED_FORMATS = {".edf", ".bdf", ".gdf"}


def _load_raw_any(file_path: str, preload: bool = False):
    """统一文件加载器：自动识别 EDF/BDF/GDF 格式

    Returns:
        mne.io.Raw object (EDF/BDF via MNE, GDF 1.99 via gdf_reader)
    """
    ext = os.path.splitext(file_path)[1].lower()
    if ext == ".gdf":
        from gdf_reader import read_gdf_199
        return read_gdf_199(file_path)
    elif ext == ".bdf":
        return mne.io.read_raw_bdf(file_path, preload=preload, verbose=False)
    else:
        return mne.io.read_raw_edf(file_path, preload=preload, verbose=False)


def _raw_to_uv(raw, picks=None, start=0, stop=None):
    """从 MNE Raw 提取数据，统一转为 μV

    GDF 自研 reader 返回的已经是 μV，MNE EDF/BDF 返回 V → 需 ×1e6
    """
    data = raw.get_data(picks=picks, start=start, stop=stop)  # V (MNE) or μV (GDF custom)
    if hasattr(raw, '_gdf_custom_reader'):
        return data  # 已经是 μV
    return data * 1e6  # V → μV


# ── EEG 通道关键字（覆盖 10-20 / 10-10 / 64ch / 128ch 标准）──
EEG_KEYWORDS = [
    # 前额区 (Frontopolar)
    "fp", "fpa",
    # 额区 (Frontal)
    "af", "f", "fc", "ft",
    # 中央区 (Central)
    "c",
    # 中央-顶区 (Centroparietal)
    "cp",
    # 顶区 (Parietal)
    "p", "tp", "po", "t",
    # 枕区 (Occipital)
    "o",
    # 中线 (Midline) - 完整列表
    "cz", "fz", "pz", "oz", "fcz", "cpz", "poz", "fpz",
    # 左侧电极 (Left hemisphere - exact match for short names)
    "c3", "c5", "c1",
    "p3", "p5", "p7", "p1", "p9",
    "o1", "po3", "po7", "po9",
    "f3", "f5", "f7", "f9", "f1",
    "fc3", "fc5", "fc7", "fc1",
    "cp3", "cp5", "cp1",
    "af3", "af7", "af5", "af1",
    "tp7", "tp9",
    "ft7", "ft9",
    "fp1", "fp2",
    # 右侧电极 (Right hemisphere)
    "c4", "c6", "c2",
    "p4", "p6", "p8", "p2", "p10",
    "o2", "po4", "po8", "po10",
    "f4", "f6", "f8", "f10", "f2",
    "fc4", "fc6", "fc8", "fc2",
    "cp4", "cp6", "cp2",
    "af4", "af8", "af6", "af2",
    "tp8", "tp10",
    "ft8", "ft10",
]
EXCLUDE_KEYWORDS = {"eog", "ecg", "emg", "status", "stim", "trigger", "marker"}


def _is_eeg_channel(name: str) -> bool:
    """判断通道名是否为 EEG（支持标准 + 通用正则）"""
    import re
    low = name.lower().strip()
    # 先排除非EEG通道
    for ex in EXCLUDE_KEYWORDS:
        if ex in low:
            return False
    # 清洗前缀
    clean = re.sub(r'^(eeg\s*[:\-]?\s*|ch\s*[:\-]?\s*)', '', low, flags=re.I).strip()
    clean = clean.replace(".", "").strip()
    # 精确或前缀匹配关键字表
    if any(k == clean or clean.startswith(k) for k in EEG_KEYWORDS):
        return True
    # 通用正则：字母+数字 或 字母+数字+字母（覆盖 FP1, CZ, PZ-REF 等）
    if re.search(r'[a-z]{1,4}\d{1,3}', clean):
        return True
    if re.search(r'[a-z]+\d+[a-z]?', clean):
        return True
    # MNE 风格：EEG 001, EEG Fp1 等
    if clean.startswith('eeg') and len(clean) >= 4:
        return True
    return False


def _pick_eeg_channels(raw, max_channels: int = MAX_ANALYSIS_CHANNELS) -> List[int]:
    """选出 EEG 通道索引，最多 max_channels 个"""
    ch_names = raw.ch_names
    total = len(ch_names)
    
    # 第一遍：用关键字表精确匹配
    picks = [i for i, ch in enumerate(ch_names) if _is_eeg_channel(ch)]
    
    # 如果匹配太少（< 通道数一半），尝试 MNE 类型标记
    if len(picks) < max(4, total // 2):
        try:
            mne_picks = list(mne.pick_types(raw.info, eeg=True, eog=False, ecg=False,
                                        emg=False, stim=False, misc=False))
            if len(mne_picks) > len(picks):
                picks = mne_picks
        except Exception:
            pass
    
    # 如果还是太少，用宽松规则：排除已知非EEG关键字，其余全收
    if len(picks) < max(4, total // 2) and total <= max_channels * 2:
        picks = [i for i, ch in enumerate(ch_names)
                 if not any(k in ch.lower() for k in EXCLUDE_KEYWORDS)]
    
    # 安全上限
    return picks[:max_channels]


# =====================================================================
# Fast-load 替代 preload=True
# =====================================================================

def fast_load_metadata(file_path: str) -> Dict[str, Any]:
    """只读元数据（通道名、采样率、时长），不加载信号数据

    Returns: {channel_count, sampling_rate, duration_seconds, channel_names, n_times}
    """
    ext = os.path.splitext(file_path)[1].lower()
    if ext not in SUPPORTED_FORMATS:
        raise ValueError(f"Unsupported format: {ext}. Supported: {SUPPORTED_FORMATS}")

    raw = _load_raw_any(file_path, preload=False)
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
    if ext not in SUPPORTED_FORMATS:
        raise ValueError(f"Unsupported format: {ext}. Supported: {SUPPORTED_FORMATS}")

    raw = _load_raw_any(file_path, preload=False)
    sfreq = float(raw.info['sfreq'])

    # 只读前 duration_sec 的数据
    n_samples = min(int(duration_sec * sfreq), raw.n_times)

    if eeg_only:
        picks = _pick_eeg_channels(raw)
    else:
        picks = list(range(len(raw.ch_names)))

    raw.pick(picks)
    ch_names = [raw.ch_names[i] for i in range(len(raw.ch_names))]

    # 加载数据（统一转 μV）
    data_uv = _raw_to_uv(raw, start=0, stop=n_samples)
    times = raw.times[:n_samples]
    
    return data_uv, ch_names, sfreq, times


def fast_preview_window(file_path: str, duration_sec: float = 8.0,
                         max_channels: int = MAX_PREVIEW_CHANNELS) -> Dict[str, Any]:
    """快速提取波形预览窗口（原始μV数据，无偏移无归一化）
    
    Returns:
        times: 时间轴列表
        channels: {通道名: [μV值]} — 仅去直流偏置，保留真实振幅
        sampling_rate, duration_seconds, channel_names
    """
    ext = os.path.splitext(file_path)[1].lower()
    if ext not in SUPPORTED_FORMATS:
        raise ValueError(f"Unsupported format: {ext}. Supported: {SUPPORTED_FORMATS}")

    raw = _load_raw_any(file_path, preload=False)
    sfreq = float(raw.info['sfreq'])

    picks = _pick_eeg_channels(raw)[:max_channels]
    raw.pick(picks)
    ch_names = [raw.ch_names[i] for i in range(len(raw.ch_names))]
    n_ch = len(ch_names)

    # 取前8秒数据（统一转 μV）
    total_n = min(int(duration_sec * sfreq), raw.n_times)
    data_uv = _raw_to_uv(raw, start=0, stop=total_n)
    times = raw.times[:total_n]
    
    # 下采样到 ~1200 点
    target_points = 1200
    step = max(1, len(times) // target_points)
    if len(times) // step < 500:
        step = max(1, len(times) // 500)
    
    times_plot = times[::step]
    channels_data = {}
    
    for i in range(n_ch):
        x = data_uv[i].copy().astype(np.float64)
        # 仅去直流偏置（减中位数），保留真实振幅
        x = x - np.nanmedian(x)
        channels_data[ch_names[i]] = x[::step].astype(float).tolist()
    
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
        # NumPy 2.x removed np.trapz → use np.trapezoid with fallback
        _trapz = getattr(np, 'trapezoid', getattr(np, 'trapz', None))
        if _trapz is None:
            # 最终回退：矩形积分求和
            band_power = np.array([float(np.sum(psd[band_mask]) * df) for psd in all_psds])
        else:
            band_power = np.array([float(_trapz(psd[band_mask], dx=df)) for psd in all_psds])
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
    
    # 频率分布（用于图表，降采样至<=200点，确保足够细节）
    freq_dist = []
    display_mask = (all_freqs >= 1.5) & (all_freqs <= 40.0)
    display_freqs = all_freqs[display_mask]
    display_psd = avg_psd[display_mask]
    # 至少保留 64 个点，最多 200 个点
    target_n = max(64, min(200, len(display_freqs)))
    step = max(1, len(display_freqs) // target_n)
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


def quick_signal_quality(data_uv: np.ndarray, ch_names: List[str], lang: str = "zh", sfreq: float = 250.0) -> Dict[str, Any]:
    """多维度信号质量评估 — 真实评分（原始分直接落在 0~100，无倍数缩放）

    评分体系（7个独立组件，原始分直接累加 = 总分）：
      SNR 信噪比     : 0~40 分（EEG频段功率 vs 高频噪声）
      通道一致性     : 0~25 分（相邻通道空间相关性）
      频谱特征质量   : 0~15 分（alpha峰 + 1/f 衰减）
      基础分         : 0~20 分（是否采集到真实可用脑电活动；0=平坦/全噪声什么也没检测到）
      伪影水平       : 0~-35 分（峰度/幅度异常值）
      数据完整性     : 0~-25 分（削波/平坦/缺失）
      基线稳定性     : 0~-5 分（慢漂移/DC偏移）

    总分 = SNR + 通道一致性 + 频谱特征 + 基础分 − 伪影 − 完整性 − 漂移，直接 clamp 到 0~100。
    最低 0 分（什么也检测不到，如全平坦/全噪声），最高 100 分（全部组件满分且无扣分）。
    """
    import i18n

    n_ch, n_samples = data_uv.shape

    if n_samples < 100:
        return {
            "signal_quality_score": 0.0,
            "noisy_channels": [],
            "possible_artifacts": ["数据过短"],
            "missing_data": False,
            "clipping_detected": False,
            "high_frequency_noise": False,
            "quality_details": {"average_variance": 0, "max_variance": 0, "outlier_percentage": 0,
                                "snr_component": 0.0, "consistency_component": 0.0,
                                "spectral_component": 0.0, "base_score": 0.0,
                                "artifact_penalty": 0.0, "integrity_penalty": 0.0, "drift_penalty": 0.0},
        }

    # ── 预计算 ──────────────────────────────────────
    variances = np.var(data_uv, axis=1)
    var_mean = float(np.mean(variances))
    var_std = float(np.std(variances))
    stds = np.std(data_uv, axis=1, keepdims=True)
    means = np.mean(data_uv, axis=1, keepdims=True)

    # ── 组件 1: SNR 信噪比 (0~40分) ─────────────────
    # Welch PSD 每通道
    nperseg = min(int(4.0 * min(sfreq, n_samples // 30)), 1024, n_samples)
    nperseg = max(nperseg, 16)
    noverlap = nperseg // 2

    snr_scores = []
    for ch_data in data_uv:
        try:
            freqs, psd = welch(ch_data, fs=min(sfreq, n_samples // 4 if n_samples >= sfreq else sfreq),
                               nperseg=nperseg, noverlap=noverlap, window='hann',
                               detrend='constant', scaling='density')
            df = freqs[1] - freqs[0] if len(freqs) > 1 else 1.0
            _trapz = getattr(np, 'trapezoid', getattr(np, 'trapz', None))

            # EEG 频段功率 (1-40 Hz)
            eeg_mask = (freqs >= 1) & (freqs <= 40)
            if _trapz is not None:
                eeg_power = float(_trapz(psd[eeg_mask], dx=df))
            else:
                eeg_power = float(np.sum(psd[eeg_mask]) * df)

            # 高频噪声功率 (50-125 Hz, 或 Nyquist 以下)
            # 注意: scipy.signal.welch 返回的 freqs[-1] 已经是 fs/2 (Nyquist)
            fmax = freqs[-1] if len(freqs) > 1 else 62.5
            noise_hi = max(50, min(125, fmax * 0.9))
            noise_lo = max(50, noise_hi * 0.4)
            noise_mask = (freqs >= noise_lo) & (freqs <= noise_hi)
            if np.any(noise_mask) and _trapz is not None:
                noise_power = float(_trapz(psd[noise_mask], dx=df))
            else:
                noise_power = float(np.sum(psd[freqs > max(50, len(freqs) // 4)]) * df) if len(freqs) > 50 else 1e-10

            # 用安全下限避免 0/0：平坦/无信号(eeg≈0)时 snr_db≈0，而非误判为"极干净"
            snr_db = 10 * np.log10(max(eeg_power, 1e-12) / max(noise_power, 1e-12))
            if eeg_power < 1e-6:
                snr_db = -40.0  # 实质上无 EEG 频段能量（平坦/断连）→ 视为最差，避免误给保底分

            # 映射到 0~40 分（按真实脑电标定：典型 ~10dB 即 38~40，低/负 SNR 自然趋低）
            if snr_db >= 10:
                s = 40.0
            elif snr_db >= 5:
                s = 28.0 + (snr_db - 5) * 2.4       # 5~10 dB → 28~40
            elif snr_db >= 0:
                s = 14.0 + snr_db * 2.8             # 0~5 dB → 14~28
            elif snr_db >= -5:
                s = 5.0 + (snr_db + 5) * 1.8        # -5~0 dB → 5~14
            else:
                s = max(0.0, snr_db + 9.0)           # 负 dB → 趋近 0
            snr_scores.append(s)
        except Exception:
            snr_scores.append(20.0)  # 中等默认值

    component_snr = float(np.mean(snr_scores)) if snr_scores else 20.0

    # ── 组件 2: 通道一致性 (0~25分) ───────────────────
    # 计算相邻通道间的 Pearson 相关系数（取所有通道对的均值）
    if var_mean <= 1e-6:
        # 全平坦/无信号：通道间无任何有意义的差异，一致性视为 0
        avg_correlation = 0.0
    elif n_ch >= 2:
        # 为效率只取前 5000 个样本点做相关
        corr_n = min(5000, n_samples)
        corr_data = data_uv[:, :corr_n]
        # 去直流
        corr_data = corr_data - np.mean(corr_data, axis=1, keepdims=True)
        # 标准化
        corr_norms = np.linalg.norm(corr_data, axis=1, keepdims=True)
        corr_norms = np.where(corr_norms > 1e-10, corr_norms, 1.0)
        corr_normalized = corr_data / corr_norms
        # 取前 min(16, n_ch) 个通道计算平均相关性
        n_corr_ch = min(16, n_ch)
        corr_matrix = np.corrcoef(corr_normalized[:n_corr_ch])
        # 取上三角（不含对角）
        triu_idx = np.triu_indices(n_corr_ch, k=1)
        if len(triu_idx[0]) > 0:
            avg_correlation = float(np.mean(corr_matrix[triu_idx]))
        else:
            avg_correlation = 0.5
    else:
        avg_correlation = 0.5

    # 相关性映射（宽松）：0.06 以下趋近 0（断连/独立噪声），0.60 即满分 25，
    # 极高相关(>0.60)仅极轻微回落（疑似短路才扣），整体随相关性自然爬升。
    if avg_correlation < 0.06:
        component_consistency = max(0.0, avg_correlation * 45.0)        # 0.06→2.7, 0→0
    elif avg_correlation <= 0.60:
        component_consistency = (avg_correlation - 0.06) / 0.54 * 25.0  # 0.06→0, 0.60→25
    else:
        component_consistency = max(18.0, 25.0 - (avg_correlation - 0.60) * 30.0)  # 疑似短路极轻回落

    component_consistency = max(0.0, min(25.0, component_consistency))

    # ── 组件 3: 伪影检测 (0 ~ -25分扣分) ──────────────
    # 3a. 峰度异常
    data_centered = data_uv - means
    m2 = np.mean(data_centered ** 2, axis=1)
    m4 = np.mean(data_centered ** 4, axis=1)
    kurt = np.where(m2 > 0, m4 / (m2 ** 2), 0)

    # 3b. 幅度异常值比例 (>±150μV 或 >±5倍标准差)
    safe_stds = np.where(stds > 0, stds, 1.0)
    large_amp_mask = np.abs(data_uv - means) > 5 * safe_stds
    extreme_amp_mask = np.abs(data_uv) > 200  # μV
    outlier_total = int(np.sum(large_amp_mask)) + int(np.sum(extreme_amp_mask))
    outlier_pct = outlier_total / max(1, n_ch * n_samples)

    # 3c. 高频噪声梯度
    diffs = np.diff(data_uv, axis=1)
    grad_stds = np.std(diffs, axis=1)
    mean_grad = float(np.mean(grad_stds))

    # 伪影扣分（对真实噪声/伪影敏感，干净数据保持 0）
    artifact_penalty = 0.0
    noisy_channels_list = []

    # 逐通道检测噪声通道（任一强异常指标即可标记，避免“需≥2项才触发”过弱）
    for i in range(n_ch):
        ch_issues = 0
        if kurt[i] > 8 or (0 < kurt[i] < 0.4):
            ch_issues += 1                      # 峰度异常（尖峰/平坦）
        if var_mean > 0 and variances[i] > var_mean * 3:
            ch_issues += 1                       # 该通道方差远超平均（局部噪声）
        if mean_grad > 0 and grad_stds[i] > mean_grad * 3:
            ch_issues += 1                       # 高频梯度异常（肌电/工频）
        if ch_issues >= 1:
            noisy_channels_list.append(ch_names[i])

    noisy_ratio = len(noisy_channels_list) / max(1, n_ch)
    artifact_penalty += min(noisy_ratio * 15, 15)   # 噪声通道占比: 0~15分
    artifact_penalty += min(outlier_pct * 800, 8)   # 异常值比例: 0~8分

    # 大幅度尖峰检测
    if np.any(np.abs(data_uv) > 500):
        artifact_penalty += 3
    if np.any(np.abs(data_uv) > 1000):
        artifact_penalty += 2

    artifact_penalty = min(artifact_penalty, 35)

    # ── 组件 4: 频谱特征质量 (0~15分) ─────────────────
    spectral_score = 0.0
    try:
        # 取一个代表性通道（方差最接近中位数的）
        median_var_idx = int(np.argpartition(np.abs(variances - np.median(variances)), 0)[0])
        rep_data = data_uv[median_var_idx]
        r_freqs, r_psd = welch(rep_data, fs=sfreq, nperseg=nperseg, noverlap=noverlap,
                                window='hann', detrend='constant', scaling='density')
        r_df = r_freqs[1] - r_freqs[0] if len(r_freqs) > 1 else 1.0
        _trapz = getattr(np, 'trapezoid', getattr(np, 'trapz', None))

        # Alpha 带 (8-13Hz) 是否有峰值
        alpha_mask = (r_freqs >= 8) & (r_freqs <= 13)
        alpha_psd = r_psd[alpha_mask] if np.any(alpha_mask) else np.array([0])
        if len(alpha_psd) > 2:
            alpha_max_ratio = float(np.max(alpha_psd)) / (float(np.mean(alpha_psd)) + 1e-12)
            if alpha_max_ratio > 1.3:
                spectral_score += 6.5   # 明显 alpha 峰
            elif alpha_max_ratio > 1.15:
                spectral_score += 4.0   # 有 alpha 活动
            elif alpha_max_ratio > 1.05:
                spectral_score += 2.0   # 微弱 alpha

        # 频谱斜率（低频应比高频强 — 1/f 特征）
        low_mask = (r_freqs >= 2) & (r_freqs <= 10)
        high_mask = (r_freqs >= 30) & (r_freqs <= 60)
        if _trapz is not None and np.any(low_mask) and np.any(high_mask):
            low_pow = _trapz(r_psd[low_mask], dx=r_df)
            high_pow = _trapz(r_psd[high_mask], dx=r_df)
            if high_pow > 1e-12:
                ratio_db = 10 * np.log10(max(low_pow, 1e-12) / high_pow)
                if ratio_db > 6:
                    spectral_score += 7.0   # 正常 1/f 衰减
                elif ratio_db > 3:
                    spectral_score += 4.0
                else:
                    spectral_score += 1.5

        # 高频污染检测（肌电/工频噪声）：30–100Hz 功率相对 1–30Hz 过高 → 伪影
        hf_mask = (r_freqs >= 30) & (r_freqs <= 100)
        band_mask = (r_freqs >= 1) & (r_freqs <= 30)
        if _trapz is not None and np.any(hf_mask) and np.any(band_mask):
            hf_pow = _trapz(r_psd[hf_mask], dx=r_df)
            band_pow = _trapz(r_psd[band_mask], dx=r_df)
            if band_pow > 1e-12:
                hf_ratio = hf_pow / band_pow
                # 正常脑电 hf_ratio < 0.15；肌电伪影可达 0.3~1.0
                artifact_penalty += min(max(0.0, hf_ratio - 0.12) * 40, 12)
    except Exception:
        spectral_score = 4.0  # 默认中等

    spectral_score = min(15, max(0, spectral_score))

    # ── 组件 5: 数据完整性 (0 ~ -25分扣分) ─────────────
    integrity_penalty = 0.0
    n_flat = 0

    # 5a. 缺失数据
    has_missing = bool(np.any(~np.isfinite(data_uv)))
    if has_missing:
        integrity_penalty += 8

    # 5b. 削波检测
    clipping_detected = False
    flat_channels = []
    for i in range(n_ch):
        max_abs = float(np.max(np.abs(data_uv[i])))
        if max_abs > 0:
            # 检查是否有大量样本在最大值的 99% 以上
            near_max_count = int(np.sum(np.abs(data_uv[i]) > 0.99 * max_abs))
            if near_max_count > n_samples * 0.01:  # 超1%样本在峰值附近
                clipping_detected = True
                integrity_penalty += 4
                break

    # 5c. 平坦通道（方差极低，可能是断连）
    if var_mean > 0:
        flat_threshold = var_mean * 0.001
        n_flat = int(np.sum(variances < flat_threshold))
        if n_flat > 0:
            integrity_penalty += min(n_flat * 2, 6)
            flat_channels = [ch_names[i] for i in range(n_ch) if variances[i] < flat_threshold]

    integrity_penalty = min(integrity_penalty, 25)

    # ── 组件 6: 基线稳定性 (0 ~ -5分扣分) ─────────────
    # 慢漂移检测：数据均值随时间的变化率
    drift_penalty = 0.0
    if n_samples > 500:
        # 把数据分成4段，看各段均值差异
        seg_size = n_samples // 4
        seg_means = [float(np.mean(data_uv[:, i*seg_size:(i+1)*seg_size])) for i in range(4)]
        seg_range = max(seg_means) - min(seg_means)
        overall_range = float(np.max(data_uv) - np.min(data_uv))
        if overall_range > 0:
            drift_ratio = seg_range / overall_range
            if drift_ratio > 0.3:
                drift_penalty = 4.0
            elif drift_ratio > 0.18:
                drift_penalty = 2.5
            elif drift_ratio > 0.08:
                drift_penalty = 1.0

    # ── 组件 4: 基础分 (0~20) — 是否采集到真实、可用的脑电活动 ──
    # 0 = 平坦/全噪声（什么也检测不到）；20 = 多数通道信号健康
    usable_ch = n_ch - n_flat - len(noisy_channels_list)
    usable_ratio = max(0.0, usable_ch) / max(1, n_ch)
    if usable_ratio <= 0:
        base_score = 0.0
    else:
        med_var = float(np.median(variances))
        # 真实脑电通道方差通常在数百 μV² 量级；过低(平坦/断连)→接近0，正常→1.0
        if med_var < 1:
            strength = 0.0
        elif med_var < 10:
            strength = med_var / 10.0                # 1~10 μV² → 0.1~1.0
        else:
            strength = 1.0                           # 真实脑电信号，正常方差
        base_score = max(0.0, min(20.0, usable_ratio * 20.0 * strength))

    # ── 最终评分组装 ──────────────────────────────────
    quality_score = (
        component_snr +           # 0~40
        component_consistency +   # 0~25
        spectral_score +          # 0~15
        base_score                # 0~20 基础分（动态）
    )
    quality_score -= (artifact_penalty + integrity_penalty + drift_penalty)

    # 直接 clamp 到 0~100，不做任何倍数缩放
    quality_score = max(0.0, min(100.0, quality_score))

    # ── 伪影描述文本 ──────────────────────────────────
    possible_artifacts = []
    if len(noisy_channels_list) > n_ch * 0.15:
        possible_artifacts.append(i18n.get_artifact_text(lang, "many_noisy_channels"))
    if np.any(np.abs(data_uv) > 500):
        possible_artifacts.append(i18n.get_artifact_text(lang, "large_values"))
    if outlier_pct > 0.02:
        possible_artifacts.append(i18n.get_artifact_text(lang, "many_outliers"))
    if clipping_detected:
        possible_artifacts.append("Signal clipping detected")
    if drift_penalty >= 3:
        possible_artifacts.append("Baseline drift")
    if flat_channels:
        possible_artifacts.append(f"{len(flat_channels)} flat/disconnected channel(s)")

    print(f"[QualityScore] score={quality_score:.1f}  snr={component_snr:.1f}  consistency={component_consistency:.1f}  spectral={spectral_score:.1f}  artifact_pen={artifact_penalty:.1f}  integrity_pen={integrity_penalty:.1f}  drift_pen={drift_penalty:.1f}")
    return {
        "signal_quality_score": quality_score,
        "noisy_channels": noisy_channels_list,
        "possible_artifacts": possible_artifacts,
        "missing_data": has_missing,
        "clipping_detected": clipping_detected,
        "high_frequency_noise": mean_grad > var_mean * 5 if var_mean > 0 else False,
        "quality_details": {
            "average_variance": round(var_mean, 4),
            "max_variance": round(float(np.max(variances)), 4),
            "outlier_percentage": round(outlier_pct * 100, 3),
            "snr_component": round(component_snr, 2),
            "consistency_component": round(component_consistency, 2),
            "spectral_component": round(spectral_score, 2),
            "artifact_penalty": round(artifact_penalty, 2),
            "integrity_penalty": round(integrity_penalty, 2),
            "drift_penalty": round(drift_penalty, 2),
            "base_score": round(base_score, 2),
        },
    }


def quick_literacy_scores(quality: Dict, overview: Dict) -> Dict[str, float]:
    """快速计算可读性评分 —— 每项使用不同因子，确保分数差异化"""
    score = quality.get("signal_quality_score", 50.0)
    qd = quality.get("quality_details", {})
    noisy_count = len(quality.get("noisy_channels", []))
    artifact_count = len(quality.get("possible_artifacts", []))
    clipping = quality.get("clipping_detected", False)
    ch_count = overview.get("channel_count", 16)
    duration = overview.get("duration_seconds", 60)

    # ── 细粒度组件（用于差异化）──
    snr_c = float(qd.get("snr_component", 20))
    cons_c = float(qd.get("consistency_component", 15))
    spec_c = float(qd.get("spectral_component", 8))
    art_p = float(qd.get("artifact_penalty", 2))
    int_p = float(qd.get("integrity_penalty", 1))
    drf_p = float(qd.get("drift_penalty", 1))

    # ① 可靠性评估：侧重数据完整性和通道一致性 + 基础质量
    # 高分条件：数据完整、无缺失、通道间一致、基础分高
    reliability_base = min(100, max(0, cons_c * 3.5))       # 一致性放大到 ~70 满量程
    integrity_deduction = int_p * 4 + drf_p * 3              # 完整性+漂移扣分
    learning_readability = min(100, max(5, reliability_base - integrity_deduction + 10))

    # ② 信号清晰度：侧重 SNR 和伪影水平（与可靠性完全不同的因子组合）
    clarity_base = min(100, max(5, snr_c * 3.8))             # SNR 放大为主因子
    art_deduction = art_p * 4                                 # 伪影重扣
    clip_penalty = 12 if clipping else 0
    signal_clarity = min(100, max(5, clarity_base - art_deduction - clip_penalty + 5))

    # ③ 入口友好度：综合难度——通道数适中(8-32)、时长足够(>30s)、噪声少
    ch_ideal = 8 <= ch_count <= 32                            # 适中通道数加分
    dur_ok = duration >= 30                                   # 时长够用
    ch_factor = 25 if ch_ideal else (10 if 4 <= ch_count <= 64 else 0)
    dur_factor = 15 if dur_ok else max(0, int(duration / 60 * 7))
    noise_factor = max(0, 18 - (noisy_count * 5 + artifact_count * 6))
    beginner_friendliness = min(100, max(5, ch_factor + dur_factor + noise_factor + 22))

    # ④ 研究可用性：需要多通道 + 长时长 + 高 SNR + 频谱丰富
    ch_research = min(35, max(0, ch_count * 1.2))            # 多通道加分
    dur_research = min(30, max(0, int(duration / 120)))      # 长记录加分
    snr_research = min(25, max(0, snr_c * 1.0))
    spec_research = min(10, max(0, spec_c * 1.1))
    research_usefulness = min(100, max(5, ch_research + dur_research + snr_research + spec_research))

    # ⑤ 噪声复杂度：越高表示越难处理
    complexity = min(100, max(0,
        noisy_count * 5 + artifact_count * 8 + (18 if clipping else 0)
        + round(art_p * 1.5) + round(drf_p * 2.0)
    ))

    return {
        "learning_readability_score": round(learning_readability, 1),
        "signal_clarity_score": round(signal_clarity, 1),
        "beginner_friendliness_score": round(beginner_friendliness, 1),
        "research_usefulness_score": round(research_usefulness, 1),
        "noise_complexity_score": round(complexity, 1),
    }


def quick_band_waveforms_from_data(data_uv: np.ndarray, sfreq: float, times: np.ndarray) -> Dict[str, Any]:
    """计算频段波形（Delta/Theta/Alpha/Beta）—— 使用已加载数据，无需重复读文件
    
    返回 {times, delta, theta, alpha, beta}
    """
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
        print(f"[WARN] quick_band_waveforms_from_data failed: {e}")
        return {"times": [], "delta": [], "theta": [], "alpha": [], "beta": []}


def quick_band_waveforms(file_path: str, duration_seconds: float = 10.0) -> Dict[str, Any]:
    """计算频段波形（Delta/Theta/Alpha/Beta）—— 只读前10s，scipy滤波（独立使用场景）
    
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
    if ext not in SUPPORTED_FORMATS:
        raise ValueError(f"Unsupported file format: {ext}. Supported: {SUPPORTED_FORMATS}")
    
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
    seg_data_uv = None
    seg_ch_names = None
    seg_sfreq = None
    try:
        seg_data_uv, seg_ch_names, seg_sfreq, _ = fast_load_segment(file_path, duration_sec=30.0, eeg_only=True)
        
        quality = quick_signal_quality(seg_data_uv, seg_ch_names, lang, seg_sfreq)
        freq = quick_bandpower(seg_data_uv, seg_sfreq)
        literacy = quick_literacy_scores(quality, overview)
    except Exception as e:
        print(f"[WARN] fast_load_segment failed: {e}, using fallback")
        raw = _load_raw_any(file_path, preload=True)
        all_picks = _pick_eeg_channels(raw)
        n_samples = min(int(30 * raw.info['sfreq']), raw.n_times)
        seg_data_uv = _raw_to_uv(raw, picks=all_picks, start=0, stop=n_samples)
        seg_ch_names = [raw.ch_names[i] for i in all_picks]
        seg_sfreq = float(raw.info['sfreq'])
        quality = quick_signal_quality(seg_data_uv, seg_ch_names, lang, seg_sfreq)
        freq = quick_bandpower(seg_data_uv, seg_sfreq)
        literacy = quick_literacy_scores(quality, overview)
    
    # ── 3. 波形预览（从分段数据直接提取，避免二次读取文件）────
    # fast_load_segment 已载入前60s，取前8s
    preview_n = min(int(8.0 * seg_sfreq), seg_data_uv.shape[1]) if seg_data_uv is not None else 0
    if preview_n > 100 and seg_data_uv is not None and seg_ch_names is not None:
        p_data = seg_data_uv[:, :preview_n]
        p_ch = min(p_data.shape[0], MAX_PREVIEW_CHANNELS)
        p_data = p_data[:p_ch]
        p_names = seg_ch_names[:p_ch]
        p_times = np.arange(preview_n) / seg_sfreq
        target_points = 1200
        p_step = max(1, preview_n // target_points)
        if preview_n // p_step < 500:
            p_step = max(1, preview_n // 500)
        p_channels = {}
        for i in range(p_ch):
            x = p_data[i].copy().astype(np.float64)
            x = x - np.nanmedian(x)
            p_channels[p_names[i]] = x[::p_step].astype(float).tolist()
        waveform_preview = {
            "times": p_times[::p_step].tolist(),
            "channels": p_channels,
            "channel_names": p_names,
            "sampling_rate": float(seg_sfreq),
            "duration_seconds": 8.0,
        }
    else:
        waveform_preview = fast_preview_window(file_path, duration_sec=8.0, max_channels=MAX_PREVIEW_CHANNELS)
    
    # ── 4. 频段波形（从已加载数据提取，避免重复读取文件）────
    # 用前10s数据做频段滤波
    bw_n = min(int(10.0 * seg_sfreq), seg_data_uv.shape[1]) if seg_data_uv is not None else 0
    if bw_n > 100 and seg_sfreq > 0:
        bw_data = seg_data_uv[:, :bw_n]
        bw_times = np.arange(bw_n) / seg_sfreq
        band_waveforms = quick_band_waveforms_from_data(bw_data, seg_sfreq, bw_times)
    else:
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
