/*
 * Copyright (c) 2021-2023 Datalayer, Inc.
 *
 * MIT License
 */

import { ContentLoader } from '@datalayer/primer-addons';
import BrowserOnly from '@docusaurus/core/lib/client/exports/BrowserOnly';
import React from 'react';

const Cell = (props: any) => {
  return (
    <BrowserOnly
      fallback={<div>Jupyter Cell fallback content for prerendering.</div>}>
      {() => {
        // Keep the import via require in the BrowserOnly code block.
        const { Jupyter } = require('@datalayer/jupyter-react/lib/jupyter/Jupyter');
        const { Cell } = require('@datalayer/jupyter-react/lib/components/cell/Cell');
        return (
          <>
            <Jupyter
              jupyterServerUrl=""
              jupyterServerToken="test"
              disableCssLoading={true}
              starDefaultKernel
              skeleton={<ContentLoader/>}
            >
              <Cell {...props}/>
            </Jupyter>
          </>
        )
     }}
    </BrowserOnly>
  )
}

// Add react-live imports you need here
const ReactLiveScope = {
  React,
  ...React,
  Cell,
};

export default ReactLiveScope;
