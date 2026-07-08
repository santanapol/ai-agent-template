import Error500 from "@/views/Error500";

/** Legacy react-router error boundary — Next.js uses app/error.tsx instead. */
const RouteErrorPage = () => <Error500 />;

export default RouteErrorPage;
