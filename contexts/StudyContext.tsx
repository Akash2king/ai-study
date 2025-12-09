
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Task, Subject, Goal, CourseData } from '../types';
import * as db from '../services/databaseService';

interface StudyContextType {
  tasks: Task[];
  subjects: Subject[];
  goals: Goal[];
  savedCourses: CourseData[];
  addTask: (text: string, dueDate: string) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  addSubject: (name: string) => void;
  updateSubject: (id: string, updates: Partial<Subject>) => void;
  deleteSubject: (id: string) => void;
  addGoal: (text: string) => void;
  updateGoal: (id: string, updates: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
  saveCourse: (course: CourseData) => void;
  deleteCourse: (id: string) => void;
  refreshCourses: () => Promise<void>;
}

const StudyContext = createContext<StudyContextType | undefined>(undefined);

export const useStudyContext = () => {
  const context = useContext(StudyContext);
  if (!context) {
    throw new Error('useStudyContext must be used within a StudyProvider');
  }
  return context;
};

export const StudyProvider: React.FC<{ children: ReactNode; userId?: string }> = ({ children, userId = 'default' }) => {
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('ai-study-tasks');
    return saved ? JSON.parse(saved) : [];
  });

  const [subjects, setSubjects] = useState<Subject[]>(() => {
    const saved = localStorage.getItem('ai-study-subjects');
    return saved ? JSON.parse(saved) : [];
  });

  const [goals, setGoals] = useState<Goal[]>(() => {
    const saved = localStorage.getItem('ai-study-goals');
    return saved ? JSON.parse(saved) : [];
  });

  const [savedCourses, setSavedCourses] = useState<CourseData[]>([]);

  // Initialize database and load courses
  useEffect(() => {
    const initAndLoad = async () => {
      try {
        await db.initDatabase();
        const courses = await db.getCoursesByUserId(userId);
        setSavedCourses(courses);
      } catch (error) {
        console.error('Failed to initialize database:', error);
      }
    };
    initAndLoad();
  }, [userId]);

  // Persistence effects for tasks, subjects, goals (keeping localStorage for these)
  useEffect(() => localStorage.setItem('ai-study-tasks', JSON.stringify(tasks)), [tasks]);
  useEffect(() => localStorage.setItem('ai-study-subjects', JSON.stringify(subjects)), [subjects]);
  useEffect(() => localStorage.setItem('ai-study-goals', JSON.stringify(goals)), [goals]);

  // Task Actions
  const addTask = (text: string, dueDate: string) => {
    const newTask: Task = { id: Date.now().toString(), text, completed: false, dueDate };
    setTasks(prev => [...prev, newTask]);
  };

  const updateTask = (id: string, updates: Partial<Task>) => {
    setTasks(prev => prev.map(t => (t.id === id ? { ...t, ...updates } : t)));
  };

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  // Subject Actions
  const addSubject = (name: string) => {
    const newSubject: Subject = { id: Date.now().toString(), name, progress: 0 };
    setSubjects(prev => [...prev, newSubject]);
  };

  const updateSubject = (id: string, updates: Partial<Subject>) => {
    setSubjects(prev => prev.map(s => (s.id === id ? { ...s, ...updates } : s)));
  };

  const deleteSubject = (id: string) => {
    setSubjects(prev => prev.filter(s => s.id !== id));
  };

  // Goal Actions
  const addGoal = (text: string) => {
    const newGoal: Goal = { id: Date.now().toString(), text, achieved: false };
    setGoals(prev => [...prev, newGoal]);
  };

  const updateGoal = (id: string, updates: Partial<Goal>) => {
    setGoals(prev => prev.map(g => (g.id === id ? { ...g, ...updates } : g)));
  };

  const deleteGoal = (id: string) => {
    setGoals(prev => prev.filter(g => g.id !== id));
  };

  // Course Actions
  const saveCourse = async (course: CourseData) => {
    const courseId = course.id || `course_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newCourse = { ...course, id: courseId, userId, timestamp: Date.now() };
    
    try {
      // Save to database
      await db.saveCourse(newCourse, userId);
      
      // Update state
      setSavedCourses(prev => {
        // Check if course already exists to prevent duplicates
        if (prev.some(c => c.id === courseId)) {
          return prev.map(c => c.id === courseId ? newCourse : c);
        }
        return [newCourse, ...prev];
      });

      // Automatically create a Subject
      const newSubject: Subject = {
        id: `subj-${courseId}`,
        name: course.title,
        progress: 0
      };
      setSubjects(prev => {
        if (!prev.some(s => s.id === newSubject.id)) {
          return [...prev, newSubject];
        }
        return prev;
      });

      // Automatically create Tasks for each module
      const newTasks: Task[] = course.modules.map((mod, index) => ({
        id: `task-${courseId}-${index}`,
        text: `Study Module ${index + 1}: ${mod.moduleTitle}`,
        completed: false,
        dueDate: new Date(Date.now() + (index + 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      }));
      
      setTasks(prev => {
        const existingTaskIds = new Set(prev.map(t => t.id));
        const tasksToAdd = newTasks.filter(t => !existingTaskIds.has(t.id));
        return [...prev, ...tasksToAdd];
      });
    } catch (error) {
      console.error('Failed to save course:', error);
      throw error;
    }
  };

  const deleteCourse = async (id: string) => {
    try {
      await db.deleteCourse(id);
      setSavedCourses(prev => prev.filter(c => c.id !== id));
    } catch (error) {
      console.error('Failed to delete course:', error);
      throw error;
    }
  };

  const refreshCourses = async () => {
    try {
      const courses = await db.getCoursesByUserId(userId);
      setSavedCourses(courses);
    } catch (error) {
      console.error('Failed to refresh courses:', error);
    }
  };

  return (
    <StudyContext.Provider value={{
      tasks, subjects, goals, savedCourses,
      addTask, updateTask, deleteTask,
      addSubject, updateSubject, deleteSubject,
      addGoal, updateGoal, deleteGoal,
      saveCourse, deleteCourse, refreshCourses
    }}>
      {children}
    </StudyContext.Provider>
  );
};
