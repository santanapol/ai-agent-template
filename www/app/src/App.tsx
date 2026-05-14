import { RouterProvider } from "react-router-dom";
import { AuthProvider } from "./app/auth";
import { appRouter } from "./app/router";

function App() {
  return (
    <AuthProvider>
      <RouterProvider router={appRouter} />
    </AuthProvider>
  );
}

export default App;
