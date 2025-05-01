/*
 * Copyright (c) 2021-2023 Datalayer, Inc.
 *
 * MIT License
 */

import { ReactJsIcon, RingedPlanetIcon } from '@datalayer/icons-react';
import { JupyterFrontEnd } from '@jupyterlab/application';
import { Box, UnderlineNav } from '@primer/react';
import { useEffect, useState } from 'react';
import { WebRTCServerConnection } from '../custom/services/webrtc-serverconnection';
import { requestAPI } from '../jupyter/JupyterHandlers';
import { JupyterReactTheme } from '../theme';
import { AboutTab } from './tabs/AboutTab';
import { ComponentsTab } from './tabs/ComponentsTab';

export type JupyterFrontEndProps = {
  app?: JupyterFrontEnd;
};

const JupyterReact = (props: JupyterFrontEndProps): JSX.Element => {
  const { app } = props;
  const [tab, setTab] = useState(1);
  const [version, setVersion] = useState('');
  useEffect(() => {
    requestAPI<any>(WebRTCServerConnection.makeSettings(), 'jupyter_react', 'config')
      .then(data => {
        setVersion(data.version);
      })
      .catch(reason => {
        console.error(
          `Error while accessing the jupyter server jupyter_react extension.\n${reason}`
        );
      });
  });
  return (
    <>
      <JupyterReactTheme loadJupyterLabCss={false}>
        <Box mb={3} style={{minWidth: 200}}>
          <UnderlineNav aria-label="jupyter-react">
            <UnderlineNav.Item
              aria-current={tab === 1 ? "page" : undefined}
              icon={RingedPlanetIcon}
              onSelect={e => {
                e.preventDefault();
                setTab(1);
              }}
            >
              Components
            </UnderlineNav.Item>
            <UnderlineNav.Item
              aria-current={tab === 2 ? "page" : undefined}
              icon={ReactJsIcon}
              onSelect={e => {
                e.preventDefault();
                setTab(2);
              }}
            >
              About
            </UnderlineNav.Item>
          </UnderlineNav>
        </Box>
        <Box m={3}>
          {tab === 1 && <ComponentsTab app={app} />}
          {tab === 2 && <AboutTab version={version} />}
        </Box>
      </JupyterReactTheme>
    </>
  );
};

export default JupyterReact;
