import React from 'react';
import Card from './Card';

export default {
  title: 'UI/Card',
  component: Card,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    padding: {
      control: 'select',
      options: ['none', 'sm', 'md', 'lg'],
    },
    elevated: {
      control: 'boolean',
    },
    outlined: {
      control: 'boolean',
    },
  },
};

export const Default = {
  args: {
    children: (
      <div>
        <h3 className="text-sm font-medium text-ink-primary mb-2">カードタイトル</h3>
        <p className="text-sm text-ink-secondary">デフォルトスタイルのカードコンテンツです。</p>
      </div>
    ),
  },
};

export const Elevated = {
  args: {
    elevated: true,
    children: (
      <div>
        <h3 className="text-sm font-medium text-ink-primary mb-2">浮き上がりカード</h3>
        <p className="text-sm text-ink-secondary">シャドウで浮き上がり効果を表現しています。</p>
      </div>
    ),
  },
};

export const NoOutline = {
  args: {
    outlined: false,
    children: (
      <div>
        <h3 className="text-sm font-medium text-ink-primary mb-2">枠線なし</h3>
        <p className="text-sm text-ink-secondary">このカードにはボーダーがありません。</p>
      </div>
    ),
  },
};

export const PaddingVariants = () => (
  <div className="flex flex-col gap-4 p-4 bg-surface-base">
    <h3 className="text-lg font-semibold text-ink-primary">パディングバリエーション</h3>

    <Card padding="none">
      <div className="bg-accent-blue/20 p-2">
        <span className="text-sm text-ink-primary">padding: none</span>
      </div>
    </Card>

    <Card padding="sm">
      <span className="text-sm text-ink-primary">padding: sm (8px)</span>
    </Card>

    <Card padding="md">
      <span className="text-sm text-ink-primary">padding: md (12px)</span>
    </Card>

    <Card padding="lg">
      <span className="text-sm text-ink-primary">padding: lg (16px)</span>
    </Card>
  </div>
);

export const StyleVariants = () => (
  <div className="flex flex-col gap-4 p-4 bg-surface-base w-80">
    <h3 className="text-lg font-semibold text-ink-primary">スタイルバリエーション</h3>

    <Card>
      <h4 className="text-sm font-medium text-ink-primary mb-1">デフォルト</h4>
      <p className="text-xs text-ink-muted">outlined: true, elevated: false</p>
    </Card>

    <Card elevated>
      <h4 className="text-sm font-medium text-ink-primary mb-1">浮き上がり</h4>
      <p className="text-xs text-ink-muted">outlined: true, elevated: true</p>
    </Card>

    <Card outlined={false}>
      <h4 className="text-sm font-medium text-ink-primary mb-1">枠線なし</h4>
      <p className="text-xs text-ink-muted">outlined: false, elevated: false</p>
    </Card>

    <Card elevated outlined={false}>
      <h4 className="text-sm font-medium text-ink-primary mb-1">浮き上がり＋枠線なし</h4>
      <p className="text-xs text-ink-muted">outlined: false, elevated: true</p>
    </Card>
  </div>
);

export const AsClipPreview = () => (
  <div className="p-4 bg-surface-base">
    <Card padding="none" className="w-48">
      <div className="aspect-video bg-surface-sunken flex items-center justify-center">
        <span className="text-ink-muted text-xs">サムネイル</span>
      </div>
      <div className="p-2">
        <h4 className="text-sm font-medium text-ink-primary truncate">動画クリップ 001</h4>
        <p className="text-xs text-ink-muted">00:15.30</p>
      </div>
    </Card>
  </div>
);

export const AsInfoCard = () => (
  <div className="p-4 bg-surface-base">
    <Card padding="lg" className="w-64">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-accent-blue/20 flex items-center justify-center">
          <span className="text-accent-blue text-lg">i</span>
        </div>
        <div>
          <h4 className="text-sm font-medium text-ink-primary">ヒント</h4>
          <p className="text-xs text-ink-muted">使い方のコツ</p>
        </div>
      </div>
      <p className="text-sm text-ink-secondary">
        ライブラリからクリップをタイムラインにドラッグ＆ドロップして編集を開始できます。
      </p>
    </Card>
  </div>
);
