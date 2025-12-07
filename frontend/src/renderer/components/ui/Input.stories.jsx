import React from 'react';
import Input from './Input';

export default {
  title: 'UI/Input',
  component: Input,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    label: {
      control: 'text',
    },
    helper: {
      control: 'text',
    },
    error: {
      control: 'text',
    },
    disabled: {
      control: 'boolean',
    },
    placeholder: {
      control: 'text',
    },
  },
};

export const Default = {
  args: {
    placeholder: 'テキストを入力...',
  },
};

export const WithLabel = {
  args: {
    label: 'プロジェクト名',
    placeholder: 'プロジェクト名を入力...',
  },
};

export const WithHelper = {
  args: {
    label: '長さ',
    placeholder: '30',
    helper: '秒単位（最大60秒）',
  },
};

export const WithError = {
  args: {
    label: 'メールアドレス',
    placeholder: 'メールアドレスを入力...',
    error: '有効なメールアドレスを入力してください',
    defaultValue: 'invalid-email',
  },
};

export const Disabled = {
  args: {
    label: '読み取り専用',
    placeholder: '編集不可',
    disabled: true,
  },
};

export const AllStates = () => (
  <div className="flex flex-col gap-6 p-4 bg-surface-base w-80">
    <h3 className="text-lg font-semibold text-ink-primary">入力フィールドの状態</h3>

    <Input
      placeholder="デフォルト入力"
    />

    <Input
      label="ラベル付き"
      placeholder="値を入力..."
    />

    <Input
      label="ヘルパーテキスト付き"
      placeholder="値を入力..."
      helper="これはヘルパーテキストです"
    />

    <Input
      label="エラー表示"
      placeholder="値を入力..."
      error="このフィールドにエラーがあります"
      defaultValue="無効な値"
    />

    <Input
      label="無効"
      placeholder="編集不可"
      disabled
    />
  </div>
);

export const FormExample = () => (
  <div className="flex flex-col gap-4 p-6 bg-surface-raised rounded-lg border border-line w-96">
    <h3 className="text-lg font-semibold text-ink-primary">書き出し設定</h3>

    <Input
      label="出力ファイル名"
      placeholder="my-video"
      helper="拡張子なし"
    />

    <Input
      label="幅"
      type="number"
      placeholder="1080"
      defaultValue="1080"
    />

    <Input
      label="高さ"
      type="number"
      placeholder="1920"
      defaultValue="1920"
    />

    <Input
      label="フレームレート"
      type="number"
      placeholder="30"
      defaultValue="30"
      helper="FPS（1秒あたりのフレーム数）"
    />
  </div>
);
