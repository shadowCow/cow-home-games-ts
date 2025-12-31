import { useState } from "react";
import { LoginPage } from "./LoginPage/LoginPage";
import { Home } from "./Home/Home";
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

  return <Home user={user} onLogout={handleLogout} />;
}

export default App;
