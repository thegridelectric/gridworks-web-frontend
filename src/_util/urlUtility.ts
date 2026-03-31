export function parsePathname(pathname: string) {
    const parts = pathname.replace(/\/+$/, '').split('/').filter(Boolean);
    if (parts.length >= 2) {
        return {
            pathRoot: parts[0],
            currentInstallationId: parts.slice(1).join('/'),
        };
    }
    if (parts.length === 1) {
        return { pathRoot: parts[0], currentInstallationId: undefined };
    }
    return { pathRoot: undefined, currentInstallationId: undefined };
}
