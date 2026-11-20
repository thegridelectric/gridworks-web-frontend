type FloPenGitCommitCopyProps = {
    commit: string;
};

export function FloPenGitCommitCopy({ commit }: FloPenGitCommitCopyProps) {
    async function onCopy() {
        try {
            await navigator.clipboard.writeText(commit);
        } catch {
            window.prompt("Copy FloGitCommit:", commit);
        }
    }

    return (
        <div className="flo-pen-git-commit">
            <div className="flo-pen-git-commit__row">
                <span className="flo-pen-git-commit__label">FloGitCommit</span>
                <button
                    type="button"
                    className="flo-pen-git-commit__box"
                    aria-label={`Copy FloGitCommit ${commit}`}
                    title="Click to copy"
                    onClick={() => void onCopy()}
                >
                    <span className="flo-pen-git-commit__hash">{commit}</span>
                    <i className="bi bi-clipboard flo-pen-git-commit__icon" aria-hidden />
                </button>
            </div>
        </div>
    );
}