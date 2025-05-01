/*
 * Copyright (c) 2021-2023 Datalayer, Inc.
 *
 * MIT License
 */

import { FileBrowser, FileManagerJupyterLab, Jupyter } from '@datalayer/jupyter-react';
import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta<typeof FileBrowser> = {
  title: 'Components/FileManager',
} as Meta<typeof FileBrowser>;

export default meta;

type Story = StoryObj<typeof FileBrowser>;

const Template = (args, { globals: { labComparison } }) => {
  const Tag = `${(args.as as string) ?? 'span'}` as keyof JSX.IntrinsicElements;
  return (
    <Jupyter
      jupyterServerUrl=""
      jupyterServerToken="test"
    >
      <FileBrowser {...args} />
      {labComparison === 'display' && <FileManagerJupyterLab />}
    </Jupyter>
  );
};

export const Default: Story = Template.bind({}) as Story;

export const Playground: Story = {
    render: (args, options) => Template.bind({})({ }, { globals: { labComparison: true } }),
};
Playground.args = {};
Playground.argTypes = {};
