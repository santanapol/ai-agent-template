"use client";

import {
  createContext,
  forwardRef,
  type MouseEvent,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import NextLink from "next/link";
import {
  useParams as useNextParams,
  usePathname,
  useRouter,
  useSearchParams as useSearchParamsNext,
} from "next/navigation";

const isVitest = typeof process !== "undefined" && process.env.VITEST === "true";

function recordTestNavigation(
  method: "push" | "replace",
  to: string,
  options?: { replace?: boolean; state?: unknown },
) {
  if (!isVitest) return;
  globalThis.__ZERO_TEST_NAV__?.[method](to, options);
}

type NavContextValue = {
  pathname: string;
  searchParams: URLSearchParams;
  params: Record<string, string | undefined>;
  locationState: unknown;
  navigate: (to: string, options?: { replace?: boolean; state?: unknown }) => void;
  setSearchParams: (
    next: URLSearchParams | Record<string, string> | ((prev: URLSearchParams) => URLSearchParams),
    options?: { replace?: boolean },
  ) => void;
  testMode: boolean;
};

const NavContext = createContext<NavContextValue | null>(null);

function useNavContext() {
  return useContext(NavContext);
}

function parseLocation(entry: string) {
  const normalized = entry.startsWith("/") ? entry : `/${entry}`;
  const queryIndex = normalized.indexOf("?");
  const pathname = queryIndex >= 0 ? normalized.slice(0, queryIndex) : normalized;
  const search = queryIndex >= 0 ? normalized.slice(queryIndex + 1) : "";
  return {
    pathname: pathname || "/",
    searchParams: new URLSearchParams(search),
  };
}

function matchPath(pattern: string, pathname: string): Record<string, string> | null {
  const patternParts = pattern.split("/").filter(Boolean);
  const pathParts = pathname.split("/").filter(Boolean);
  if (patternParts.length !== pathParts.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < patternParts.length; i++) {
    const segment = patternParts[i];
    if (segment.startsWith(":")) {
      params[segment.slice(1)] = pathParts[i];
    } else if (segment !== pathParts[i]) {
      return null;
    }
  }
  return params;
}

export type MemoryRouterProps = {
  children: ReactNode;
  initialEntries?: string[];
  initialIndex?: number;
};

export function MemoryRouter({ children, initialEntries = ["/"], initialIndex = 0 }: MemoryRouterProps) {
  const [location, setLocation] = useState(() =>
    parseLocation(initialEntries[initialIndex] ?? initialEntries[0] ?? "/"),
  );
  const [params, _setParams] = useState<Record<string, string | undefined>>({});
  const [locationState, setLocationState] = useState<unknown>(null);
  const locationRef = useRef(location);
  locationRef.current = location;

  const navigate = useCallback((to: string, options?: { replace?: boolean; state?: unknown }) => {
    const parsed = parseLocation(to);
    const current = locationRef.current;
    const nextSearch = parsed.searchParams.toString();
    const currentSearch = current.searchParams.toString();
    if (parsed.pathname === current.pathname && nextSearch === currentSearch) {
      return;
    }
    setLocation(parsed);
    if (options?.state !== undefined) {
      setLocationState(options.state);
    }
    if (options?.replace) {
      recordTestNavigation("replace", to, options);
    } else {
      recordTestNavigation("push", to, options);
    }
  }, []);

  const setSearchParams = useCallback(
    (
      next: URLSearchParams | Record<string, string> | ((prev: URLSearchParams) => URLSearchParams),
      options?: { replace?: boolean },
    ) => {
      const current = locationRef.current;
      const resolved =
        typeof next === "function"
          ? next(new URLSearchParams(current.searchParams.toString()))
          : next instanceof URLSearchParams
            ? next
            : new URLSearchParams(next);
      const query = resolved.toString();
      const href = query ? `${current.pathname}?${query}` : current.pathname;
      navigate(href, options);
    },
    [navigate],
  );

  const value = useMemo<NavContextValue>(
    () => ({
      pathname: location.pathname,
      searchParams: new URLSearchParams(location.searchParams.toString()),
      params,
      locationState,
      navigate,
      setSearchParams,
      testMode: true,
    }),
    [location, params, locationState, navigate, setSearchParams],
  );

  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}

export function Routes({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function Route({ path, element, children }: { path?: string; element?: ReactNode; children?: ReactNode }) {
  const parent = useNavContext();
  if (!parent || !path) {
    return <>{element ?? children}</>;
  }

  const matched = matchPath(path, parent.pathname);
  if (!matched) return null;

  const childValue: NavContextValue = {
    ...parent,
    params: { ...parent.params, ...matched },
  };

  return <NavContext.Provider value={childValue}>{element ?? children}</NavContext.Provider>;
}

export function useNavigate() {
  const ctx = useNavContext();
  const router = useRouter();
  return useCallback(
    (to: string, options?: { replace?: boolean; state?: unknown }) => {
      if (ctx) {
        ctx.navigate(to, options);
        return;
      }
      if (options?.replace) {
        router.replace(to);
      } else {
        router.push(to);
      }
    },
    [ctx, router],
  );
}

export function useLocation() {
  const ctx = useNavContext();
  const pathname = usePathname();
  const searchParams = useSearchParamsNext();
  const search = searchParams.toString();

  if (ctx) {
    const query = ctx.searchParams.toString();
    return {
      pathname: ctx.pathname,
      search: query ? `?${query}` : "",
      hash: "",
      state: ctx.locationState,
      key: ctx.pathname,
    };
  }

  return {
    pathname: pathname ?? "/",
    search: search ? `?${search}` : "",
    hash: "",
    state: null,
    key: pathname ?? "/",
  };
}

export function useParams<T extends Record<string, string | undefined> = Record<string, string | undefined>>() {
  const ctx = useNavContext();
  const nextParams = useNextParams();
  if (ctx && Object.keys(ctx.params).length > 0) {
    return ctx.params as T;
  }
  return (nextParams ?? {}) as T;
}

export function Navigate({ to, replace = true }: { to: string; replace?: boolean }) {
  const ctx = useNavContext();
  const router = useRouter();
  const isTestStub = isVitest && !ctx;
  const isMemoryTest = Boolean(ctx?.testMode);

  useEffect(() => {
    if (isTestStub || isMemoryTest) return;
    if (replace) {
      router.replace(to);
    } else {
      router.push(to);
    }
  }, [router, to, replace, isTestStub, isMemoryTest]);

  if (isTestStub || isMemoryTest) {
    return <div data-testid="navigate" data-to={to} />;
  }

  return null;
}

export function useSearchParams(): [
  URLSearchParams,
  (
    next: URLSearchParams | Record<string, string> | ((prev: URLSearchParams) => URLSearchParams),
    options?: { replace?: boolean },
  ) => void,
] {
  const ctx = useNavContext();
  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const params = useSearchParamsNext();
  const paramsRef = useRef(params);
  paramsRef.current = params;
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  const searchParams = useMemo(() => {
    if (ctx) {
      return new URLSearchParams(ctx.searchParams.toString());
    }
    return new URLSearchParams(params.toString());
  }, [ctx, params]);

  const setSearchParams = useCallback(
    (
      next: URLSearchParams | Record<string, string> | ((prev: URLSearchParams) => URLSearchParams),
      options?: { replace?: boolean },
    ) => {
      const activeCtx = ctxRef.current;
      if (activeCtx) {
        activeCtx.setSearchParams(next, options);
        return;
      }
      const currentParams = paramsRef.current;
      const currentPathname = pathnameRef.current;
      const resolved =
        typeof next === "function"
          ? next(new URLSearchParams(currentParams.toString()))
          : next instanceof URLSearchParams
            ? next
            : new URLSearchParams(next);
      const query = resolved.toString();
      const href = query ? `${currentPathname}?${query}` : currentPathname;
      const currentHref = currentParams.toString() ? `${currentPathname}?${currentParams.toString()}` : currentPathname;
      if (href === currentHref) return;
      if (options?.replace) {
        router.replace(href);
      } else {
        router.push(href);
      }
    },
    [router],
  );

  return [searchParams, setSearchParams];
}

export const Link = forwardRef<
  HTMLAnchorElement,
  {
    to: string;
    children?: ReactNode;
    className?: string;
    onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
    "aria-label"?: string;
    title?: string;
  }
>(function Link({ to, children, onClick, ...props }, ref) {
  const ctx = useNavContext();

  if (ctx?.testMode) {
    return (
      <a
        ref={ref}
        href={to}
        onClick={(event) => {
          event.preventDefault();
          onClick?.(event);
          ctx.navigate(to);
        }}
        {...props}
      >
        {children}
      </a>
    );
  }

  return (
    <NextLink ref={ref} href={to} onClick={onClick} {...props}>
      {children}
    </NextLink>
  );
});
