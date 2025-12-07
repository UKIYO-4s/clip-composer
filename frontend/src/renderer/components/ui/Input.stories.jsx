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
    placeholder: 'Enter text...',
  },
};

export const WithLabel = {
  args: {
    label: 'Project Name',
    placeholder: 'Enter project name...',
  },
};

export const WithHelper = {
  args: {
    label: 'Duration',
    placeholder: '30',
    helper: 'Duration in seconds (max 60)',
  },
};

export const WithError = {
  args: {
    label: 'Email',
    placeholder: 'Enter email...',
    error: 'Please enter a valid email address',
    defaultValue: 'invalid-email',
  },
};

export const Disabled = {
  args: {
    label: 'Read Only',
    placeholder: 'Cannot edit',
    disabled: true,
  },
};

export const AllStates = () => (
  <div className="flex flex-col gap-6 p-4 bg-surface-base w-80">
    <h3 className="text-lg font-semibold text-ink-primary">Input States</h3>

    <Input
      placeholder="Default input"
    />

    <Input
      label="With Label"
      placeholder="Enter value..."
    />

    <Input
      label="With Helper Text"
      placeholder="Enter value..."
      helper="This is helper text"
    />

    <Input
      label="With Error"
      placeholder="Enter value..."
      error="This field has an error"
      defaultValue="Invalid value"
    />

    <Input
      label="Disabled"
      placeholder="Cannot edit"
      disabled
    />
  </div>
);

export const FormExample = () => (
  <div className="flex flex-col gap-4 p-6 bg-surface-raised rounded-lg border border-line w-96">
    <h3 className="text-lg font-semibold text-ink-primary">Export Settings</h3>

    <Input
      label="Output Filename"
      placeholder="my-video"
      helper="Without extension"
    />

    <Input
      label="Width"
      type="number"
      placeholder="1080"
      defaultValue="1080"
    />

    <Input
      label="Height"
      type="number"
      placeholder="1920"
      defaultValue="1920"
    />

    <Input
      label="Frame Rate"
      type="number"
      placeholder="30"
      defaultValue="30"
      helper="FPS (frames per second)"
    />
  </div>
);
