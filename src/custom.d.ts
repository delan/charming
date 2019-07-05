declare module "*.bin" {
  const path: any;
  export default path;
}

// TODO upstream into DefinitelyTyped/DefinitelyTyped
declare module "react-virtualized-auto-sizer" {
  import { Component, ReactNode } from "react";

  export interface Size {
    width: number;
    height: number;
  }

  export interface AutoSizerProps {
    children: (size: Size) => ReactNode;
    defaultWidth?: number;
    defaultHeight?: number;
  }

  export default class extends Component<AutoSizerProps> {}
}
