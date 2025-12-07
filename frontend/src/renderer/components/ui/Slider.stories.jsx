import React, { useState } from 'react';
import Slider from './Slider';

export default {
  title: 'UI/Slider',
  component: Slider,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    label: {
      control: 'text',
    },
    min: {
      control: 'number',
    },
    max: {
      control: 'number',
    },
    step: {
      control: 'number',
    },
    showValue: {
      control: 'boolean',
    },
    suffix: {
      control: 'text',
    },
  },
};

const SliderWithState = (args) => {
  const [value, setValue] = useState(args.value || 50);
  return (
    <Slider
      {...args}
      value={value}
      onChange={(e) => setValue(Number(e.target.value))}
    />
  );
};

export const Default = {
  render: SliderWithState,
  args: {
    value: 50,
    min: 0,
    max: 100,
  },
};

export const WithLabel = {
  render: SliderWithState,
  args: {
    label: '音量',
    value: 75,
    min: 0,
    max: 100,
  },
};

export const WithSuffix = {
  render: SliderWithState,
  args: {
    label: '不透明度',
    value: 80,
    min: 0,
    max: 100,
    suffix: '%',
  },
};

export const WithoutValue = {
  render: SliderWithState,
  args: {
    label: '明るさ',
    value: 50,
    min: 0,
    max: 100,
    showValue: false,
  },
};

export const CustomRange = {
  render: SliderWithState,
  args: {
    label: 'フレームレート',
    value: 30,
    min: 15,
    max: 60,
    step: 5,
    suffix: ' fps',
  },
};

export const AllVariants = () => {
  const [volume, setVolume] = useState(75);
  const [opacity, setOpacity] = useState(100);
  const [brightness, setBrightness] = useState(50);
  const [speed, setSpeed] = useState(1);

  return (
    <div className="flex flex-col gap-6 p-4 bg-surface-base w-80">
      <h3 className="text-lg font-semibold text-ink-primary">スライダーバリエーション</h3>

      <Slider
        label="音量"
        value={volume}
        min={0}
        max={100}
        suffix="%"
        onChange={(e) => setVolume(Number(e.target.value))}
      />

      <Slider
        label="不透明度"
        value={opacity}
        min={0}
        max={100}
        suffix="%"
        onChange={(e) => setOpacity(Number(e.target.value))}
      />

      <Slider
        label="明るさ"
        value={brightness}
        min={-100}
        max={100}
        onChange={(e) => setBrightness(Number(e.target.value))}
      />

      <Slider
        label="再生速度"
        value={speed}
        min={0.25}
        max={2}
        step={0.25}
        suffix="x"
        onChange={(e) => setSpeed(Number(e.target.value))}
      />
    </div>
  );
};

export const InPanel = () => {
  const [volume, setVolume] = useState(80);
  const [pan, setPan] = useState(0);
  const [gain, setGain] = useState(0);

  return (
    <div className="p-4 bg-surface-base">
      <div className="p-4 bg-surface-raised rounded-lg border border-line w-72">
        <h3 className="text-sm font-medium text-ink-primary mb-4">オーディオ設定</h3>

        <div className="space-y-4">
          <Slider
            label="音量"
            value={volume}
            min={0}
            max={100}
            suffix="%"
            onChange={(e) => setVolume(Number(e.target.value))}
          />

          <Slider
            label="パン"
            value={pan}
            min={-100}
            max={100}
            onChange={(e) => setPan(Number(e.target.value))}
          />

          <Slider
            label="ゲイン"
            value={gain}
            min={-12}
            max={12}
            step={0.5}
            suffix=" dB"
            onChange={(e) => setGain(Number(e.target.value))}
          />
        </div>
      </div>
    </div>
  );
};
