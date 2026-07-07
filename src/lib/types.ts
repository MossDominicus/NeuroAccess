/** NeuroAccess 核心数据类型定义 */

export interface AnalysisResult {
  file_name?: string;
  channel_count?: number;
  sampling_rate?: number;
  duration?: string;
  recording_duration_seconds?: number;
  channel_names?: string[];
  signal_quality_score?: number;
  noisy_channels?: string[];
  possible_artifacts?: string[];
  clipping_detected?: boolean;
  high_frequency_noise?: boolean;
  bandpower?: Record<string, number>;
  bandpower_percent?: Record<string, string>;
  frequency_analysis?: {
    bandpower?: Record<string, number>;
    bandpower_percent?: Record<string, string>;
    dominant_band?: string;
    dominant_frequency?: number;
    frequency_distribution?: number[];
    frequency_distribution_array?: number[];
    average_bandpower?: Record<string, number>;
    relative_bandpower?: Record<string, number>;
  };
  eeg_literacy_scores?: {
    learning_readability_score?: number;
    signal_clarity_score?: number;
    beginner_friendliness_score?: number;
    research_usefulness_score?: number;
    noise_complexity_score?: number;
  };
  confidence?: {
    level?: string;
    score?: number;
    reason?: string;
  };
  band_waveforms?: {
    times: number[];
    delta: number[];
    theta: number[];
    alpha: number[];
    beta: number[];
  };
  waveform_preview?: {
    sampling_rate?: number;
    duration_seconds?: number;
    times?: number[];
    channels?: Record<string, number[]>;
    channel_names?: string[];
  };
  explanations?: Record<string, Record<string, string>>;
  disclaimer?: Record<string, string>;
  what_this_data_cannot_tell?: string[];
  analysis_id?: string;
  signal_quality?: {
    signal_quality_score?: number;
    noisy_channels?: string[];
    possible_artifacts?: string[];
    clipping_detected?: boolean;
    high_frequency_noise?: boolean;
    quality_details?: {
      channel_scores?: Record<string, { score: number; reasons: string[] }>;
    };
  };
  limitations?: string;
  literacy_scores?: Record<string, number>;
  overview?: {
    filename?: string;
    channel_count?: number;
    sampling_rate?: number;
    duration?: string;
    channel_names?: string[];
    recording_duration_seconds?: number;
  };
  file_size_mb?: number;
}

export interface EEGWaveformPreview {
  sampling_rate?: number;
  duration_seconds?: number;
  times: number[];
  channels: Record<string, number[]>;
  total_channels?: number;
  total_samples?: number;
  channel_names?: string[];
}

export interface BandsData {
  times: number[];
  delta: number[];
  theta: number[];
  alpha: number[];
  beta: number[];
}
