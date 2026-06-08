"""
EEG Simulator Module
生成合成 EEG 信号，用于教育演示
"""

import numpy as np
from typing import Dict, List, Any, Optional


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
    生成合成 EEG 信号
    
    参数:
        duration_sec: 信号时长（秒）
        sampling_rate: 采样率（Hz）
        n_channels: 通道数
        alpha_power: Alpha 波功率 (0-2)
        beta_power: Beta 波功率 (0-2)
        theta_power: Theta 波功率 (0-2)
        delta_power: Delta 波功率 (0-2)
        alpha_freq: Alpha 波频率 (Hz)
        beta_freq: Beta 波频率 (Hz)
        theta_freq: Theta 波频率 (Hz)
        delta_freq: Delta 波频率 (Hz)
        noise_level: 噪声水平 (0-1)
        artifact_blink: 是否添加眨眼伪影
        artifact_muscle: 是否添加肌电伪影
        artifact_powerline: 是否添加工频干扰（50Hz）
    
    返回:
        Dict 包含 times, channels, psd 等
    """
    np.random.seed(42)  # 可重现的结果
    
    n_samples = int(duration_sec * sampling_rate)
    times = np.arange(n_samples) / sampling_rate
    
    # 初始化信号 (n_channels, n_samples)
    eeg_data = np.zeros((n_channels, n_samples))
    
    # 生成各频段的正弦波
    for ch in range(n_channels):
        # Delta 波 (0.5-4 Hz)
        delta = delta_power * np.sin(2 * np.pi * delta_freq * times + np.random.randn() * 0.5)
        eeg_data[ch] += delta
        
        # Theta 波 (4-8 Hz)
        theta = theta_power * np.sin(2 * np.pi * theta_freq * times + np.random.randn() * 0.5)
        eeg_data[ch] += theta
        
        # Alpha 波 (8-13 Hz) - 后枕区更强
        alpha_weight = 1.5 if ch in [0, 1, 2, 3] else 0.8  # 假设通道 0-3 是后枕区
        alpha = alpha_power * alpha_weight * np.sin(2 * np.pi * alpha_freq * times + np.random.randn() * 0.5)
        eeg_data[ch] += alpha
        
        # Beta 波 (13-30 Hz)
        beta = beta_power * np.sin(2 * np.pi * beta_freq * times + np.random.randn() * 0.5)
        eeg_data[ch] += beta
        
        # 添加噪声
        noise = noise_level * np.random.randn(n_samples)
        eeg_data[ch] += noise
    
    # 添加伪影
    if artifact_blink:
        # 眨眼伪影：前额通道出现大幅正向偏转
        blink_times = np.arange(0, n_samples, sampling_rate * 3)  # 每3秒一次眨眼
        for bt in blink_times:
            if bt + sampling_rate < n_samples:
                eeg_data[:2, bt:bt+sampling_rate] += 50 * np.exp(-np.arange(sampling_rate) / (sampling_rate * 0.1))
    
    if artifact_muscle:
        # 肌电伪影：高频噪声
        muscle_noise = 2 * np.random.randn(n_channels, n_samples) * np.sin(2 * np.pi * 50 * times)
        eeg_data += muscle_noise
    
    if artifact_powerline:
        # 工频干扰：50Hz 正弦波
        powerline = 5 * np.sin(2 * np.pi * 50 * times)
        eeg_data += powerline
    
    # 计算 PSD (Power Spectral Density)
    from scipy import signal as sig
    psd_list = []
    freqs_list = None
    
    for ch in range(n_channels):
        freqs, psd = sig.welch(eeg_data[ch], fs=sampling_rate, nperseg=min(256, n_samples))
        if freqs_list is None:
            freqs_list = freqs.tolist()
        psd_list.append(psd.tolist())
    
    # 通道名称
    ch_names = [f"EEG CH{ch+1}" for ch in range(n_channels)]
    
    return {
        "success": True,
        "times": times.tolist(),
        "channels": {ch_names[i]: eeg_data[i].tolist() for i in range(n_channels)},
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


def get_preset_states() -> List[Dict[str, Any]]:
    """
    返回预设的脑电状态（用于"猜猜这是什么状态？"游戏）
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
                "alpha_power": 0.3,  # Alpha 阻断
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
                "alpha_freq": 3.0,  # 发作期频率变慢
                "beta_freq": 5.0,
                "noise_level": 0.3,
                "artifact_blink": False,
                "artifact_muscle": True,
                "artifact_powerline": False,
            }
        },
    ]
