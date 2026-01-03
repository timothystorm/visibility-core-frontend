export type RemoteError = {
  stage: 'manifest' | 'load' | 'mount';
  message: string;
  cause?: unknown;
};
