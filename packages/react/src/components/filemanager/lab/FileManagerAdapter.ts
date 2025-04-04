/*
 * Copyright (c) 2021-2023 Datalayer, Inc.
 *
 * MIT License
 */

import { CommandRegistry } from '@lumino/commands';
import { each } from '@lumino/algorithm';
import { Signal } from '@lumino/signaling';
import { DockPanel, Menu, SplitPanel, Widget } from '@lumino/widgets';
import { ServiceManager } from '@jupyterlab-webrtc/services';
import { Dialog, ToolbarButton, showDialog } from '@jupyterlab/apputils';
import {
  CodeMirrorEditorFactory,
  CodeMirrorMimeTypeService,
  EditorLanguageRegistry,
} from '@jupyterlab/codemirror';
import { DocumentManager, IDocumentWidgetOpener } from '@jupyterlab/docmanager';
import { DocumentRegistry, IDocumentWidget } from '@jupyterlab/docregistry';
import { FileBrowser, FilterFileBrowserModel } from '@jupyterlab/filebrowser';
import { FileEditorFactory } from '@jupyterlab/fileeditor';
import { addIcon } from '@jupyterlab/ui-components';

import './FileManagerAdapter.css';

class FileBrowserAdapter {
  private _fileBrowserPanel: SplitPanel;

  constructor(serviceManager: ServiceManager.IManager) {
    this._fileBrowserPanel = new SplitPanel();
    this._fileBrowserPanel.id = 'dla-jlab-FleBrowser';
    this._fileBrowserPanel.orientation = 'horizontal';
    this._fileBrowserPanel.spacing = 0;

    serviceManager.ready.then(() => {
      createApp(serviceManager, this._fileBrowserPanel);
    });

    function createApp(
      serviceManager: ServiceManager.IManager,
      panel: SplitPanel
    ): void {
      const widgets: Widget[] = [];
      let activeWidget: Widget;

      const opener: IDocumentWidgetOpener = {
        opened: new Signal<IDocumentWidgetOpener, IDocumentWidget>(this),
        open: (widget: Widget) => {
          if (widgets.indexOf(widget) === -1) {
            dock.addWidget(widget, { mode: 'tab-after' });
            widgets.push(widget);
          }
          dock.activateWidget(widget);
          activeWidget = widget;
          widget.disposed.connect((w: Widget) => {
            const index = widgets.indexOf(w);
            widgets.splice(index, 1);
          });
        },
      };

      const docRegistry = new DocumentRegistry();
      const docManager = new DocumentManager({
        registry: docRegistry,
        manager: serviceManager as any,
        opener,
      });
      const languages = new EditorLanguageRegistry();
      EditorLanguageRegistry.getDefaultLanguages()
        .filter(language =>
          ['ipython', 'julia', 'python'].includes(language.name.toLowerCase())
        )
        .forEach(language => {
          languages.addLanguage(language);
        });
      // Language for Markdown cells
      languages.addLanguage({
        name: 'ipythongfm',
        mime: 'text/x-ipythongfm',
        load: async () => {
          const m = await import('@codemirror/lang-markdown');
          return m.markdown({
            codeLanguages: (info: string) => languages.findBest(info) as any,
          });
        },
      });
      const editorServices = {
        factoryService: new CodeMirrorEditorFactory(),
        mimeTypeService: new CodeMirrorMimeTypeService(languages),
      };
      const wFactory = new FileEditorFactory({
        editorServices,
        factoryOptions: {
          name: 'Editor',
          modelName: 'text',
          fileTypes: ['*'],
          defaultFor: ['*'],
          preferKernel: false,
          canStartKernel: true,
        },
      });
      docRegistry.addWidgetFactory(wFactory);

      const commands = new CommandRegistry();

      const fbModel = new FilterFileBrowserModel({
        manager: docManager,
      });
      const fileBrowserWidget = new FileBrowser({
        id: 'filebrowser',
        model: fbModel,
      });

      // Add a creator toolbar item.
      const creator = new ToolbarButton({
        icon: addIcon,
        onClick: () => {
          void docManager
            .newUntitled({
              type: 'file',
              path: fbModel.path,
            })
            .then(model => {
              docManager.open(model.path);
            });
        },
      });
      fileBrowserWidget.toolbar.insertItem(0, 'create', creator);

      panel.addWidget(fileBrowserWidget);
      SplitPanel.setStretch(fileBrowserWidget, 0);

      const dock = new DockPanel();
      panel.addWidget(dock);
      SplitPanel.setStretch(dock, 1);
      dock.spacing = 8;

      document.addEventListener('focus', event => {
        for (let i = 0; i < widgets.length; i++) {
          const widget = widgets[i];
          if (widget.node.contains(event.target as HTMLElement)) {
            activeWidget = widget;
            break;
          }
        }
      });

      // Add commands.
      commands.addCommand('file-open', {
        label: 'Open',
        //        icon: 'fa fa-folder-open-o',
        mnemonic: 0,
        execute: () => {
          each(fileBrowserWidget.selectedItems(), item => {
            docManager.openOrReveal(item.path);
          });
        },
      });
      commands.addCommand('file-rename', {
        label: 'Rename',
        //        icon: 'fa fa-edit',
        mnemonic: 0,
        execute: () => {
          return fileBrowserWidget.rename();
        },
      });
      commands.addCommand('file-save', {
        execute: () => {
          const context = docManager.contextForWidget(activeWidget);
          return context?.save();
        },
      });
      commands.addCommand('file-cut', {
        label: 'Cut',
        //        icon: 'fa fa-cut',
        execute: () => {
          fileBrowserWidget.cut();
        },
      });
      commands.addCommand('file-copy', {
        label: 'Copy',
        //        icon: 'fa fa-copy',
        mnemonic: 0,
        execute: () => {
          fileBrowserWidget.copy();
        },
      });
      commands.addCommand('file-delete', {
        label: 'Delete',
        //        icon: 'fa fa-remove',
        mnemonic: 0,
        execute: () => {
          return fileBrowserWidget.delete();
        },
      });
      commands.addCommand('file-duplicate', {
        label: 'Duplicate',
        //        icon: 'fa fa-copy',
        mnemonic: 0,
        execute: () => {
          return fileBrowserWidget.duplicate();
        },
      });
      commands.addCommand('file-paste', {
        label: 'Paste',
        //        icon: 'fa fa-paste',
        mnemonic: 0,
        execute: () => {
          return fileBrowserWidget.paste();
        },
      });
      commands.addCommand('file-download', {
        label: 'Download',
        //        icon: 'fa fa-download',
        execute: () => {
          return fileBrowserWidget.download();
        },
      });
      commands.addCommand('file-shutdown-kernel', {
        label: 'Shut Down Kernel',
        //        icon: 'fa fa-stop-circle-o',
        execute: () => {
          return fileBrowserWidget.shutdownKernels();
        },
      });
      commands.addCommand('file-dialog-demo', {
        label: 'Dialog Demo',
        execute: () => {
          createDialog();
        },
      });
      commands.addCommand('file-info-demo', {
        label: 'Info Demo',
        execute: () => {
          const msg = 'The quick brown fox jumped over the lazy dog';
          void showDialog({
            title: 'Cool Title',
            body: msg,
            buttons: [Dialog.okButton()],
          });
        },
      });

      commands.addKeyBinding({
        keys: ['Enter'],
        selector: '.jp-DirListing',
        command: 'file-open',
      });
      commands.addKeyBinding({
        keys: ['Accel S'],
        selector: '.jp-CodeMirrorEditor',
        command: 'file-save',
      });
      window.addEventListener('keydown', event => {
        commands.processKeydownEvent(event);
      });

      // Create a context menu.
      const menu = new Menu({ commands });
      menu.addItem({ command: 'file-open' });
      menu.addItem({ command: 'file-rename' });
      menu.addItem({ command: 'file-remove' });
      menu.addItem({ command: 'file-duplicate' });
      menu.addItem({ command: 'file-delete' });
      menu.addItem({ command: 'file-cut' });
      menu.addItem({ command: 'file-copy' });
      menu.addItem({ command: 'file-paste' });
      menu.addItem({ command: 'file-shutdown-kernel' });
      menu.addItem({ command: 'file-dialog-demo' });
      menu.addItem({ command: 'file-info-demo' });

      // Add a context menu to the dir listing.
      const node = fileBrowserWidget.node.getElementsByClassName(
        'jp-DirListing-content'
      )[0];
      node.addEventListener('contextmenu', (event: MouseEvent) => {
        event.preventDefault();
        const x = event.clientX;
        const y = event.clientY;
        menu.open(x, y);
      });

      // Handle resize events.
      window.addEventListener('resize', () => {
        panel.update();
      });
    }

    /**
     * Create a non-functional dialog demo.
     */
    function createDialog(): void {
      const body = document.createElement('div');
      const input = document.createElement('input');
      input.value = 'Untitled.ipynb';
      const selector = document.createElement('select');
      const option0 = document.createElement('option');
      option0.value = 'python';
      option0.text = 'Python';
      selector.appendChild(option0);
      const option1 = document.createElement('option');
      option1.value = 'julia';
      option1.text = 'Julia';
      selector.appendChild(option1);
      body.appendChild(input);
      body.appendChild(selector);
      void showDialog({
        title: 'Create new notebook',
      });
    }
  }

  get panel(): SplitPanel {
    return this._fileBrowserPanel;
  }
}

export default FileBrowserAdapter;
