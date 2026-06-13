"""
Custom GDF 1.99 reader for BCI Competition IV datasets.
Handles GDF 1.99 binary format that MNE, biosig, and neo cannot read.

GDF 1.99 file structure (BCI Competition IV format):
  Bytes 0-7:     Version string "GDF 1.99" (8 bytes ASCII)
  Bytes 8-167:   Patient + Recording identification (160 bytes ASCII)
  Bytes 168-255: Reserved / binary data
  Bytes 256-511: Additional header fields (binary, int32 LE)
    * 0xFC (252): Sampling rate (int32 LE)
    * 0x100 (256): Number of signals (int32 LE)
  Bytes 0x104+:  Channel labels (16 bytes each)
  Bytes 0x340+:  Physical unit markers ("uV") and calibration
  Bytes 0x430+:  Prefiltering text
  Bytes 0x500-0x7FF: Padding / extra header data
  Bytes 0x800+:  EEG data records (int16 little-endian, interleaved)
  
  Data layout: [ch1_s0, ch2_s0, ..., chN_s0, ch1_s1, ch2_s1, ...]
  Each sample is int16 LE, values are in microvolts (native scaling).
"""

import struct
import numpy as np
from typing import List, Tuple, Optional
import os


class GDF199Reader:
    """Reader for GDF 1.99 (BCI Competition IV) files."""

    # Known field offsets in the GDF 1.99 header
    OFF_VERSION = 0          # 8 bytes ASCII
    OFF_PATIENT_ID = 8       # 80 bytes ASCII
    OFF_RECORDING_ID = 88    # 80 bytes ASCII
    OFF_SAMPLING_RATE = 0xFC # int32 LE
    OFF_NUM_SIGNALS = 0x100  # int32 LE
    OFF_CHANNEL_LABELS = 0x104  # 16 bytes per label
    OFF_DATA = 0x800         # Data start offset

    def __init__(self, filepath: str):
        self.filepath = filepath
        self._data = None
        self._sampling_rate = None
        self._num_channels = None
        self._channel_labels = None
        self._num_records = None

    def _read_header(self):
        """Parse GDF 1.99 header fields."""
        with open(self.filepath, 'rb') as f:
            # Read version
            f.seek(self.OFF_VERSION)
            version_bytes = f.read(8)
            version = version_bytes.decode('ascii', errors='replace').strip('\x00').strip()
            if not version.startswith('GDF 1.99'):
                raise ValueError(
                    f"Not a GDF 1.99 file. Version string: '{version}'. "
                    f"This reader only supports GDF 1.99 (BCI Competition IV) format."
                )

            # Read number of signals
            f.seek(self.OFF_NUM_SIGNALS)
            ns_bytes = f.read(4)
            self._num_channels = struct.unpack('<i', ns_bytes)[0]

            if self._num_channels <= 0 or self._num_channels > 512:
                raise ValueError(
                    f"Invalid number of channels: {self._num_channels}. "
                    f"Expected 1-512."
                )

            # Read sampling rate
            f.seek(self.OFF_SAMPLING_RATE)
            sr_bytes = f.read(4)
            self._sampling_rate = struct.unpack('<i', sr_bytes)[0]

            if self._sampling_rate <= 0 or self._sampling_rate > 100000:
                raise ValueError(
                    f"Invalid sampling rate: {self._sampling_rate} Hz. "
                    f"Expected 1-100000 Hz."
                )

            # Read channel labels
            f.seek(self.OFF_CHANNEL_LABELS)
            self._channel_labels = []
            for i in range(self._num_channels):
                label_bytes = f.read(16)
                label = label_bytes.decode('ascii', errors='replace')
                # Remove null bytes and strip whitespace
                label = label.split('\x00')[0].strip()
                if not label:
                    label = f"Ch{i+1}"
                self._channel_labels.append(label)

            # Pre-calculate number of records from file size
            file_size = os.path.getsize(self.filepath)
            data_start = self.OFF_DATA
            data_size = file_size - data_start
            bytes_per_sample = self._num_channels * 2
            self._num_records = data_size // bytes_per_sample

    def _read_data(self):
        """Read EEG data from the file."""
        file_size = os.path.getsize(self.filepath)
        data_start = self.OFF_DATA
        data_size = file_size - data_start

        # Calculate number of complete records
        bytes_per_sample = self._num_channels * 2  # int16 = 2 bytes
        self._num_records = data_size // bytes_per_sample

        if self._num_records == 0:
            raise ValueError(
                f"No data found in GDF file. "
                f"File size: {file_size}, data offset: {data_start}, "
                f"channels: {self._num_channels}"
            )

        # Read all raw data
        with open(self.filepath, 'rb') as f:
            f.seek(data_start)
            raw_bytes = f.read(self._num_records * bytes_per_sample)

        # Parse as int16 little-endian
        dtype = np.dtype('<i2')  # int16 LE
        raw_data = np.frombuffer(raw_bytes, dtype=dtype)

        # Reshape: (num_records, num_channels) → (num_channels, num_records)
        raw_data = raw_data.reshape((self._num_records, self._num_channels))
        self._data = raw_data.T.copy()  # (n_channels, n_times)

        return self._data

    def get_raw(self):
        """Read the GDF file and return data as (n_channels, n_times) numpy array."""
        if self._data is None:
            self._read_header()
            self._read_data()
        return self._data

    def get_info(self) -> dict:
        """Return metadata about the GDF file."""
        if self._sampling_rate is None:
            self._read_header()

        return {
            'filename': os.path.basename(self.filepath),
            'version': 'GDF 1.99',
            'channel_count': self._num_channels,
            'sampling_rate': self._sampling_rate,
            'channel_labels': self._channel_labels,
            'num_records': self._num_records,
            'duration_seconds': (
                self._num_records / self._sampling_rate
                if self._num_records else 0
            ),
        }

    def to_mne_raw(self):
        """Convert the GDF data to an MNE RawArray object."""
        import mne
        from mne.io import RawArray

        if self._data is None:
            self.get_raw()

        info_obj = self.get_info()

        # Create MNE Info
        info = mne.create_info(
            ch_names=self._channel_labels,
            sfreq=self._sampling_rate,
            ch_types=['eeg'] * self._num_channels
        )

        # Create RawArray
        raw = RawArray(self._data, info)

        # Mark as custom GDF 1.99 reader (data is native μV, NOT volts)
        raw._gdf_custom_reader = True

        return raw


def read_gdf_199(filepath: str):
    """Convenience function: Read a GDF 1.99 file and return an MNE Raw object.

    Args:
        filepath: Path to the GDF file.

    Returns:
        mne.io.Raw: MNE Raw object containing the EEG data.

    Raises:
        ValueError: If the file is not a valid GDF 1.99 file.
    """
    reader = GDF199Reader(filepath)
    return reader.to_mne_raw()
