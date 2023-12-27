/*
 * Copyright (c) 2022-2023 Datalayer Inc. All rights reserved.
 *
 * MIT License
 */

import { IOutput } from "@jupyterlab/nbformat";
import { Output } from "@datalayer/jupyter-react";
import { OutputAdapter } from '@datalayer/jupyter-react';

type Props = {
  code: string;
  outputs: IOutput[];
  outputAdapter?: OutputAdapter;
  autoRun: boolean;
  codeNodeUuid: string;
  outputNodeUuid: string;
  executeTrigger: number;
}

export const JupyterOutputComponent = (props: Props) => {
  const { outputNodeUuid, code, outputs, executeTrigger, autoRun, outputAdapter } = props;
  return (
    <Output
      code={code}
      outputs={outputs}
      adapter={outputAdapter}
      showEditor={false}
      autoRun={autoRun}
      sourceId={outputNodeUuid}
      executeTrigger={executeTrigger}
      lumino={false}
      />
  )
}

export default JupyterOutputComponent;
