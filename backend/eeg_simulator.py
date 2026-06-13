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
    alpha_freq: float = 10.0,
    beta_freq: float = 20.0,
    theta_freq: float = 6.0,
    delta_freq: float = 3.0,
    noise_level: float = 0.1,
    artifact_blink: bool = False,
    artifact_muscle: bool = False,
    artifact_powerline: bool = False,
) -> Dict[str, Any]:
    """
    Generate realistic synthetic EEG.

    Key improvements over v1:
    - Band-limited noise (not pure sine waves)
    - 1/f background noise (pink noise)
    - Non-stationarity (amplitude modulation, drift)
    - Spatial correlation between channels (nearby = more similar)
    - Realistic eye blink artifacts (large, sharp, frontal-only)
    - Realistic muscle artifacts (high-freq bursty noise)
    - Line noise (50/60 Hz sinusoid)
    """
    np.random.seed(np.random.randint(0, 2**32 - 1))  # non-deterministic

    n_samples = int(duration_sec * sampling_rate)
    times = np.arange(n_samples) / sampling_rate

    # ── 1. Channel names ────────────────────────────────────────────────
    if n_channels in CHANNEL_NAMES and CHANNEL_NAMES[n_channels]:
        ch_names = CHANNEL_NAMES[n_channels].copy()
    else:
        ch_names = [f"EEG CH{i+1}" for i in range(n_channels)]

    # ── 2. Base pink noise (1/f spectrum = realistic EEG background) ───
    eeg = np.zeros((n_channels, n_samples))
    for ch in range(n_channels):
        eeg[ch] = _pink_noise(n_samples, sampling_rate) * noise_level * 20

    # ── 3. Band-limited activity (filtered noise, NOT pure sine) ───────
    bands = [
        ("delta", delta_power, 0.5, 4.0, delta_freq),
        ("theta", theta_power, 4.0, 8.0, theta_freq),
        ("alpha", alpha_power, 8.0, 13.0, alpha_freq),
        ("beta",  beta_power, 13.0, 30.0, beta_freq),
    ]

    for name, power, lo, hi, peak_freq in bands:
        if power <= 0:
            continue
        # Filtered noise in band
        band_noise = np.random.randn(n_channels, n_samples)
        for ch in range(n_channels):
            band_noise[ch] = _bandpass_filter(
                band_noise[ch], lo, hi, sampling_rate
            )
        # Amplitude modulation (non-stationarity: envelope varies slowly)
        modulator = 0.5 + 0.5 * np.sin(
            2 * np.pi * 0.1 * times + np.random.rand() * 2 * np.pi
        )
        modulator = np.convolve(modulator, np.ones(50) / 50, mode="same")  # smooth
        # Add to EEG (alpha stronger in posterior channels)
        for ch in range(n_channels):
            if name == "alpha":
                # Alpha stronger in occipital (O1, O2 = last 2 ch)
                weight = 1.8 if ch >= n_channels - 2 else 0.6
            elif name == "delta":
                weight = 1.2 if ch < 2 else 0.8  # delta stronger frontal
            else:
                weight = 1.0
            eeg[ch] += power * weight * band_noise[ch] * modulator

    # ── 4. Spatial correlation (nearby channels more similar) ──────────
    # Simple approach: mix each channel with neighbors
    eeg_smooth = eeg.copy()
    for ch in range(n_channels):
        neighbors = [ch]
        if ch > 0: neighbors.append(ch - 1)
        if ch < n_channels - 1: neighbors.append(ch + 1)
        eeg[ch] = 0.6 * eeg[ch] + 0.2 * sum(eeg_smooth[n] for n in neighbors if n != ch) / len(neighbors)

    # ── 5. Non-stationarity: slow drift (baseline wander) ────────────
    drift = 2.0 * np.sin(2 * np.pi * 0.05 * times)
    eeg += drift

    # ── 6. Eye blink artifacts ─────────────────────────────────────────
    if artifact_blink:
        blink_interval = int(sampling_rate * 3)  # ~1 blink per 3s
        n_blinks = max(1, n_samples // blink_interval)
        for _ in range(n_blinks):
            blink_start = np.random.randint(0, max(1, n_samples - sampling_rate))
            blink_len = int(sampling_rate * 0.3)  # 300ms blink
            blink_end = min(n_samples, blink_start + blink_len)
            # Gaussian bump (large, positive = voltage drop = blink)
            t_blink = np.arange(blink_len)
            blink_wave = -80.0 * np.exp(-0.5 * ((t_blink - blink_len//2) / (blink_len*0.15))**2)
            # Only frontal channels (Fp1, Fp2, F7, F3, Fz, F4, F8)
            frontal_idx = [i for i, n in enumerate(ch_names) if any(
                x in n.upper() for x in ["FP", "F", "AF"]
            )]
            for ch in frontal_idx[:3]:  # only first 3 frontal
                if ch < n_channels:
                    eeg[ch, blink_start:blink_end] += blink_wave

    # ── 7. Muscle artifacts (high-freq bursty noise) ──────────────────
    if artifact_muscle:
        muscle_mask = np.random.rand(n_samples) < 0.05  # 5% of time
        muscle_bursts = np.where(muscle_mask)[0]
        for mb_start in muscle_bursts[:10]:  # max 10 bursts
            mb_end = min(n_samples, mb_start + int(sampling_rate * 0.2))
            high_freq = 5.0 * np.random.randn(n_channels, mb_end - mb_start) * \
                       np.sin(2 * np.pi * 40 * times[:mb_end - mb_start])
            eeg[:, mb_start:mb_end] += high_freq

    # ── 8. Power line interference (50 or 60 Hz) ─────────────────────
    if artifact_powerline:
        line_freq = 50.0  # Hz (China/Asia/Europe)
        line_amp = 5.0
        line_wave = line_amp * np.sin(2 * np.pi * line_freq * times)
        eeg += line_wave

    # ── 9. Scale to microvolts (realistic EEG range: ±100 µV) ───────
    eeg = eeg * 10.0  # final scale: roughly ±50-100 µV

    # ── 10. Compute PSD ────────────────────────────────────────────────
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
            "alpha_freq": alpha_freq,
            "beta_freq": beta_freq,
            "theta_freq": theta_freq,
            "delta_freq": delta_freq,
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
    alpha_freq: float = 10.0,
    beta_freq: float = 20.0,
    theta_freq: float = 6.0,
    delta_freq: float = 3.0,
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
        alpha_freq=alpha_freq,
        beta_freq=beta_freq,
        theta_freq=theta_freq,
        delta_freq=delta_freq,
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
