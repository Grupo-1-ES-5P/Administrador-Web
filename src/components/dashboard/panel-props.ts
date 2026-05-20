import type { AuthSession, CrudOperation, FeedbackMessage } from "@/lib/types";

export interface DashboardPanelProps {
  operation: CrudOperation;
  session: AuthSession;
  onFeedback: (message: FeedbackMessage | null) => void;
  onUnauthorized: () => void;
}
