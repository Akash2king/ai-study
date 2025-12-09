import initSqlJs, { Database } from 'sql.js';
import { CourseData, UserProfile, CourseProgress } from '../types';

let db: Database | null = null;
let isInitialized = false;

const DB_NAME = 'ai-study-assistant.db';

// Initialize the database
export const initDatabase = async (): Promise<void> => {
  if (isInitialized) return;

  try {
    // Initialize SQL.js
    const SQL = await initSqlJs({
      locateFile: (file) => `https://sql.js.org/dist/${file}`
    });

    // Try to load existing database from localStorage
    const savedDb = localStorage.getItem(DB_NAME);
    if (savedDb) {
      const buffer = Uint8Array.from(atob(savedDb), c => c.charCodeAt(0));
      db = new SQL.Database(buffer);
    } else {
      db = new SQL.Database();
    }

    // Create users table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        created_at INTEGER NOT NULL
      )
    `);

    // Create courses table with user_id
    db.run(`
      CREATE TABLE IF NOT EXISTS courses (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        introduction TEXT,
        timestamp INTEGER NOT NULL,
        data TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Create course progress table
    db.run(`
      CREATE TABLE IF NOT EXISTS course_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        course_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        completed_modules TEXT,
        completed_sections TEXT,
        last_accessed_at INTEGER NOT NULL,
        progress_percentage REAL DEFAULT 0,
        FOREIGN KEY (course_id) REFERENCES courses(id),
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(course_id, user_id)
      )
    `);

    // Create chat history table
    db.run(`
      CREATE TABLE IF NOT EXISTS chat_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        course_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        sender TEXT NOT NULL,
        message TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        FOREIGN KEY (course_id) REFERENCES courses(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    isInitialized = true;
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
};

// Save database to localStorage
const saveDatabase = (): void => {
  if (!db) return;
  
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    localStorage.setItem(DB_NAME, buffer.toString('base64'));
  } catch (error) {
    console.error('Failed to save database:', error);
  }
};

// ==================== USER CRUD OPERATIONS ====================

// Create or update user
export const saveUser = async (user: UserProfile): Promise<void> => {
  if (!db) await initDatabase();
  if (!db) throw new Error('Database not initialized');

  try {
    db.run(
      `INSERT OR REPLACE INTO users (id, name, email, created_at) 
       VALUES (?, ?, ?, ?)`,
      [user.id, user.name, user.email, user.createdAt]
    );
    saveDatabase();
    console.log('User saved:', user.id);
  } catch (error) {
    console.error('Failed to save user:', error);
    throw error;
  }
};

// Get current user (assumes single user for now)
export const getCurrentUser = async (): Promise<UserProfile | null> => {
  if (!db) await initDatabase();
  if (!db) throw new Error('Database not initialized');

  try {
    const results = db.exec('SELECT * FROM users LIMIT 1');
    
    if (results.length === 0 || results[0].values.length === 0) {
      return null;
    }

    const row = results[0].values[0];
    return {
      id: row[0] as string,
      name: row[1] as string,
      email: row[2] as string,
      createdAt: row[3] as number
    };
  } catch (error) {
    console.error('Failed to get current user:', error);
    return null;
  }
};

// Get user by ID
export const getUserById = async (userId: string): Promise<UserProfile | null> => {
  if (!db) await initDatabase();
  if (!db) throw new Error('Database not initialized');

  try {
    const results = db.exec('SELECT * FROM users WHERE id = ?', [userId]);
    
    if (results.length === 0 || results[0].values.length === 0) {
      return null;
    }

    const row = results[0].values[0];
    return {
      id: row[0] as string,
      name: row[1] as string,
      email: row[2] as string,
      createdAt: row[3] as number
    };
  } catch (error) {
    console.error('Failed to get user:', error);
    return null;
  }
};

// Delete user and all their data
export const deleteUser = async (userId: string): Promise<void> => {
  if (!db) await initDatabase();
  if (!db) throw new Error('Database not initialized');

  try {
    db.run('DELETE FROM users WHERE id = ?', [userId]);
    db.run('DELETE FROM courses WHERE user_id = ?', [userId]);
    db.run('DELETE FROM chat_history WHERE user_id = ?', [userId]);
    db.run('DELETE FROM course_progress WHERE user_id = ?', [userId]);
    saveDatabase();
    console.log('User deleted:', userId);
  } catch (error) {
    console.error('Failed to delete user:', error);
    throw error;
  }
};

// ==================== COURSE CRUD OPERATIONS ====================

// Save a course
export const saveCourse = async (course: CourseData, userId: string): Promise<void> => {
  if (!db) await initDatabase();
  if (!db) throw new Error('Database not initialized');

  try {
    const id = course.id || generateId();
    const timestamp = course.timestamp || Date.now();
    const dataJson = JSON.stringify(course);

    db.run(
      `INSERT OR REPLACE INTO courses (id, user_id, title, introduction, timestamp, data) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, userId, course.title, course.introduction || '', timestamp, dataJson]
    );

    saveDatabase();
    console.log('Course saved:', id);
  } catch (error) {
    console.error('Failed to save course:', error);
    throw error;
  }
};

// Get all courses
export const getAllCourses = async (): Promise<CourseData[]> => {
  if (!db) await initDatabase();
  if (!db) throw new Error('Database not initialized');

  try {
    const results = db.exec('SELECT data FROM courses ORDER BY timestamp DESC');
    
    if (results.length === 0) return [];

    const courses: CourseData[] = [];
    const rows = results[0].values;

    for (const row of rows) {
      const courseData = JSON.parse(row[0] as string) as CourseData;
      courses.push(courseData);
    }

    return courses;
  } catch (error) {
    console.error('Failed to get courses:', error);
    return [];
  }
};

// Get courses by user ID
export const getCoursesByUserId = async (userId: string): Promise<CourseData[]> => {
  if (!db) await initDatabase();
  if (!db) throw new Error('Database not initialized');

  try {
    const results = db.exec(
      'SELECT data FROM courses WHERE user_id = ? ORDER BY timestamp DESC',
      [userId]
    );
    
    if (results.length === 0) return [];

    const courses: CourseData[] = [];
    const rows = results[0].values;

    for (const row of rows) {
      const courseData = JSON.parse(row[0] as string) as CourseData;
      // Load progress for each course
      const progress = await getCourseProgress(courseData.id!, userId);
      if (progress) {
        courseData.progress = progress;
      }
      courses.push(courseData);
    }

    return courses;
  } catch (error) {
    console.error('Failed to get courses by user:', error);
    return [];
  }
};

// Get a single course by ID
export const getCourse = async (courseId: string): Promise<CourseData | null> => {
  if (!db) await initDatabase();
  if (!db) throw new Error('Database not initialized');

  try {
    const results = db.exec('SELECT data FROM courses WHERE id = ?', [courseId]);
    
    if (results.length === 0 || results[0].values.length === 0) {
      return null;
    }

    const courseData = JSON.parse(results[0].values[0][0] as string) as CourseData;
    return courseData;
  } catch (error) {
    console.error('Failed to get course:', error);
    return null;
  }
};

// Delete a course
export const deleteCourse = async (courseId: string): Promise<void> => {
  if (!db) await initDatabase();
  if (!db) throw new Error('Database not initialized');

  try {
    db.run('DELETE FROM courses WHERE id = ?', [courseId]);
    db.run('DELETE FROM chat_history WHERE course_id = ?', [courseId]);
    db.run('DELETE FROM course_progress WHERE course_id = ?', [courseId]);
    saveDatabase();
    console.log('Course deleted:', courseId);
  } catch (error) {
    console.error('Failed to delete course:', error);
    throw error;
  }
};

// ==================== COURSE PROGRESS OPERATIONS ====================

// Save or update course progress
export const saveCourseProgress = async (progress: CourseProgress): Promise<void> => {
  if (!db) await initDatabase();
  if (!db) throw new Error('Database not initialized');

  try {
    const completedModulesJson = JSON.stringify(progress.completedModules);
    const completedSectionsJson = JSON.stringify(progress.completedSections);

    db.run(
      `INSERT OR REPLACE INTO course_progress 
       (course_id, user_id, completed_modules, completed_sections, last_accessed_at, progress_percentage) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        progress.courseId,
        progress.userId,
        completedModulesJson,
        completedSectionsJson,
        progress.lastAccessedAt,
        progress.progressPercentage
      ]
    );

    saveDatabase();
    console.log('Progress saved for course:', progress.courseId);
  } catch (error) {
    console.error('Failed to save progress:', error);
    throw error;
  }
};

// Get course progress
export const getCourseProgress = async (courseId: string, userId: string): Promise<CourseProgress | null> => {
  if (!db) await initDatabase();
  if (!db) throw new Error('Database not initialized');

  try {
    const results = db.exec(
      'SELECT * FROM course_progress WHERE course_id = ? AND user_id = ?',
      [courseId, userId]
    );
    
    if (results.length === 0 || results[0].values.length === 0) {
      return null;
    }

    const row = results[0].values[0];
    return {
      courseId: row[1] as string,
      userId: row[2] as string,
      completedModules: JSON.parse(row[3] as string),
      completedSections: JSON.parse(row[4] as string),
      lastAccessedAt: row[5] as number,
      progressPercentage: row[6] as number
    };
  } catch (error) {
    console.error('Failed to get progress:', error);
    return null;
  }
};

// Mark section as completed
export const markSectionCompleted = async (
  courseId: string,
  userId: string,
  moduleIndex: number,
  sectionIndex: number,
  totalSections: number
): Promise<void> => {
  if (!db) await initDatabase();
  if (!db) throw new Error('Database not initialized');

  try {
    let progress = await getCourseProgress(courseId, userId);
    
    if (!progress) {
      progress = {
        courseId,
        userId,
        completedModules: [],
        completedSections: [],
        lastAccessedAt: Date.now(),
        progressPercentage: 0
      };
    }

    // Add section to completed list if not already there
    const sectionExists = progress.completedSections.some(
      s => s.moduleIndex === moduleIndex && s.sectionIndex === sectionIndex
    );

    if (!sectionExists) {
      progress.completedSections.push({ moduleIndex, sectionIndex });
      progress.progressPercentage = (progress.completedSections.length / totalSections) * 100;
      progress.lastAccessedAt = Date.now();

      await saveCourseProgress(progress);
    }
  } catch (error) {
    console.error('Failed to mark section completed:', error);
    throw error;
  }
};

// ==================== CHAT OPERATIONS ====================

// Save chat message
export const saveChatMessage = async (
  courseId: string,
  userId: string,
  sender: 'user' | 'ai',
  message: string
): Promise<void> => {
  if (!db) await initDatabase();
  if (!db) throw new Error('Database not initialized');

  try {
    const timestamp = Date.now();
    db.run(
      'INSERT INTO chat_history (course_id, user_id, sender, message, timestamp) VALUES (?, ?, ?, ?, ?)',
      [courseId, userId, sender, message, timestamp]
    );
    saveDatabase();
  } catch (error) {
    console.error('Failed to save chat message:', error);
    throw error;
  }
};

// Get chat history for a course
export const getChatHistory = async (courseId: string, userId: string): Promise<Array<{sender: 'user' | 'ai', text: string}>> => {
  if (!db) await initDatabase();
  if (!db) throw new Error('Database not initialized');

  try {
    const results = db.exec(
      'SELECT sender, message FROM chat_history WHERE course_id = ? AND user_id = ? ORDER BY timestamp ASC',
      [courseId, userId]
    );
    
    if (results.length === 0) return [];

    const messages: Array<{sender: 'user' | 'ai', text: string}> = [];
    const rows = results[0].values;

    for (const row of rows) {
      messages.push({
        sender: row[0] as 'user' | 'ai',
        text: row[1] as string
      });
    }

    return messages;
  } catch (error) {
    console.error('Failed to get chat history:', error);
    return [];
  }
};

// ==================== SEARCH OPERATIONS ====================

// Search courses
export const searchCourses = async (query: string, userId: string): Promise<CourseData[]> => {
  if (!db) await initDatabase();
  if (!db) throw new Error('Database not initialized');

  try {
    const results = db.exec(
      `SELECT data FROM courses 
       WHERE (title LIKE ? OR introduction LIKE ?) AND user_id = ?
       ORDER BY timestamp DESC`,
      [`%${query}%`, `%${query}%`, userId]
    );
    
    if (results.length === 0) return [];

    const courses: CourseData[] = [];
    const rows = results[0].values;

    for (const row of rows) {
      const courseData = JSON.parse(row[0] as string) as CourseData;
      courses.push(courseData);
    }

    return courses;
  } catch (error) {
    console.error('Failed to search courses:', error);
    return [];
  }
};

// ==================== UTILITY FUNCTIONS ====================

// Helper function to generate unique IDs
const generateId = (): string => {
  return `course_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const generateUserId = (): string => {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Export database statistics
export const getDatabaseStats = async (): Promise<{
  totalCourses: number;
  totalMessages: number;
  databaseSize: number;
}> => {
  if (!db) await initDatabase();
  if (!db) throw new Error('Database not initialized');

  try {
    const coursesResult = db.exec('SELECT COUNT(*) FROM courses');
    const messagesResult = db.exec('SELECT COUNT(*) FROM chat_history');
    
    const savedDb = localStorage.getItem(DB_NAME);
    const databaseSize = savedDb ? savedDb.length : 0;

    return {
      totalCourses: coursesResult[0]?.values[0][0] as number || 0,
      totalMessages: messagesResult[0]?.values[0][0] as number || 0,
      databaseSize
    };
  } catch (error) {
    console.error('Failed to get database stats:', error);
    return { totalCourses: 0, totalMessages: 0, databaseSize: 0 };
  }
};

// Clear all data (for testing/reset)
export const clearDatabase = async (): Promise<void> => {
  if (!db) await initDatabase();
  if (!db) throw new Error('Database not initialized');

  try {
    db.run('DELETE FROM courses');
    db.run('DELETE FROM chat_history');
    saveDatabase();
    console.log('Database cleared');
  } catch (error) {
    console.error('Failed to clear database:', error);
    throw error;
  }
};
