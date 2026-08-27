"""
EEG Simulator Module — Realistic EEG Synthesis
Generates education-grade synthetic EEG that visually resembles real recordings.
"""

import numpy as np
from typing import Dict, List, Any, Optional
from scipy import signal as sig
import warnings

# ── Standard 10-20 channel names (8/16/32 ch) ───────────────────────────
CHANNEL_NAMES = {
    8:  ["Fp1", "Fp2", "C3", "C4", "P3", "P4", "O1", "O2"],
    16: ["Fp1", "Fp2", "F7", "F3", "Fz", "F4", "F8",
         "T3", "C3", "Cz", "C4", "T4", "T5", "P3", "Pz", "P4", "T6", "O1", "O2"][:16],
    32: None,  # auto-generate
}


def _pink_noise(n_samples: int, sampling_rate: int) -> np.ndarray:
    """Generate 1/f (pink) noise via spectral shaping of white noise."""
    # White noise
    white = np.random.randn(n_samples)
    # FFT
    X = np.fft.rfft(white)
    freqs = np.fft.rfftfreq(n_samples, 1.0 / sampling_rate)
    # Shape: 1/sqrt(f) for pink noise (power ~ 1/f)
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        X[1:] *= (1.0 / np.sqrt(freqs[1:]))
    # Inverse FFT
    pink = np.fft.irfft(X, n=n_samples)
    return pink / np.std(pink)  # normalize


def _bandpass_filter(data: np.ndarray, low: float, high: float,
                     sampling_rate: int) -> np.ndarray:
    """Zero-phase bandpass filter."""
    nyq = sampling_rate / 2.0
    b, a = sig.butter(4, [low / nyq, high / nyq], btype="band")
    return sig.filtfilt(b, a, data)


def _generate_eeg_realistic(
    duration_sec: float = 10.0,
    sampling_rate: int = 250,
    n_channels: int = 8,
    alpha_power: float = 1.0,
    beta_power: float = 0.5,
    theta_power: float = 0.3,
    delta_power: float = 0.8,
    gamma_power: float = 0.1,
    alpha_freq: float = 10.0,
    beta_freq: float = 20.0,
    theta_freq: float = 6.0,
    delta_freq: float = 3.0,
    gamma_freq: float = 50.0,
    noise_level: float = 0.1,
    artifact_blink: bool = False,
    artifact_muscle: bool = False,
    artifact_powerline: bool = False,
) -> Dict[str, Any]:
    """
    Generate realistic synthetic EEG (µV-calibrated, v3).

    Realism improvements over v2:
    - Per-channel band emphasis: occipital channels carry strong rhythmic alpha,
      frontal channels weak alpha — like real posterior alpha rhythm.
    - Rhythmic oscillation with slow frequency jitter (±0.6 Hz) plus band-limited
      noise: alpha looks like a real waxing/waning rhythm, not broadband mush.
    - Spindle-like per-channel amplitude envelope (2.5-5 s cycles, random phase
      per channel) so channels do not all swell together.
    - Baseline drift reduced to ±2 µV (v2 had ±20 µV which visually dominated).
    - Background pink noise calibrated in µV independent of band activity.
    - Artifacts added directly in µV (blink -60, muscle 5, line 5).
    """
    np.random.seed(np.random.randint(0, 2**32 - 1))  # non-deterministic

    n_samples = int(duration_sec * sampling_rate)
    times = np.arange(n_samples) / sampling_rate
    t = times

    # ── 1. Channel names ────────────────────────────────────────────────
    if n_channels in CHANNEL_NAMES and CHANNEL_NAMES[n_channels]:
        ch_names = CHANNEL_NAMES[n_channels].copy()
    else:
        ch_names = [f"EEG CH{i+1}" for i in range(n_channels)]

    def _is_frontal(name: str) -> bool:
        up = name.upper()
        return any(x in up for x in ("FP", "F"))
    def _is_occipital(name: str) -> bool:
        return name.upper().startswith("O")

    # ── 2. Per-channel band weights (anatomical) ────────────────────────
    band_weights: Dict[str, List[float]] = {b: [] for b in ("delta", "theta", "alpha", "beta", "gamma")}
    for name in ch_names:
        band_weights["alpha"].append(2.2 if _is_occipital(name) else (0.5 if _is_frontal(name) else 1.0))
        band_weights["delta"].append(1.3 if _is_frontal(name) else 0.8)
        band_weights["theta"].append(1.0)
        band_weights["beta"].append(1.2 if _is_frontal(name) else 1.0)
        band_weights["gamma"].append(0.8)

    # ── 3. Rhythmic oscillator with slow frequency jitter ───────────────
    def _osc_with_jitter(peak_freq: float) -> np.ndarray:
        seg = max(1, int(sampling_rate * 0.5))          # freq re-evaluated every 0.5 s
        n_seg = max(2, int(np.ceil(n_samples / seg)))
        f_raw = np.random.randn(n_seg) * 0.35
        f_raw = np.convolve(f_raw, np.ones(3) / 3, mode="same")
        f = np.clip(peak_freq + f_raw, peak_freq - 0.6, peak_freq + 0.6)
        t_seg = np.arange(n_seg) * seg / sampling_rate
        f_interp = np.interp(t, t_seg, f)
        phase = np.random.rand() * 2 * np.pi
        return np.sin(2 * np.pi * np.cumsum(f_interp) / sampling_rate + phase)

    # ── 4. Background pink noise (µV) ──────────────────────────────────
    # 每通道背景幅度随机变化 ±35%：真实 EEG 各通道噪声底不同，避免所有泳道"同样粗细"
    bg_amp = 7.0 + 55.0 * noise_level      # noise 0.05 → ~9.75 µV（背景更丰富，波形有纹理感）
    eeg = np.zeros((n_channels, n_samples))
    for ch in range(n_channels):
        ch_bg = bg_amp * float(np.random.uniform(0.65, 1.35))
        eeg[ch] = _pink_noise(n_samples, sampling_rate) * ch_bg

    # ── 5. Rhythmic band activity ──────────────────────────────────────
    bands = [
        ("delta", delta_power, 0.5, 4.0, delta_freq),
        ("theta", theta_power, 4.0, 8.0, theta_freq),
        ("alpha", alpha_power, 8.0, 13.0, alpha_freq),
        ("beta",  beta_power, 13.0, 30.0, beta_freq),
        ("gamma", gamma_power, 30.0, 45.0, gamma_freq),
    ]
    for name, power, lo, hi, peak_freq in bands:
        if power <= 0:
            continue
        eff_hi = min(hi, sampling_rate / 2.0 - 1.0)
        if eff_hi <= lo:
            continue
        # 每通道独立节律振荡器（独立相位 + 独立频率抖动）——通道间节律相似但不同步，
        # 避免所有通道共用同一振荡器导致后部高 α 通道看起来像"复制品"。
        band_noise = np.random.randn(n_channels, n_samples)
        for ch in range(n_channels):
            band_noise[ch] = _bandpass_filter(band_noise[ch], lo, eff_hi, sampling_rate)
        for ch in range(n_channels):
            bn = band_noise[ch]
            s = bn.std()
            bn = bn / s if s > 0 else bn
            # 随机爆发式包络（α burst）：1~2.5s 一段强弱交替，比正弦调制更像真实后头部节律
            # （α 是"出现-持续-衰减"的 burst，不是全程等幅）
            seg_len = max(1, int(sampling_rate * float(np.random.uniform(1.0, 2.5))))
            n_seg = max(2, int(np.ceil(n_samples / seg_len)) + 1)
            seg_tgt = np.random.uniform(0.12, 1.0, n_seg)
            env = np.interp(t, np.arange(n_seg) * seg_len, seg_tgt)
            env = np.clip(env, 0.12, 1.0)
            rhythmic = _osc_with_jitter(peak_freq)
            mix = 0.5 * rhythmic + 0.5 * bn
            # 幅度系数 12→9：降低节律"纯度"，让背景活动更可见，波形更接近真实 EEG 的复杂纹理
            eeg[ch] += power * band_weights[name][ch] * 9.0 * mix * env

    # ── 6. Spatial correlation (neighbours more similar) ───────────────
    eeg_smooth = eeg.copy()
    for ch in range(n_channels):
        neighbors = [ch]
        if ch > 0: neighbors.append(ch - 1)
        if ch < n_channels - 1: neighbors.append(ch + 1)
        others = [eeg_smooth[n] for n in neighbors if n != ch]
        if others:
            eeg[ch] = 0.65 * eeg[ch] + 0.35 * sum(others) / len(others)

    # ── 7. Slow baseline drift (±2 µV, per channel) ────────────────────
    for ch in range(n_channels):
        eeg[ch] += 1.5 * np.sin(2 * np.pi * 0.04 * t + np.random.rand() * 2 * np.pi)

    # ── 8. Eye blink artifacts (µV) ────────────────────────────────────
    if artifact_blink:
        blink_interval = int(sampling_rate * 3)  # ~1 blink per 3 s
        n_blinks = max(1, n_samples // blink_interval)
        for _ in range(n_blinks):
            blink_start = np.random.randint(0, max(1, n_samples - sampling_rate))
            blink_len = int(sampling_rate * 0.3)  # 300 ms blink
            blink_end = min(n_samples, blink_start + blink_len)
            t_blink = np.arange(blink_len)
            blink_wave = -60.0 * np.exp(-0.5 * ((t_blink - blink_len // 2) / (blink_len * 0.15)) ** 2)
            frontal_idx = [i for i, n in enumerate(ch_names) if _is_frontal(n)]
            for ch in frontal_idx[:3]:
                if ch < n_channels:
                    eeg[ch, blink_start:blink_end] += blink_wave

    # ── 9. Muscle artifacts (high-freq bursts) ─────────────────────────
    if artifact_muscle:
        muscle_mask = np.random.rand(n_samples) < 0.05
        muscle_bursts = np.where(muscle_mask)[0]
        for mb_start in muscle_bursts[:10]:
            mb_end = min(n_samples, mb_start + int(sampling_rate * 0.2))
            high_freq = 5.0 * np.random.randn(n_channels, mb_end - mb_start) * \
                       np.sin(2 * np.pi * 40 * times[:mb_end - mb_start])
            eeg[:, mb_start:mb_end] += high_freq

    # ── 10. Power line interference (50 Hz) ────────────────────────────
    if artifact_powerline:
        eeg += 5.0 * np.sin(2 * np.pi * 50.0 * times)

    # ── 11. Compute PSD ────────────────────────────────────────────────
    psd_list = []
    freqs_list = None
    for ch in range(n_channels):
        freqs, psd = sig.welch(eeg[ch], fs=sampling_rate, nperseg=min(256, n_samples))
        if freqs_list is None:
            freqs_list = freqs.tolist()
        psd_list.append(psd.tolist())

    return {
        "success": True,
        "times": times.tolist(),
        "channels": {ch_names[i]: eeg[i].tolist() for i in range(n_channels)},
        "channel_names": ch_names,
        "sampling_rate": sampling_rate,
        "duration_seconds": duration_sec,
        "psd": {
            "frequencies": freqs_list,
            "powers": psd_list,
        },
        "parameters": {
            "alpha_power": alpha_power,
            "beta_power": beta_power,
            "theta_power": theta_power,
            "delta_power": delta_power,
            "gamma_power": gamma_power,
            "alpha_freq": alpha_freq,
            "beta_freq": beta_freq,
            "theta_freq": theta_freq,
            "delta_freq": delta_freq,
            "gamma_freq": gamma_freq,
            "noise_level": noise_level,
            "artifact_blink": artifact_blink,
            "artifact_muscle": artifact_muscle,
            "artifact_powerline": artifact_powerline,
        }
    }


def generate_synthetic_eeg(
    duration_sec: float = 10.0,
    sampling_rate: int = 250,
    n_channels: int = 8,
    alpha_power: float = 1.0,
    beta_power: float = 0.5,
    theta_power: float = 0.3,
    delta_power: float = 0.8,
    gamma_power: float = 0.1,
    alpha_freq: float = 10.0,
    beta_freq: float = 20.0,
    theta_freq: float = 6.0,
    delta_freq: float = 3.0,
    gamma_freq: float = 50.0,
    noise_level: float = 0.1,
    artifact_blink: bool = False,
    artifact_muscle: bool = False,
    artifact_powerline: bool = False,
) -> Dict[str, Any]:
    """
    Main entry point: generate synthetic EEG signal.
    Delegates to _generate_eeg_realistic (v2, realistic output).
    """
    return _generate_eeg_realistic(
        duration_sec=duration_sec,
        sampling_rate=sampling_rate,
        n_channels=n_channels,
        alpha_power=alpha_power,
        beta_power=beta_power,
        theta_power=theta_power,
        delta_power=delta_power,
        gamma_power=gamma_power,
        alpha_freq=alpha_freq,
        beta_freq=beta_freq,
        theta_freq=theta_freq,
        delta_freq=delta_freq,
        gamma_freq=gamma_freq,
        noise_level=noise_level,
        artifact_blink=artifact_blink,
        artifact_muscle=artifact_muscle,
        artifact_powerline=artifact_powerline,
    )


def get_preset_states() -> List[Dict[str, Any]]:
    """
    Preset brain states for the "Guess the State" game.
    """
    return [
        {
            "name": "闭眼放松",
            "name_en": "Eyes Closed Relaxation",
            "description": "受试者闭眼坐着，感到放松",
            "description_en": "Subject sitting with eyes closed, feeling relaxed",
            "params": {
                "alpha_power": 1.5,
                "beta_power": 0.3,
                "theta_power": 0.2,
                "delta_power": 0.5,
                "alpha_freq": 10.0,
                "noise_level": 0.05,
                "artifact_blink": False,
                "artifact_muscle": False,
                "artifact_powerline": False,
            }
        },
        {
            "name": "睁眼注意",
            "name_en": "Eyes Open Attention",
            "description": "受试者睁眼，注意力集中",
            "description_en": "Subject with eyes open, paying attention",
            "params": {
                "alpha_power": 0.3,  # Alpha blocking
                "beta_power": 1.2,
                "theta_power": 0.2,
                "delta_power": 0.3,
                "alpha_freq": 10.0,
                "noise_level": 0.08,
                "artifact_blink": False,
                "artifact_muscle": False,
                "artifact_powerline": False,
            }
        },
        {
            "name": "轻度困倦",
            "name_en": "Drowsy / Light Sleep",
            "description": "受试者开始犯困，出现 theta 波",
            "description_en": "Subject becoming drowsy, theta waves appearing",
            "params": {
                "alpha_power": 0.2,
                "beta_power": 0.2,
                "theta_power": 1.2,
                "delta_power": 0.8,
                "theta_freq": 6.0,
                "noise_level": 0.1,
                "artifact_blink": False,
                "artifact_muscle": False,
                "artifact_powerline": False,
            }
        },
        {
            "name": "深度睡眠",
            "name_en": "Deep Sleep",
            "description": "受试者进入深度睡眠，delta 波占主导",
            "description_en": "Subject in deep sleep, delta waves dominant",
            "params": {
                "alpha_power": 0.0,
                "beta_power": 0.1,
                "theta_power": 0.3,
                "delta_power": 2.0,
                "delta_freq": 2.5,
                "noise_level": 0.05,
                "artifact_blink": False,
                "artifact_muscle": False,
                "artifact_powerline": False,
            }
        },
        {
            "name": "癫痫发作（模拟）",
            "name_en": "Seizure (Simulated)",
            "description": "模拟癫痫发作期的节律性放电",
            "description_en": "Simulated ictal rhythmic discharges",
            "params": {
                "alpha_power": 0.5,
                "beta_power": 0.5,
                "theta_power": 0.5,
                "delta_power": 0.5,
                "alpha_freq": 3.0,
                "beta_freq": 5.0,
                "noise_level": 0.3,
                "artifact_blink": False,
                "artifact_muscle": True,
                "artifact_powerline": False,
            }
        },
    ]
