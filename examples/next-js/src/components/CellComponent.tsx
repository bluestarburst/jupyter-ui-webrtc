/*
 * Copyright (c) 2021-2023 Datalayer, Inc.
 *
 * MIT License
 */

'use client'

import { Cell, Jupyter } from '@datalayer/jupyter-react';
import { Theme } from '@primer/react/lib/ThemeProvider';

type CellComponentProps = {
  colorMode: 'light' | 'dark';
  theme: Theme;
}

export const CellComponent = (props: CellComponentProps) => {
  const { colorMode, theme } = props;
  return (
    <>
      <div style={{fontSize: 20}}>Jupyter Cell in Next.js</div>
      <Jupyter
        jupyterServerUrl=""
        jupyterServerToken="test"
        colormode={colorMode}
        theme={theme}
        startDefaultKernel
      >
        <Cell/>
    </Jupyter>
  </>
  )
}

export default CellComponent;