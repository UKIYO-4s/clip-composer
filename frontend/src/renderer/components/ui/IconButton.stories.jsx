import React from 'react';
import IconButton from './IconButton';
import { Play, Pause, Plus, Settings, Trash2, Copy } from 'lucide-react';

export default {
  title: 'UI/IconButton',
  component: IconButton,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['ghost', 'subtle'],
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

export const Ghost = {
  args: {
    variant: 'ghost',
    children: <Play size={16} />,
  },
};

export const Subtle = {
  args: {
    variant: 'subtle',
    children: <Play size={16} />,
  },
};

export const AllVariants = () => (
  <div className="flex flex-col gap-4 p-4 bg-surface-base">
    <h3 className="text-lg font-semibold text-ink-primary">Variants</h3>
    <div className="flex gap-4 items-center">
      <IconButton variant="ghost"><Play size={16} /></IconButton>
      <IconButton variant="subtle"><Play size={16} /></IconButton>
    </div>
  </div>
);

export const AllSizes = () => (
  <div className="flex flex-col gap-4 p-4 bg-surface-base">
    <h3 className="text-lg font-semibold text-ink-primary">Sizes</h3>
    <div className="flex gap-4 items-center">
      <IconButton size="sm"><Play size={14} /></IconButton>
      <IconButton size="md"><Play size={16} /></IconButton>
      <IconButton size="lg"><Play size={20} /></IconButton>
    </div>
  </div>
);

export const WithDifferentIcons = () => (
  <div className="flex flex-col gap-4 p-4 bg-surface-base">
    <h3 className="text-lg font-semibold text-ink-primary">Common Icons</h3>
    <div className="flex gap-4 items-center">
      <IconButton><Play size={16} /></IconButton>
      <IconButton><Pause size={16} /></IconButton>
      <IconButton><Plus size={16} /></IconButton>
      <IconButton><Settings size={16} /></IconButton>
      <IconButton><Copy size={16} /></IconButton>
      <IconButton><Trash2 size={16} /></IconButton>
    </div>
  </div>
);

export const DisabledStates = () => (
  <div className="flex flex-col gap-4 p-4 bg-surface-base">
    <h3 className="text-lg font-semibold text-ink-primary">Disabled States</h3>
    <div className="flex gap-4 items-center">
      <IconButton variant="ghost" disabled><Play size={16} /></IconButton>
      <IconButton variant="subtle" disabled><Play size={16} /></IconButton>
    </div>
  </div>
);

export const SizesByVariant = () => (
  <div className="flex flex-col gap-6 p-4 bg-surface-base">
    <div>
      <h3 className="text-sm font-medium text-ink-secondary mb-3">Ghost</h3>
      <div className="flex gap-4 items-center">
        <IconButton variant="ghost" size="sm"><Settings size={14} /></IconButton>
        <IconButton variant="ghost" size="md"><Settings size={16} /></IconButton>
        <IconButton variant="ghost" size="lg"><Settings size={20} /></IconButton>
      </div>
    </div>
    <div>
      <h3 className="text-sm font-medium text-ink-secondary mb-3">Subtle</h3>
      <div className="flex gap-4 items-center">
        <IconButton variant="subtle" size="sm"><Settings size={14} /></IconButton>
        <IconButton variant="subtle" size="md"><Settings size={16} /></IconButton>
        <IconButton variant="subtle" size="lg"><Settings size={20} /></IconButton>
      </div>
    </div>
  </div>
);
