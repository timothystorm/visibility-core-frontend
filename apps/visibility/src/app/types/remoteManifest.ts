export interface RemoteManifest {
    remotes: Record<string, {
        current: string;
        next?: string;
        [key: string]: string | undefined;
    }>;
}