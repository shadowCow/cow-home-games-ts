import { useState } from "react";
import { LoginPage } from "./LoginPage/LoginPage";
import { Navigator } from "./Navigator/Navigator";
import { AuthGateway } from "../services/auth/AuthGateway";
import { GameService } from "../services/game/GameService";
import { User } from "../services/auth/User";

function App(props: { authGateway: AuthGateway; gameService: GameService }) {
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

  return <Navigator gameService={props.gameService} />;
}

export default App;
