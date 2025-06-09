/*
 * Copyright (c) 2021-2023 Datalayer, Inc.
 *
 * MIT License
 */

import { Widget } from '@lumino/widgets';
import { Kernel, KernelMessage } from '@jupyterlab/services';
import {
  DOMWidgetView,
  WidgetModel,
  WidgetView,
} from '@jupyter-widgets/base/lib/widget';
import {
  IWidgetRegistryData,
  ExportMap,
  ExportData,
} from '@jupyter-widgets/base/lib/registry';
import { ICallbacks, shims } from '@jupyter-widgets/base/lib/services-shim';
import { valid } from 'semver';
import { INotebookModel } from '@jupyterlab/notebook';
import { requireLoader } from './../libembed-amd';
// import { BundledIPyWidgets, ExternalIPyWidgets } from '../../../components/notebook/Notebook';
import { SemVerCache } from '../semvercache';
import { WIDGET_STATE_MIMETYPE } from './../mimetypes';
import { HTMLManager } from './htmlmanager';

import * as base from '@jupyter-widgets/base';
import * as controls from '@jupyter-widgets/controls';
import * as output from '@jupyter-widgets/output';

/**
 * The class is responsible for the classic IPyWidgets rendering.
 */
export class ClassicWidgetManager extends HTMLManager {
  public _kernelConnection: Kernel.IKernelConnection | null;
  private _commRegistration: any;
  private _onError: any;
  private _registry: SemVerCache<ExportData>;
  private _isInitialized: boolean = false;
  private _initializationPromise: Promise<void>;

  constructor(options?: {
    loader?: (moduleName: string, moduleVersion: string) => Promise<any>;
  }) {
    super(options);
    
    // Initialize registry immediately to avoid undefined access
    this._registry = new SemVerCache<ExportData>();
    this._kernelConnection = null;
    
    // Bind methods immediately
    this.register = this.register.bind(this);
    this.registerWithKernel = this.registerWithKernel.bind(this);
    this._getRegistry = this._getRegistry.bind(this);
    this._handleCommOpen = this._handleCommOpen.bind(this);
    
    // Set up initialization promise
    this._initializationPromise = this._initializeRequireJS();
  }

  private async _initializeRequireJS(): Promise<void> {
    if (this._isInitialized) {
      return;
    }

    try {
      // Check if RequireJS is already available
      if (typeof (window as any).requirejs === 'undefined') {
        await this._loadRequireJS();
      }

      // Define AMD modules
      if (typeof (window as any).define !== 'undefined') {
        (window as any).define('@jupyter-widgets/base', base);
        (window as any).define('@jupyter-widgets/controls', controls);
        (window as any).define('@jupyter-widgets/output', output);
      }

      // Register core widget packages
      this.register({
        name: '@jupyter-widgets/base',
        version: base.JUPYTER_WIDGETS_VERSION,
        exports: () => import('@jupyter-widgets/base') as any,
      });
      this.register({
        name: '@jupyter-widgets/controls',
        version: controls.JUPYTER_CONTROLS_VERSION,
        exports: () => import('@jupyter-widgets/controls') as any,
      });
      this.register({
        name: '@jupyter-widgets/output',
        version: output.OUTPUT_WIDGET_VERSION,
        exports: () => import('@jupyter-widgets/output') as any,
      });

      this._isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize ClassicWidgetManager:', error);
      throw error;
    }
  }

  private _loadRequireJS(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if script is already loaded
      const existingScript = document.querySelector('script[src*="require.js"]');
      if (existingScript) {
        resolve();
        return;
      }

      const requireJsScript = document.createElement('script');
      const cdnOnlyScript = document.createElement('script');
      
      cdnOnlyScript.setAttribute('data-jupyter-widgets-cdn-only', 'true');
      document.body.appendChild(cdnOnlyScript);
      
      requireJsScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/require.js/2.3.6/require.min.js';
      requireJsScript.onload = () => resolve();
      requireJsScript.onerror = () => reject(new Error('Failed to load RequireJS'));
      
      document.body.appendChild(requireJsScript);
    });
  }

  private async _ensureInitialized(): Promise<void> {
    if (!this._isInitialized) {
      await this._initializationPromise;
    }
  }

  /**
   * Load widget state from notebook metadata
   */
  async _loadFromNotebook(notebook: INotebookModel): Promise<void> {
    const widget_md = notebook.getMetadata('widgets') as any;
    // Restore any widgets from saved state that are not live
    if (widget_md && widget_md[WIDGET_STATE_MIMETYPE]) {
      let state = widget_md[WIDGET_STATE_MIMETYPE];
      state = this.filterExistingModelState(state);
      await this.set_state(state);
    }
  }

  public async registerWithKernel(kernelConnection: Kernel.IKernelConnection | null) {
    await this._ensureInitialized();
    this._kernelConnection = kernelConnection;
    if (this._commRegistration) {
      this._commRegistration.dispose();
    }
    if (kernelConnection) {
      this._commRegistration = kernelConnection.registerCommTarget(
        this.comm_target_name,
        this._handleCommOpen
      );
    }
  }

  private async _handleCommOpen(
    comm: Kernel.IComm,
    message: KernelMessage.ICommOpenMsg
  ): Promise<void> {
    try {
      await this._ensureInitialized();
      console.log(`CLASSICWIDGETMANAGER _handleCommOpen: `, comm, message.content);
      const classicComm = new shims.services.Comm(comm);
      await this.handle_comm_open(classicComm, message);
    } catch (error) {
      console.error('Error in _handleCommOpen:', error);
      throw error;
    }
  }

  private _getRegistry() {
    return this._registry;
  }

  get onError() {
    return this._onError;
  }

  public display_view(
    view: Promise<DOMWidgetView> | DOMWidgetView,
    el: HTMLElement
  ): Promise<void> {
    return Promise.resolve(view).then(view => {
      Widget.attach(view.luminoWidget, el);
      view.on('remove', () => {
        console.log('The IPyWidgets view is removed', view);
      });
      //      return view;
    });
  }

  /**
   * Load a class and return a promise to the loaded object.
   */
  protected async loadClass(
    className: string,
    moduleName: string,
    moduleVersion: string
  ): Promise<typeof WidgetModel | typeof WidgetView> {
    await this._ensureInitialized();
    
    // Special-case the Jupyter base, controls, and output packages. If we have just a
    // plain version, with no indication of the compatible range, prepend a ^ to
    // get all compatible versions. We may eventually apply this logic to all
    // widget modules. See issues #2006 and #2017 for more discussion.
    if (
      (moduleName === '@jupyter-widgets/base' ||
        moduleName === '@jupyter-widgets/controls' ||
        moduleName === '@jupyter-widgets/output') &&
      valid(moduleVersion)
    ) {
      moduleVersion = `^${moduleVersion}`;
    }

    console.log(
      `CLASSICWIDGETMANAGER Loading ${className} from ${moduleName} version ${moduleVersion}`
    );

    let allVersions = this._getRegistry().getAllVersions(moduleName);
    const semanticVersion =
      moduleVersion.split('.').length === 2
        ? moduleVersion + '.0'
        : moduleVersion;

    console.log(`Loading module ${moduleName} with version ${semanticVersion}`);      
        
    if (!allVersions) {
      const module = await requireLoader(moduleName, semanticVersion);
      const widgetRegistryData = {
        name: moduleName,
        version: semanticVersion.replaceAll('^', ''),
        exports: { ...module },
      };

      console.log(
        `CLASSICWIDGETMANAGER Loading ${className} from ${moduleName} version ${moduleVersion}`,
        widgetRegistryData
      );
      this.register(widgetRegistryData);
      allVersions = this._getRegistry().getAllVersions(moduleName);
      if (!allVersions) {
        throw new Error(`No version of module ${moduleName} is registered`);
      }
    }
    const mod = this._getRegistry().get(moduleName, semanticVersion);
    if (!mod) {
      const registeredVersionList = Object.keys(allVersions!);
      throw new Error(
        `Module ${moduleName}, version ${semanticVersion} is not registered, however, \
        ${registeredVersionList.join(',')} ${
          registeredVersionList.length > 1 ? 'are' : 'is'
        }`
      );
    }

    console.log(
      `CLASSICWIDGETMANAGER Loading ${className} from ${moduleName} version ${moduleVersion}`,
      mod,
      allVersions
    );

    let module: ExportMap;
    if (typeof mod === 'function') {
      module = await mod();
    } else {
      module = await mod;
    }
    const cls: any = module[className];
    if (!cls) {
      throw new Error(`Class ${className} not found in module ${moduleName}`);
    }
    return cls;
  }

  public callbacks(view: WidgetView): ICallbacks {
    const baseCallbacks = super.callbacks(view);
    return Object.assign({}, baseCallbacks, {
      iopub: { output: (msg: any) => this._onError.emit(msg) },
    });
  }

  public _create_comm(
    target_name: any,
    model_id: string,
    data?: any,
    metadata?: any,
    buffers?: ArrayBuffer[] | ArrayBufferView[]
  ): Promise<any> {
    const comm = this._kernelConnection?.createComm(target_name, model_id);
    if (data || metadata) {
      comm?.open(data, metadata);
    }
    return Promise.resolve(new shims.services.Comm(comm!));
  }

  public _get_comm_info(): Promise<any> {
    return this._kernelConnection!.requestCommInfo({
      target_name: this.comm_target_name,
    }).then((reply: any) => reply.content.comms);
  }
  /*
  public loadBundledIPyWidgets = (ipywidgets: BundledIPyWidgets[]): void => {
    const loadIPyWidget = (name: string, version: string, module: any) => {
      requireLoader(name, version).then(module => {
        //
      });
    };
    ipywidgets.forEach(ipywidget => {
      loadIPyWidget(ipywidget.name, ipywidget.version, ipywidget.module);
    });
  };

  public loadExternalIPyWidgets(ipywidgets: ExternalIPyWidgets[]): void {
    const loadIPyWidget = (name: string, version: string) => {
      requireLoader(name, version).then(module => {
        //
      });
    };
    ipywidgets.forEach(ipywidget => {
      loadIPyWidget(ipywidget.name, ipywidget.version);
    });
  }
  */
  register(data: IWidgetRegistryData): void {
    this._getRegistry().set(data.name, data.version, data.exports);
  }
}

export default ClassicWidgetManager;
