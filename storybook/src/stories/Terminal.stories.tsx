/*
 * Copyright (c) 2021-2023 Datalayer, Inc.
 *
 * MIT License
 */

import { Jupyter, Terminal } from '@datalayer/jupyter-react';
import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta<typeof Terminal> = {
  title: 'Components/Terminal',
  component: Terminal,
  argTypes: {
    // height: {
    //   type: 'string',
    // },
    colormode: {
      options: ['dark', 'light'],
    },
  },
} as Meta<typeof Terminal>;

export default meta;

type Story = StoryObj<typeof Terminal | typeof Jupyter>;

const Template = (args, { globals: { labComparison } }) => {
  return (
    <Jupyter
      startDefaultKernel={false}
      jupyterServerUrl=""
      jupyterServerToken="test"
      terminals={true}
    >
      <Terminal {...args} />
    </Jupyter>
  );
};

export const Default: Story = Template.bind({}) as Story;
Default.args = {
  height: '800px',
  colormode: 'light',
};

export const Playground: Story = Template.bind({}) as Story;
Playground.args = {
  ...Default.args,
  height: '800px',
  colormode: 'dark',
};

export const WithInitialization: Story = Template.bind({}) as Story;
WithInitialization.args = {
  ...Default.args,
  initCode: 'echo "Hello from shell $0"',
};
