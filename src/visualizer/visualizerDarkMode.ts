export function getDarkModeForVisualizer(): boolean {
    const root = document.documentElement;
    const bsTheme = root.getAttribute('data-bs-theme');
    if (bsTheme === 'dark') {
        return true;
    }
    if (bsTheme === 'light') {
        return false;
    }
    const theme = root.getAttribute('data-theme');
    if (theme === 'dark') {
        return true;
    }
    if (theme === 'light') {
        return false;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
}
