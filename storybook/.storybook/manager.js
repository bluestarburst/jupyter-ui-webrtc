import { addons } from '@storybook/manager-api';

addons.setConfig({
  enableShortcuts: false,
  showToolbar: true,
  toolbar: {
    title: { hidden: false },
    zoom: { hidden: false },
    eject: { hidden: false },
    copy: { hidden: false },
    fullscreen: { hidden: false },
  },
}); 