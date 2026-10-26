import { FileSpreadsheet, FileText, Images, Mail, Users, type LucideIcon } from 'lucide-react';
import type { Tab } from '../types/admin';

export const navigation: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: 'users', label: 'Users', icon: Users },
  { id: 'pdfs', label: 'PDFs', icon: FileText },
  { id: 'csvs', label: 'CSVs', icon: FileSpreadsheet },
  { id: 'images', label: 'Images', icon: Images },
  { id: 'contacts', label: 'Contact messages', icon: Mail },
];
