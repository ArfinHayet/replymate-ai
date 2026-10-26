export type Tab = 'users' | 'pdfs' | 'csvs' | 'images' | 'contacts';

export type Filters = { search: string; userId: string; from: string; to: string };
export type AdminIdentity = { id: string; email: string };

export type AdminRow = {
  id: string;
  email?: string;
  name?: string;
  subject?: string | null;
  message?: string;
  userId?: string | null;
  userEmail?: string | null;
  fileName?: string;
  title?: string;
  description?: string;
  storageUrl?: string;
  rowCount?: number;
  createdAt: string;
  lastSignInAt?: string | null;
  blocked?: boolean;
};

export type PageResult = { items: AdminRow[]; total: number; page: number; pageSize: number };
export type PendingAction = { kind: 'delete' | 'block'; row: AdminRow; blocked?: boolean };
