import { useState } from 'react';
import { loginToVisualizer } from './visualizerAuth';

interface VisualizerSignInFormProps {
    onSuccess: () => void;
}

export default function VisualizerSignInForm({ onSuccess }: VisualizerSignInFormProps) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setSubmitting(true);
        try {
            await loginToVisualizer(username, password);
            onSuccess();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Sign-in failed');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="visualizer-sign-in border rounded p-3 mb-4" style={{ maxWidth: '420px', borderColor: 'var(--bs-border-color, #444)' }}>
            <h6 className="mb-2">Visualizer API sign-in</h6>
            <p className="small text-secondary mb-3">
                Plots are loaded from the visualizer service. Use the same username and password as the backoffice login page.
            </p>
            <form onSubmit={onSubmit}>
                {error && <div className="alert alert-danger py-2 small mb-2" role="alert">{error}</div>}
                <input
                    type="text"
                    className="form-control mb-2"
                    autoComplete="username"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                />
                <input
                    type="password"
                    className="form-control mb-2"
                    autoComplete="current-password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
                <button type="submit" className="btn btn-sm btn-primary" disabled={submitting}>
                    {submitting ? 'Signing in…' : 'Sign in to visualizer'}
                </button>
            </form>
        </div>
    );
}
