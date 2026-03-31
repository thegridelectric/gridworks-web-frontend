import { useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { login } from "./auth/auth";
import HeaderLayout from "./_layout/HeaderLayout";

export default function LoginPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setSubmitting(true);
        try {
            await login(username, password);
            const from = typeof location.state === 'object' && location.state && 'from' in location.state
                ? location.state.from
                : null;
            navigate(typeof from === 'string' ? from : "/installations/", { replace: true });
        } catch (err) {
            setError(err instanceof Error ? err.message : "Sign-in failed");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <HeaderLayout>
            <div className="mx-auto text-start" style={{ maxWidth: "400px" }}>
                <h1 className="h3 mb-4 text-center">Sign in</h1>
                <form onSubmit={onSubmit}>
                    {error && (
                        <div className="alert alert-danger py-2 small mb-3" role="alert">
                            {error}
                        </div>
                    )}
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
                        className="form-control mb-3"
                        autoComplete="current-password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    <button type="submit" className="btn btn-primary w-100" disabled={submitting}>
                        {submitting ? "Signing in…" : "Sign in"}
                    </button>
                </form>
            </div>
        </HeaderLayout>
    );
}
