
export enum AppView {
  COURSE_GENERATOR = 'COURSE_GENERATOR',
  TASK_BOARD = 'TASK_BOARD',
  SUBJECT_TRACKER = 'SUBJECT_TRACKER',
  GOAL_TRACKER = 'GOAL_TRACKER',
  STUDY_TIMER = 'STUDY_TIMER',
}

export interface CodeSnippet {
  language: string;
  code: string;
  description: string;
}

export interface CourseSection {
  heading: string;
  content: string;
  codeSnippet?: CodeSnippet;
}

export interface Module {
  moduleTitle: string;
  sections: CourseSection[];
}

export interface VideoSuggestion {
  title: string;
  query: string;
  videoId: string;
}

export interface Reference {
  title: string;
  url: string;
}

export interface CourseData {
  id?: string;
  title: string;
  introduction: string;
  modules: Module[];
  videoSuggestions: VideoSuggestion[];
  references: Reference[];
  timestamp?: number;
}

export interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
}

export interface Task {
  id: string;
  text: string;
  completed: boolean;
  dueDate: string;
}

export interface Subject {
  id: string;
  name: string;
  progress: number;
}

export interface Goal {
  id: string;
  text: string;
  achieved: boolean;
}
