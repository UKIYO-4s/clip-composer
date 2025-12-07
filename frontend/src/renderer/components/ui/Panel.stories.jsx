import React from 'react';
import Panel from './Panel';
import Button from './Button';

export default {
  title: 'UI/Panel',
  component: Panel,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    header: {
      control: 'text',
    },
  },
};

export const Default = {
  args: {
    children: (
      <div className="p-3">
        <p className="text-sm text-ink-secondary">Panel content goes here.</p>
      </div>
    ),
  },
};

export const WithHeader = {
  args: {
    header: 'Panel Title',
    children: (
      <div className="p-3">
        <p className="text-sm text-ink-secondary">Panel content with a header.</p>
      </div>
    ),
  },
};

export const WithFooter = {
  args: {
    footer: (
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm">Cancel</Button>
        <Button size="sm">Save</Button>
      </div>
    ),
    children: (
      <div className="p-3">
        <p className="text-sm text-ink-secondary">Panel content with a footer.</p>
      </div>
    ),
  },
};

export const WithHeaderAndFooter = {
  args: {
    header: 'Settings',
    footer: (
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm">Cancel</Button>
        <Button size="sm">Apply</Button>
      </div>
    ),
    children: (
      <div className="p-3 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-ink-primary">Auto-save</span>
          <span className="text-sm text-ink-muted">Enabled</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-ink-primary">Quality</span>
          <span className="text-sm text-ink-muted">High</span>
        </div>
      </div>
    ),
  },
};

export const CustomHeader = {
  args: {
    header: (
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-ink-primary">Custom Header</h3>
        <Button variant="ghost" size="sm">Action</Button>
      </div>
    ),
    children: (
      <div className="p-3">
        <p className="text-sm text-ink-secondary">Panel with custom header component.</p>
      </div>
    ),
  },
};

export const AsPropertiesPanel = () => (
  <div className="p-4 bg-surface-base">
    <Panel header="Properties" className="w-72">
      <div className="p-3 space-y-4">
        <div>
          <label className="text-xs font-medium text-ink-secondary block mb-1">Name</label>
          <input
            className="w-full h-8 px-2.5 rounded bg-surface-sunken border border-line text-sm text-ink-primary"
            defaultValue="Video Clip 001"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-ink-secondary block mb-1">Duration</label>
          <input
            className="w-full h-8 px-2.5 rounded bg-surface-sunken border border-line text-sm text-ink-primary"
            defaultValue="00:15.30"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-ink-secondary block mb-1">Position</label>
          <div className="flex gap-2">
            <input
              className="flex-1 h-8 px-2.5 rounded bg-surface-sunken border border-line text-sm text-ink-primary"
              placeholder="X"
              defaultValue="0"
            />
            <input
              className="flex-1 h-8 px-2.5 rounded bg-surface-sunken border border-line text-sm text-ink-primary"
              placeholder="Y"
              defaultValue="0"
            />
          </div>
        </div>
      </div>
    </Panel>
  </div>
);

export const AsLayerPanel = () => (
  <div className="p-4 bg-surface-base">
    <Panel
      header="Layers"
      footer={
        <Button size="sm" className="w-full">Add Layer</Button>
      }
      className="w-64"
    >
      <div className="divide-y divide-line">
        {['Video Layer', 'Text Overlay', 'Audio Track'].map((layer, i) => (
          <div
            key={i}
            className="px-3 py-2 hover:bg-state-hover flex items-center justify-between cursor-pointer"
          >
            <span className="text-sm text-ink-primary">{layer}</span>
            <span className="text-xs text-ink-muted">#{i + 1}</span>
          </div>
        ))}
      </div>
    </Panel>
  </div>
);
