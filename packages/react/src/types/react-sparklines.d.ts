declare module 'react-sparklines' {
  import { FC, ReactNode } from 'react';

  export interface SparklinesProps {
    data: number[];
    limit?: number;
    width?: number;
    height?: number;
    svgWidth?: number;
    svgHeight?: number;
    preserveAspectRatio?: string;
    margin?: number;
    min?: number;
    max?: number;
    style?: React.CSSProperties;
    children?: ReactNode;
  }

  export interface SparklinesLineProps {
    color?: string;
    style?: React.CSSProperties;
  }

  export interface SparklinesBarsProps {
    color?: string;
    style?: React.CSSProperties;
  }

  export interface SparklinesSpotsProps {
    size?: number;
    color?: string;
    style?: React.CSSProperties;
  }

  export const Sparklines: FC<SparklinesProps>;
  export const SparklinesLine: FC<SparklinesLineProps>;
  export const SparklinesBars: FC<SparklinesBarsProps>;
  export const SparklinesSpots: FC<SparklinesSpotsProps>;
} 