export interface ASTNode {
  [field: string]: any;
}

export interface MarkdownNote {
  noteType: 'markdown';
  text: string;
  children: ASTNode[];
}

export interface ScriptNote {
  noteType: 'script';
  text: string;
  children: ASTNode[];
}

export interface AsteroidNote {
  noteType: 'asteroid';
  text: string;
  children: ASTNode[];
  id: string;
}

export type Note = MarkdownNote | ScriptNote | AsteroidNote;