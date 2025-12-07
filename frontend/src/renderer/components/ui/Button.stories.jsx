import React from 'react';
import Button from './Button';

export default {
  title: 'UI/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'ghost', 'subtle', 'danger'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    disabled: {
      control: 'boolean',
    },
  },
};

export const Primary = {
  args: {
    variant: 'primary',
    children: '保存する',
  },
};

export const Ghost = {
  args: {
    variant: 'ghost',
    children: 'キャンセル',
  },
};

export const Subtle = {
  args: {
    variant: 'subtle',
    children: '詳細を表示',
  },
};

export const Danger = {
  args: {
    variant: 'danger',
    children: '削除',
  },
};

export const AllVariants = () => (
  <div className="flex flex-col gap-4 p-4 bg-surface-base">
    <h3 className="text-lg font-semibold text-ink-primary">バリエーション</h3>
    <div className="flex gap-4 items-center">
      <Button variant="primary">Primary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="subtle">Subtle</Button>
      <Button variant="danger">Danger</Button>
    </div>
  </div>
);

export const AllSizes = () => (
  <div className="flex flex-col gap-4 p-4 bg-surface-base">
    <h3 className="text-lg font-semibold text-ink-primary">サイズ</h3>
    <div className="flex gap-4 items-center">
      <Button size="sm">小</Button>
      <Button size="md">中</Button>
      <Button size="lg">大</Button>
    </div>
  </div>
);

export const DisabledStates = () => (
  <div className="flex flex-col gap-4 p-4 bg-surface-base">
    <h3 className="text-lg font-semibold text-ink-primary">無効状態</h3>
    <div className="flex gap-4 items-center">
      <Button variant="primary" disabled>Primary</Button>
      <Button variant="ghost" disabled>Ghost</Button>
      <Button variant="subtle" disabled>Subtle</Button>
      <Button variant="danger" disabled>Danger</Button>
    </div>
  </div>
);

export const SizesByVariant = () => (
  <div className="flex flex-col gap-6 p-4 bg-surface-base">
    <div>
      <h3 className="text-sm font-medium text-ink-secondary mb-3">Primary</h3>
      <div className="flex gap-4 items-center">
        <Button variant="primary" size="sm">小</Button>
        <Button variant="primary" size="md">中</Button>
        <Button variant="primary" size="lg">大</Button>
      </div>
    </div>
    <div>
      <h3 className="text-sm font-medium text-ink-secondary mb-3">Ghost</h3>
      <div className="flex gap-4 items-center">
        <Button variant="ghost" size="sm">小</Button>
        <Button variant="ghost" size="md">中</Button>
        <Button variant="ghost" size="lg">大</Button>
      </div>
    </div>
    <div>
      <h3 className="text-sm font-medium text-ink-secondary mb-3">Subtle</h3>
      <div className="flex gap-4 items-center">
        <Button variant="subtle" size="sm">小</Button>
        <Button variant="subtle" size="md">中</Button>
        <Button variant="subtle" size="lg">大</Button>
      </div>
    </div>
    <div>
      <h3 className="text-sm font-medium text-ink-secondary mb-3">Danger</h3>
      <div className="flex gap-4 items-center">
        <Button variant="danger" size="sm">小</Button>
        <Button variant="danger" size="md">中</Button>
        <Button variant="danger" size="lg">大</Button>
      </div>
    </div>
  </div>
);
