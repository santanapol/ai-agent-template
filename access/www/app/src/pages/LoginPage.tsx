import { Link } from "react-router-dom";

export function LoginPage() {
  return (
    <section>
      <h2>Login</h2>
      <p>Public route for gateway-authenticated entry.</p>
      <Link to="/ou/ou-001/branches/bkk-01/dashboard">Enter App</Link>
    </section>
  );
}
