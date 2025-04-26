/*
 * Copyright (c) 2021-2023 Datalayer, Inc.
 *
 * MIT License
 */

import { CodeCell } from '@jupyterlab/cells';
import { Box, Button, Label } from '@primer/react';
import { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Cell } from '../components/cell/Cell';
import { useCellsStore } from '../components/cell/CellState';
import { KernelIndicator } from '../components/kernel/Kernelndicator';
import { JupyterContextProvider, useJupyter } from '../jupyter/JupyterContext';
import { useKernelsStore } from '../jupyter/kernel/KernelState';
import { DefaultWebRTCConnection, useWebRTC, WebRTCProvider } from '../jupyter/WebRTCContext';
import { JupyterReactTheme } from '../theme';

const CELL_ID = 'cell-example-1';

const DEFAULT_SOURCE = `from IPython.display import display

for i in range(10):
    display('I am a long string which is repeatedly added to the dom in separated divs: %d' % i)`;

const WebRTCCellExample = () => {
  return (
    <WebRTCProvider>
      <DefaultWebRTCConnection />
      <JupyterContextProvider>
        <CellExample />
      </JupyterContextProvider>
    </WebRTCProvider>
  );
};



const CellExample = () => {
  const { defaultKernel } = useJupyter();
  const cellsStore = useCellsStore();
  const kernelsStore = useKernelsStore();
  const webRTCContext = useWebRTC();
  console.log(
    'Jupyter Cell Outputs',
    (
      cellsStore.getAdapter(CELL_ID)?.cell as CodeCell
    )?.outputArea.model.toJSON()
  );

  useEffect(() => {
    console.log("WebRTC Status", webRTCContext.wsStatus);
  }, [webRTCContext.wsStatus]);

  return (

    <JupyterReactTheme>
      <Box as="h1">A Jupyter Cell (WebRTC)</Box>
      <Box>Source: {cellsStore.getSource(CELL_ID)}</Box>
      <Box>Outputs Count: {cellsStore.getOutputsCount(CELL_ID)}</Box>
      <Box>
        Kernel State:{' '}
        <Label>
          {defaultKernel && kernelsStore.getExecutionState(defaultKernel.id)}
        </Label>
      </Box>
      <Box>
        Kernel Phase:{' '}
        <Label>
          {defaultKernel && kernelsStore.getExecutionPhase(defaultKernel.id)}
        </Label>
      </Box>
      <Box display="flex">
        <Box>Kernel Indicator:</Box>
        <Box ml={3}>
          <KernelIndicator kernel={defaultKernel && defaultKernel.connection} />
        </Box>
      </Box>
      <Box>
        <Button onClick={() => cellsStore.execute(CELL_ID)}>Run cell</Button>
      </Box>
      <Cell source={DEFAULT_SOURCE} id={CELL_ID} />
    </JupyterReactTheme>
  );
};

const div = document.createElement('div');
document.body.appendChild(div);
const root = createRoot(div);

root.render(<WebRTCCellExample />);
