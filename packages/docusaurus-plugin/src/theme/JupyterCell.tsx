/*
 * Copyright (c) 2021-2023 Datalayer, Inc.
 *
 * MIT License
 */

import { ContentLoader } from '@datalayer/primer-addons';
import BrowserOnly from '@docusaurus/core/lib/client/exports/BrowserOnly';
import React from 'react';

type JupyterCellProps = {
  jupyterServerUrl: string;
  jupyterServerToken: string;
  source: string;
}

const JupyterCell = (props: JupyterCellProps) => {
  return (
    <BrowserOnly
      fallback={<div>Jupyter Cell fallback content for prerendering.</div>}>
      {() => {

        // Keep the import via require and keep it into the BrowserOnly code block..
        // const { JupyterReactTheme } = require('@datalayer/jupyter-react/lib/theme');
        // const { useJupyter } = require('@datalayer/jupyter-react/lib/jupyter/JupyterContext');
        const { Jupyter } = require('@datalayer/jupyter-react/lib/jupyter/Jupyter');
        const { Cell } = require('@datalayer/jupyter-react/lib/components/cell/Cell');

        const {
          jupyterServerUrl = '',
          jupyterServerToken = 'test',
          source = '',
        } = props;
        /*
        useJupyter({
          jupyterServerUrl,
          jupyterServerToken,
        });
        */
        return (
          <>
            <Jupyter
              jupyterServerUrl={jupyterServerUrl}
              jupyterServerToken={jupyterServerToken}
              startDefaultKernel
              skeleton={<ContentLoader/>}
            >
              <Cell
                source={source}
              />
            </Jupyter>
          </>
        )

      }}
    </BrowserOnly>
  )
}

export default JupyterCell;
