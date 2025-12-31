import { useState } from "react";
import { AuthGateway } from "../../services/auth/AuthGateway";
import { User } from "../../services/auth/User";
import { TextField } from "../common/TextField/TextField";
import { Button } from "../common/Button/Button";
import styles from "./LoginPage.module.css";

export function LoginPage(props: {
  authGateway: AuthGateway;
  onLoginSuccess: (user: User) => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const user = await props.authGateway.login(username, password);
      props.onLoginSuccess(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h1 className={styles.title}>Cow Home Games</h1>
        <h2 className={styles.subtitle}>Login</h2>
        <form onSubmit={handleSubmit} className={styles.form}>
          <TextField
            id="username"
            type="text"
            label="Username"
            value={username}
            onChange={setUsername}
            disabled={loading}
            required
          />
          <TextField
            id="password"
            type="password"
            label="Password"
            value={password}
            onChange={setPassword}
            disabled={loading}
            required
          />
          {error && <div className={styles.error}>{error}</div>}
          <Button type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </Button>
        </form>
      </div>
    </div>
  );
}
