export type RemoteError = {
  stage: 'manifest' | 'load' | 'visibilityMount';
  message: string;
  cause?: unknown;
};
