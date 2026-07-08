import { useMemo } from 'react';
import { toast } from 'sonner';

const appFeedback = {
  message: {
    success: (content: string) => toast.success(content),
    error: (content: string) => toast.error(content),
    warning: (content: string) => toast.warning(content),
    info: (content: string) => toast.info(content),
  },
  notification: {
    success: (args: { message: string; description?: string }) =>
      toast.success(args.message, { description: args.description }),
    error: (args: { message: string; description?: string }) =>
      toast.error(args.message, { description: args.description }),
    warning: (args: { message: string; description?: string }) =>
      toast.warning(args.message, { description: args.description }),
    info: (args: { message: string; description?: string }) =>
      toast.info(args.message, { description: args.description }),
  },
  modal: {
    confirm: (_args: {
      title?: string;
      content?: React.ReactNode;
      onOk?: () => void | Promise<void>;
      okText?: string;
      cancelText?: string;
    }) => {
      // Callers should migrate to AlertDialog; this is a compatibility shim.
      console.warn('useAppFeedback.modal.confirm is deprecated — use AlertDialog');
    },
  },
};

export function useAppFeedback() {
  return useMemo(() => appFeedback, []);
}
