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
    relative_bandpower: Dict[str, float] = None  # 相对功率 (%), 跨研究比较用


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

        # 预处理流水线 (按顺序, 每步提升频段/伪影分析准确率):
        # 1. 0.5-40 Hz 带通 — 去除 DC 漂移、肌电、工频谐波
        # 2. 50 Hz / 60 Hz notch — 去除工频干扰 (各国电网频率不同, 用 PSD 峰值自动检测)
        # 3. 重参考 (REST 平均参考近似) — 提升通道间一致性
        try:
            self.raw.filter(l_freq=0.5, h_freq=40.0, picks="eeg", verbose=False)
        except Exception:
            pass  # 滤波失败则继续使用原始数据

        # notch 滤波: 自动检测是 50Hz 还是 60Hz 工频干扰
        try:
            line_freq = self._detect_line_freq()
            if line_freq in (50, 60):
                # notch + 2 个谐波 (100/150Hz 或 120/180Hz)
                self.raw.notch_filter(freqs=[line_freq, line_freq * 2, line_freq * 3],
                                       picks="eeg", verbose=False)
        except Exception:
            pass

        # 重参考到平均参考 (EEG 行业标准做法, 提升空间分辨率)
        try:
            if len(self.raw.ch_names) > 1:
                self.raw.set_eeg_reference('average', projection=False, verbose=False)
        except Exception:
            pass

        # ICA 去伪影: 仅在数据足够长时启用 (>= 20s, 需 n_samples > 20×sfreq)
        # 短文件 ICA 不稳定, 跳过以避免误去成分
        try:
            if self.raw.n_times >= 20 * self.raw.info['sfreq'] and len(self.raw.ch_names) >= 8:
                from mne.preprocessing import ICA
                ica = ICA(n_components=min(0.95, len(self.raw.ch_names) - 1),
                          method='fastica', random_state=42, max_iter='auto')
                ica.fit(self.raw)
                # 自动检测 EOG/ECG 伪影成分
                try:
                    eog_idx, _ = ica.find_bads_eog(self.raw, threshold=2.5, verbose=False)
                    ica.exclude = list(set(eog_idx))
                    if ica.exclude:
                        ica.apply(self.raw)
                except Exception:
                    pass  # 找不到 EOG 通道或检测失败, 保留 ICA 结果
        except Exception:
            pass

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

    def _detect_line_freq(self) -> int:
        """自动检测工频干扰频率 (50Hz 欧/亚/非, 60Hz 美/日部分地区)
        通过 PSD 在 45-65Hz 范围的最大值判断.
        """
        try:
            from scipy.signal import welch
            # 用 1 个通道 (CH0) 快速检测
            ch0 = self.raw.get_data(picks=[self.raw.ch_names[0]])[0]
            sfreq = self.raw.info['sfreq']
            nperseg = min(1024, len(ch0))
            freqs, psd = welch(ch0, fs=sfreq, nperseg=nperseg)

            # 50Hz vs 60Hz 范围对比
            p_50 = float(np.sum(psd[(freqs >= 49) & (freqs <= 51)]))
            p_60 = float(np.sum(psd[(freqs >= 59) & (freqs <= 61)]))

            return 50 if p_50 >= p_60 else 60
        except Exception:
            return 50  # 默认 50Hz (中国/欧洲标准)

    def analyze_signal_quality(self) -> SignalQuality:
        """分析信号质量（多指标融合, 替代单一方差阈值）"""
        if self.raw is None:
            raise ValueError("请先调用 load_data()")

        data = self.raw.get_data()
        ch_names = self.raw.ch_names

        # 1. 噪声通道检测: 综合 方差 + 峰度 + 梯度 (3 指标, 避免单一指标误判)
        noisy_channels = []
        channel_scores = {}

        variances = np.var(data, axis=1)
        var_threshold = np.mean(variances) + 2 * np.std(variances)

        for i, ch_data in enumerate(data):
            score = 0
            reasons = []

            # 指标 1: 方差过高 (漂移/接触不良)
            if variances[i] > var_threshold:
                score += 1
                reasons.append("high_variance")

            # 指标 2: 峰度 (kurtosis) — 眨眼/EMG 产生尖峰, 正态分布 kurt=3
            kurt = float(self._kurtosis(ch_data))
            if kurt > 10 or kurt < 1:
                score += 1
                reasons.append(f"kurt={kurt:.1f}")

            # 指标 3: 梯度异常 — 电极瞬断产生巨大 step
            grad_std = float(np.std(np.diff(ch_data)))
            grad_threshold = np.mean(np.var(data, axis=1)) * 10
            if grad_std > grad_threshold:
                score += 1
                reasons.append("high_gradient")

            channel_scores[ch_names[i]] = {"score": score, "reasons": reasons}
            # 至少 2 个指标异常才标记为噪声通道 (提高准确率, 减少误判)
            if score >= 2:
                noisy_channels.append(ch_names[i])

        # 2. 异常值检测: 极端值 (>5 × std) 占比
        outlier_pct = 0.0
        for ch_data in data:
            std = np.std(ch_data)
            if std > 0:
                outlier_pct += float(np.sum(np.abs(ch_data - np.mean(ch_data)) > 5 * std)) / len(ch_data)
        outlier_pct = outlier_pct / max(1, data.shape[0])

        # 3. 伪影类型检测 (细化)
        possible_artifacts = []
        lang = self.lang
        if len(noisy_channels) > len(ch_names) * 0.1:
            possible_artifacts.append(i18n.get_artifact_text(lang, "many_noisy_channels"))
        if np.any(np.abs(data) > 1e-3):  # 异常大值 (> 1000 μV)
            possible_artifacts.append(i18n.get_artifact_text(lang, "large_values"))
        if outlier_pct > 0.01:  # 超过 1% 的样本是 5σ 异常
            possible_artifacts.append(i18n.get_artifact_text(lang, "many_outliers"))

        # 4. 缺失数据 / 削波
        missing_data = bool(np.any(np.isnan(data)) or np.any(np.isinf(data)))
        clipping_detected = False
        for ch_data in data:
            if np.any(np.abs(ch_data) > 0.99 * np.max(np.abs(ch_data))):
                clipping_detected = True
                break

        # 高频噪声: 滤波后（0.5-40Hz）不应有高频噪声, 标记为 False
        high_frequency_noise = False

        # 5. 质量评分 (0-100): 多指标加权
        # noisy 通道权重按比例 (高密度 EEG 64 通道里偶尔有 1-2 个高方差通道是正常的)
        # 用 min(通道数/4, 5) 限制 noisy 总扣分, 避免高密度 EEG 分数触底
        quality_score = 100.0
        noisy_penalty = min(len(noisy_channels) * 3, 30)
        quality_score -= noisy_penalty
        quality_score -= min(20, len(possible_artifacts) * 6)  # 伪影权重
        quality_score -= min(15, outlier_pct * 500)             # 异常值惩罚
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
            "outlier_percentage": outlier_pct * 100,
            "channel_scores": channel_scores,
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

    @staticmethod
    def _kurtosis(x: np.ndarray) -> float:
        """计算超额峰度 (excess kurtosis), 正态分布 = 0
        眨眼/EMG 伪影会产生高 kurtosis (>3), 平直流产生低 kurtosis.
        """
        x = x - np.mean(x)
        n = len(x)
        if n < 4:
            return 0.0
        m2 = np.mean(x ** 2)
        m4 = np.mean(x ** 4)
        if m2 == 0:
            return 0.0
        return float(m4 / (m2 ** 2) - 3)

    def analyze_frequency(self) -> FrequencyAnalysis:
        """分析频段能量（基于 Welch, 参数优化以提高准确率）"""
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
            'gamma': (30, 40)   # 上限收到 40Hz (被带通滤波截断)
        }

        bandpower = {}
        average_bandpower = {}
        relative_bandpower = {}

        from scipy.signal import welch

        # === Welch 参数优化 ===
        # nperseg = min(4 秒, 1024): 4 秒窗 = 1Hz 频率分辨率 (EEG 标准)
        # overlap = 50%: Welch 经典配置, 方差减小 1/2
        # window = 'hann': 默认窗, 减少频谱泄漏
        # detrend = 'constant': 去 DC 偏移
        # scaling = 'density': 输出 PSD (μV²/Hz)
        nperseg = min(int(4.0 * sfreq), 1024, data.shape[1])
        noverlap = nperseg // 2

        # 先计算所有通道的总功率 (用于相对功率归一化)
        total_power_per_ch = []

        for ch_data in data:
            # Welch 估计 PSD
            freqs, psd = welch(ch_data, fs=sfreq, nperseg=nperseg,
                                noverlap=noverlap, window='hann',
                                detrend='constant', scaling='density')
            total_power_per_ch.append(float(np.sum(psd) * (freqs[1] - freqs[0])))
        total_power_per_ch = np.array(total_power_per_ch)

        # 计算每个频段的绝对功率和相对功率
        for band_name, (fmin, fmax) in bands.items():
            band_power_per_channel = []

            for ch_idx, ch_data in enumerate(data):
                freqs, psd = welch(ch_data, fs=sfreq, nperseg=nperseg,
                                    noverlap=noverlap, window='hann',
                                    detrend='constant', scaling='density')
                # 频段积分 (梯形法, 比矩形积分更精确; 兼容 numpy 1.x/2.x)
                band_mask = (freqs >= fmin) & (freqs <= fmax)
                df = freqs[1] - freqs[0] if len(freqs) > 1 else 1.0
                # 兼容 numpy 1.x (trapz) 和 2.x (trapezoid)
                _trapz = getattr(np, 'trapezoid', getattr(np, 'trapz', None))
                band_power = float(_trapz(psd[band_mask], dx=df))
                band_power_per_channel.append(band_power)

            bandpower[band_name] = band_power_per_channel
            avg = float(np.mean(band_power_per_channel))
            average_bandpower[band_name] = avg
            # 相对功率: 该频段 / (1-40Hz 总功率) × 100%
            rel = float(avg / (np.mean(total_power_per_ch) + 1e-20) * 100)
            relative_bandpower[band_name] = rel

        # 主频率 (基于平均 PSD, 限制在 1.5-40Hz 找峰值, 避开 0-1Hz 漂移和 DC)
        avg_psd = np.mean([welch(ch, fs=sfreq, nperseg=nperseg,
                                  noverlap=noverlap, window='hann',
                                  detrend='constant', scaling='density')[1]
                          for ch in data], axis=0)
        freqs_avg = welch(data[0], fs=sfreq, nperseg=nperseg,
                          noverlap=noverlap, window='hann',
                          detrend='constant', scaling='density')[0]
        # 限制在 1.5-40Hz 找峰值 (避开 0-1Hz 漂移带, 因为带通 0.5Hz 后低频可能有强边带)
        peak_mask = (freqs_avg >= 1.5) & (freqs_avg <= 40.0)
        peak_idx_in_mask = np.argmax(avg_psd[peak_mask])
        dominant_frequency = float(freqs_avg[peak_mask][peak_idx_in_mask])

        # 频率分布 (用于图表, 1.5-40Hz 范围, 限制点数)
        frequency_distribution = []
        display_mask = (freqs_avg >= 1.5) & (freqs_avg <= 40.0)
        display_freqs = freqs_avg[display_mask]
        display_psd = avg_psd[display_mask]
        # 限制 100 个点 (避免前端过载)
        step = max(1, len(display_freqs) // 100)
        for i in range(0, len(display_freqs), step):
            frequency_distribution.append({
                "frequency": float(display_freqs[i]),
                "power": float(display_psd[i])
            })

        self.frequency = FrequencyAnalysis(
            bandpower=bandpower,
            dominant_frequency=dominant_frequency,
            frequency_distribution=frequency_distribution,
            average_bandpower=average_bandpower,
            relative_bandpower=relative_bandpower
        )
        # 同步存到 self, 方便其他方法访问
        self.relative_bandpower = relative_bandpower

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
        # 1. 加载数据 (含预处理: 带通 + notch + 平均参考)
        overview = self.load_data()

        # 2. 信号质量 (多指标融合: 方差 + 峰度 + 梯度)
        quality = self.analyze_signal_quality()

        # 3. 频段分析 (Welch 优化: 4s 窗 + 50% overlap + 梯形积分 + 相对功率)
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
                "relative_bandpower": convert_value(frequency.relative_bandpower or {}),
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
