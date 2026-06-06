import React from 'react';
import * as Icons from 'lucide-react';

type LucideProps = { size?: number; color?: string; style?: React.CSSProperties };
type LucideComp = React.ComponentType<LucideProps>;

export function EventIcon({ name, size = 14, color, style }: { name: string } & LucideProps) {
  const Comp = (Icons as Record<string, LucideComp>)[name];
  if (!Comp) return null;
  return <Comp size={size} color={color} style={style} />;
}

export const AVAILABLE_EVENT_ICONS = [
  'GraduationCap', 'Flag', 'Layers', 'Bell', 'BookOpen',
  'Brain', 'Calendar', 'Clock', 'FileText', 'Star',
  'Target', 'Timer', 'Trophy', 'Zap', 'AlertCircle',
  'CheckSquare', 'Bookmark', 'Briefcase', 'FlaskConical', 'Pencil',
  'Music', 'Dumbbell', 'Heart', 'Code', 'Laptop',
  'ListChecks', 'Repeat', 'BookMarked', 'Lightbulb', 'Flame',
] as const;
