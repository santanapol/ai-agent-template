import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

export type ConfirmDialogOptions = {
  title?: string;
  content?: React.ReactNode;
  onOk?: () => void | Promise<void>;
  okText?: string;
  cancelText?: string;
  danger?: boolean;
};

type ConfirmDialogContextValue = {
  confirm: (options: ConfirmDialogOptions) => Promise<boolean>;
};

const ConfirmDialogContext = createContext<ConfirmDialogContextValue | null>(null);

export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmDialogOptions>({});
  const [pending, setPending] = useState(false);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmDialogOptions) => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setOptions(opts);
      setOpen(true);
    });
  }, []);

  const finish = (value: boolean) => {
    resolveRef.current?.(value);
    resolveRef.current = null;
    setOpen(false);
    setPending(false);
  };

  const handleOk = async () => {
    setPending(true);
    try {
      await options.onOk?.();
      finish(true);
    } catch {
      finish(false);
    }
  };

  const handleCancel = () => {
    finish(false);
  };

  return (
    <ConfirmDialogContext.Provider value={{ confirm }}>
      {children}
      <AlertDialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !pending) handleCancel();
        }}
      >
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>{options.title ?? 'Confirm'}</AlertDialogTitle>
            {options.content ? (
              <AlertDialogDescription>
                {typeof options.content === 'string' ? options.content : options.content}
              </AlertDialogDescription>
            ) : null}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending} onClick={handleCancel}>
              {options.cancelText ?? 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              className={cn(options.danger && 'bg-destructive text-white hover:bg-destructive/90')}
              onClick={(e) => {
                e.preventDefault();
                void handleOk();
              }}
            >
              {options.okText ?? 'OK'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmDialogContext.Provider>
  );
}

export function useConfirmDialog() {
  const ctx = useContext(ConfirmDialogContext);
  if (!ctx) {
    throw new Error('useConfirmDialog must be used within ConfirmDialogProvider');
  }
  return ctx;
}
