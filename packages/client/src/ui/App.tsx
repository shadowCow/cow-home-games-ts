import { useState } from "react";
import { LoginPage } from "./LoginPage/LoginPage";
import { AuthGateway } from "../services/auth/AuthGateway";
import { User } from "../services/auth/User";

function App(props: { authGateway: AuthGateway }) {
  const [user, setUser] = useState<User | null>(null);

  const handleLoginSuccess = (loggedInUser: User) => {
    setUser(loggedInUser);
  };

  const handleLogout = async () => {
    await props.authGateway.logout();
    setUser(null);
  };

  if (!user) {
    return (
      <LoginPage
        authGateway={props.authGateway}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  return (
    <div>
      <h1>Cow Home Games</h1>
      <p>Welcome, {user.username}!</p>
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
}

export default App;
