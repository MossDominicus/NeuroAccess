"""
EEG 分析引擎 - NeuroAccess v0.9.0
支持完整的 EEG 分析：Overview + Quality + Frequency + Waveform + Literacy
v0.9.0 改进：加载时自动带通滤波（0.5-40Hz），修复评分逻辑
"""
import mne
import numpy as np
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
import json
import i18n


@dataclass
class EEGOverview:
    """EEG 文件概览"""
    filename: str
    channel_count: int
    sampling_rate: float
    duration: str
    channel_names: List[str]
    recording_duration_seconds: float


@dataclass
class SignalQuality:
    """信号质量分析"""
    signal_quality_score: float
    noisy_channels: List[str]
    possible_artifacts: List[str]
    missing_data: bool
    clipping_detected: bool
    high_frequency_noise: bool
    quality_details: Dict[str, Any]


@dataclass
class FrequencyAnalysis:
    """频段分析"""
    bandpower: Dict[str, List[float]]   # delta, theta, alpha, beta, gamma（每通道）
    dominant_frequency: float
    frequency_distribution: List[Dict[str, float]]  # 用于图表
    average_bandpower: Dict[str, float]      # 跨通道平均


@dataclass
class WaveformPreview:
    """波形预览数据"""
    times: List[float]
    channels: Dict[str, List[float]]  # channel_name -> data array
    sampling_rate: float
    duration_seconds: float


@dataclass
class LiteracyScores:
    """EEG 可读性评分（0-100，高分=好）"""
    learning_readability_score: float
    signal_clarity_score: float
    beginner_friendliness_score: float
    research_usefulness_score: float
    noise_complexity_score: float   # 高分=难理解


@dataclass
class InterpretationConfidence:
    """解释可信度"""
    level: str   # High / Moderate / Low
    confidence_reason: str
    limitations: List[str]


class EEGAnalyzer:
    """EEG 分析主引擎"""

    def __init__(self, edf_path: str, lang: str = "zh"):
        self.edf_path = edf_path
        self.lang = lang
        self.raw = None
        self.overview = None
        self.quality = None
        self.frequency = None
        self.waveform = None

    def load_data(self) -> EEGOverview:
        """加载 EDF 文件并生成概览（含预处理滤波）"""
        self.raw = mne.io.read_raw_edf(self.edf_path, preload=True, verbose=False)

        # 预处理：0.5-40 Hz 带通滤波，去除 DC 偏移和工频噪声（50/60Hz）
        # 滤波后数据更准确，后续所有分析（质量评估、频段、波形）均基于滤波后数据
        try:
            self.raw.filter(l_freq=0.5, h_freq=40.0, picks="eeg", verbose=False)
        except Exception:
            pass  # 滤波失败则继续使用原始数据

        info = self.raw.info
        duration_sec = self.raw.n_times / info['sfreq']
        minutes = int(duration_sec // 60)
        seconds = int(duration_sec % 60)

        self.overview = EEGOverview(
            filename=self.edf_path.split("/")[-1],
            channel_count=len(info['ch_names']),
            sampling_rate=info['sfreq'],
            duration=f"{minutes}分{seconds}秒",
            channel_names=info['ch_names'],
            recording_duration_seconds=duration_sec
        )

        return self.overview

    def analyze_signal_quality(self) -> SignalQuality:
        """分析信号质量"""
        if self.raw is None:
            raise ValueError("请先调用 load_data()")

        data = self.raw.get_data()
        ch_names = self.raw.ch_names

        # 检测噪声通道（基于方差）
        noisy_channels = []
        variances = np.var(data, axis=1)
        threshold = np.mean(variances) + 2 * np.std(variances)

        for i, var in enumerate(variances):
            if var > threshold:
                noisy_channels.append(ch_names[i])

        # 检测伪影（简单启发式）
        possible_artifacts = []
        lang = self.lang
        if len(noisy_channels) > len(ch_names) * 0.1:
            possible_artifacts.append(i18n.get_artifact_text(lang, "many_noisy_channels"))
        if np.any(np.abs(data) > 1e-3):  # 异常大值 (> 1000 μV)
            possible_artifacts.append(i18n.get_artifact_text(lang, "large_values"))

        # 检测缺失数据
        missing_data = np.any(np.isnan(data)) or np.any(np.isinf(data))

        # 检测削波
        clipping_detected = False
        for ch_data in data:
            if np.any(np.abs(ch_data) > 0.99 * np.max(np.abs(ch_data))):
                clipping_detected = True
                break

        # 高频噪声：滤波后（0.5-40Hz）不应有高频噪声，标记为 False
        high_frequency_noise = False

        # 计算质量评分（0-100）
        quality_score = 100.0
        quality_score -= len(noisy_channels) * 3
        quality_score -= len(possible_artifacts) * 10
        if missing_data:
            quality_score -= 20
        if clipping_detected:
            quality_score -= 15
        if high_frequency_noise:
            quality_score -= 10
        quality_score = max(0, min(100, quality_score))

        quality_details = {
            "average_variance": float(np.mean(variances)),
            "max_variance": float(np.max(variances)),
            "missing_data_percentage": float(np.sum(np.isnan(data)) / data.size * 100) if missing_data else 0.0
        }

        self.quality = SignalQuality(
            signal_quality_score=quality_score,
            noisy_channels=noisy_channels,
            possible_artifacts=possible_artifacts,
            missing_data=missing_data,
            clipping_detected=clipping_detected,
            high_frequency_noise=high_frequency_noise,
            quality_details=quality_details
        )

        return self.quality

    def analyze_frequency(self) -> FrequencyAnalysis:
        """分析频段能量（基于滤波后数据，结果更准确）"""
        if self.raw is None:
            raise ValueError("请先调用 load_data()")

        data = self.raw.get_data()
        sfreq = self.raw.info['sfreq']

        # 定义频段 (Hz) — 标准 EEG 频段
        bands = {
            'delta': (0.5, 4),
            'theta': (4, 8),
            'alpha': (8, 13),
            'beta':  (13, 30),
            'gamma': (30, 100)
        }

        bandpower = {}
        average_bandpower = {}

        from scipy.signal import welch

        for band_name, (fmin, fmax) in bands.items():
            band_power_per_channel = []

            for ch_data in data:
                # 使用 Welch 方法估计功率谱（nperseg 自适应）
                nperseg = min(1024, len(ch_data))
                freqs, psd = welch(ch_data, fs=sfreq, nperseg=nperseg)

                # 提取频段范围内的功率 — 使用积分（曲线下面积）而非平均值
                band_mask = (freqs >= fmin) & (freqs <= fmax)
                df = freqs[1] - freqs[0] if len(freqs) > 1 else 1.0
                band_power = float(np.sum(psd[band_mask]) * df)
                band_power_per_channel.append(band_power)

            bandpower[band_name] = band_power_per_channel
            average_bandpower[band_name] = float(np.mean(band_power_per_channel))

        # 主频率（基于平均 PSD）
        from scipy.signal import welch as welch_avg
        avg_psd = np.mean([welch(ch, fs=sfreq, nperseg=min(1024, data.shape[1]))[1] for ch in data], axis=0)
        freqs_avg = welch(data[0], fs=sfreq, nperseg=min(1024, data.shape[1]))[0]
        dominant_frequency = float(freqs_avg[np.argmax(avg_psd)])

        # 频率分布（用于图表，取前 50 个频率点）
        frequency_distribution = []
        for i, freq in enumerate(freqs_avg[:50]):
            frequency_distribution.append({
                "frequency": float(freq),
                "power": float(avg_psd[i])
            })

        self.frequency = FrequencyAnalysis(
            bandpower=bandpower,
            dominant_frequency=dominant_frequency,
            frequency_distribution=frequency_distribution,
            average_bandpower=average_bandpower
        )

        return self.frequency

    def extract_waveform_preview(self, duration_seconds: float = 10.0) -> WaveformPreview:
        """提取波形预览数据（前 N 秒，基于滤波后数据）"""
        if self.raw is None:
            raise ValueError("请先调用 load_data()")

        sfreq = self.raw.info['sfreq']
        n_samples = min(int(duration_seconds * sfreq), self.raw.n_times)
        data = self.raw.get_data()[:, :n_samples]

        times = np.linspace(0, n_samples / sfreq, n_samples).tolist()

        channels = {}
        # 只取前 8 个通道（用于预览）
        for i, ch_name in enumerate(self.raw.ch_names[:8]):
            channels[ch_name] = data[i].tolist()

        self.waveform = WaveformPreview(
            times=times,
            channels=channels,
            sampling_rate=sfreq,
            duration_seconds=n_samples / sfreq
        )

        return self.waveform

    def calculate_literacy_scores(self) -> LiteracyScores:
        """计算 EEG 可读性评分（0-100，高分=好）"""
        if self.quality is None or self.frequency is None:
            raise ValueError("请先完成信号质量和频段分析")

        # 1. Noise Complexity Score（先算，后面 clarity/beginner 会引用）
        #    高分 = 噪声多、难理解
        complexity_score = len(self.quality.noisy_channels) * 3
        complexity_score += len(self.quality.possible_artifacts) * 10
        if self.quality.clipping_detected:
            complexity_score += 15
        complexity_score = min(100, complexity_score)

        # 2. Learning Readability Score：信号质量直接映射
        learning_score = max(0, min(100, self.quality.signal_quality_score))

        # 3. Signal Clarity Score：清晰度 = 100 - 噪声复杂度
        clarity_score = max(0, 100 - complexity_score)

        # 4. Beginner Friendliness Score：高质量 + 少噪声 + 通道数适中
        noise_penalty   = len(self.quality.noisy_channels) * 4
        artifact_penalty = len(self.quality.possible_artifacts) * 12
        quality_penalty  = 0 if self.quality.signal_quality_score >= 70 else 25
        beginner_score  = max(0, 100 - noise_penalty - artifact_penalty - quality_penalty)
        # 通道数 8-32 对初学者最友好（太多反而混乱）
        if 8 <= self.overview.channel_count <= 32:
            beginner_score = min(100, beginner_score + 10)

        # 5. Research Usefulness Score：质量×40% + 通道数 + 时长
        quality_component  = self.quality.signal_quality_score * 0.4
        channel_component = min(40, self.overview.channel_count * 1.5)
        dur_component     = min(40, self.overview.recording_duration_seconds / 60.0 * 2.0)
        research_score    = min(100, quality_component + channel_component + dur_component)

        return LiteracyScores(
            learning_readability_score=learning_score,
            signal_clarity_score=clarity_score,
            beginner_friendliness_score=beginner_score,
            research_usefulness_score=research_score,
            noise_complexity_score=complexity_score
        )

    def assess_interpretation_confidence(self) -> InterpretationConfidence:
        """评估解释可信度"""
        if self.quality is None:
            raise ValueError("请先完成信号质量分析")

        reasons = []
        limitations = []
        lang = self.lang

        # 判断可信度
        if self.quality.signal_quality_score >= 80:
            level = "High"
            reasons.append(i18n.get_confidence_reason(lang, "high_quality"))
        elif self.quality.signal_quality_score >= 50:
            level = "Moderate"
            reasons.append(i18n.get_confidence_reason(lang, "moderate_quality"))
        else:
            level = "Low"
            reasons.append(i18n.get_confidence_reason(lang, "low_quality"))

        if len(self.quality.noisy_channels) > 0:
            limitations.append(i18n.get_confidence_limitation(lang, "noisy_channels", len(self.quality.noisy_channels)))

        if self.overview.recording_duration_seconds < 60:
            limitations.append(i18n.get_confidence_limitation(lang, "short_duration"))

        if self.overview.channel_count < 8:
            limitations.append(i18n.get_confidence_limitation(lang, "few_channels"))

        limitations.append(i18n.get_confidence_limitation(lang, "not_for_diagnosis_1"))
        limitations.append(i18n.get_confidence_limitation(lang, "not_for_diagnosis_2"))

        confidence_reason = "; ".join(reasons)

        return InterpretationConfidence(
            level=level,
            confidence_reason=confidence_reason,
            limitations=limitations
        )

    def run_full_analysis(self) -> Dict[str, Any]:
        """运行完整分析流水线"""
        # 1. 加载数据（含滤波预处理）
        overview = self.load_data()

        # 2. 信号质量
        quality = self.analyze_signal_quality()

        # 3. 频段分析
        frequency = self.analyze_frequency()

        # 4. 波形预览
        waveform = self.extract_waveform_preview(duration_seconds=10.0)

        # 5. 可读性评分
        literacy = self.calculate_literacy_scores()

        # 6. 解释可信度
        confidence = self.assess_interpretation_confidence()

        # 组装结果（手动转换为 JSON 可序列化类型）
        def convert_value(v):
            """递归转换 NumPy 类型为 Python 原生类型"""
            if isinstance(v, np.ndarray):
                return v.tolist()
            elif isinstance(v, (np.integer, np.int32, np.int64)):
                return int(v)
            elif isinstance(v, (np.floating, np.float32, np.float64)):
                return float(v)
            elif isinstance(v, np.bool_):
                return bool(v)
            elif isinstance(v, dict):
                return {k: convert_value(v) for k, v in v.items()}
            elif isinstance(v, list):
                return [convert_value(item) for item in v]
            else:
                return v

        result = {
            "overview": {
                "filename": overview.filename,
                "channel_count": overview.channel_count,
                "sampling_rate": overview.sampling_rate,
                "duration": overview.duration,
                "channel_names": overview.channel_names,
                "recording_duration_seconds": overview.recording_duration_seconds,
            },
            "signal_quality": {
                "signal_quality_score": quality.signal_quality_score,
                "noisy_channels": quality.noisy_channels,
                "possible_artifacts": quality.possible_artifacts,
                "missing_data": bool(quality.missing_data),
                "clipping_detected": bool(quality.clipping_detected),
                "high_frequency_noise": bool(quality.high_frequency_noise),
                "quality_details": convert_value(quality.quality_details),
            },
            "frequency_analysis": {
                "bandpower": convert_value(frequency.average_bandpower),
                "dominant_frequency": frequency.dominant_frequency,
                "frequency_distribution": convert_value(frequency.frequency_distribution),
                "average_bandpower": convert_value(frequency.average_bandpower),
            },
            "waveform_preview": {
                "times": waveform.times[:500],  # 只取前 500 个时间点
                "channels": {k: [float(v) for v in v[:500]] for k, v in waveform.channels.items()},
                "sampling_rate": waveform.sampling_rate,
                "duration_seconds": waveform.duration_seconds,
            },
            "literacy_scores": {
                "learning_readability_score": literacy.learning_readability_score,
                "signal_clarity_score": literacy.signal_clarity_score,
                "beginner_friendliness_score": literacy.beginner_friendliness_score,
                "research_usefulness_score": literacy.research_usefulness_score,
                "noise_complexity_score": literacy.noise_complexity_score,
            },
            "interpretation_confidence": {
                "level": confidence.level,
                "confidence_reason": confidence.confidence_reason,
                "limitations": confidence.limitations,
            },
            "what_this_data_cannot_tell": [
                "智商",
                "性格",
                "心理健康",
                "疾病",
                "情绪",
                "ADHD",
                "抑郁症"
            ]
        }

        return result


def analyze_edf(edf_path: str, lang: str = "zh") -> Dict[str, Any]:
    """便捷函数：分析单个 EDF 文件"""
    analyzer = EEGAnalyzer(edf_path, lang=lang)
    return analyzer.run_full_analysis()
