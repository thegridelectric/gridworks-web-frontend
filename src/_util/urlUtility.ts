export function parsePathname(pathname: string) {
    const locationRegexMatch = pathname.match(/^\/([\-A-Za-z0-9]+?)(\/([\-A-Fa-f0-9]+))?\/$/);
    const pathRoot = locationRegexMatch?.[1];
    const currentInstallationId = locationRegexMatch?.[3];
 
    return { pathRoot, currentInstallationId };
}