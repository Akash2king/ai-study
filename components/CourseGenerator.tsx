
import React, { useState, useRef, useEffect } from 'react';
import { generateCourse, startChatSession, sendMessageToChat, testConnection, continueGeneration } from '../services/openaiService';
import { CourseData, ChatMessage, CodeSnippet } from '../types';
import LoadingSpinner from './LoadingSpinner';
import SparklesIcon from './icons/SparklesIcon';
import SendIcon from './icons/SendIcon';
import { useStudyContext } from '../contexts/StudyContext';
import TrashIcon from './icons/TrashIcon';
import ClipboardIcon from './icons/ClipboardIcon';
import * as db from '../services/databaseService';

const CodeBlock: React.FC<{ snippet: CodeSnippet }> = ({ snippet }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(snippet.code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Don't render if there's no code
    if (!snippet.code || snippet.code.trim().length === 0) {
        return null;
    }

    return (
        <div className="my-6 rounded-lg overflow-hidden bg-gray-900 border border-gray-700 shadow-lg">
            <div className="flex justify-between items-center bg-gray-800 px-4 py-2 border-b border-gray-700">
                <span className="text-xs font-mono text-blue-400 uppercase tracking-wider">{snippet.language}</span>
                <button 
                    onClick={handleCopy}
                    className="flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors"
                >
                    {copied ? (
                        <span className="text-green-400">Copied!</span>
                    ) : (
                        <>
                            <ClipboardIcon className="w-3 h-3" />
                            Copy
                        </>
                    )}
                </button>
            </div>
            <div className="p-4 overflow-x-auto">
                <pre className="text-sm font-mono text-gray-200 leading-relaxed">
                    <code>{snippet.code}</code>
                </pre>
            </div>
            {snippet.description && (
                <div className="bg-gray-800/50 px-4 py-2 text-xs text-gray-400 border-t border-gray-700/50 italic">
                    {snippet.description}
                </div>
            )}
        </div>
    );
};

interface CourseGeneratorProps {
    userId: string;
    initialCourse?: CourseData | null;
}

const CourseGenerator: React.FC<CourseGeneratorProps> = ({ userId, initialCourse }) => {
    const [topic, setTopic] = useState('');
    const [programmingLanguage, setProgrammingLanguage] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [courseData, setCourseData] = useState<CourseData | null>(initialCourse || null);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [userMessage, setUserMessage] = useState('');
    const [isChatLoading, setIsChatLoading] = useState(false);
    const [selectionPopup, setSelectionPopup] = useState<{ x: number; y: number; text: string } | null>(null);
    const [showSavedCourses, setShowSavedCourses] = useState(false);
    const [testStatus, setTestStatus] = useState<string | null>(null);
    const [isTesting, setIsTesting] = useState(false);
    const [isContinuing, setIsContinuing] = useState(false);
    const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set([0]));
    const [selectedSection, setSelectedSection] = useState<{ moduleIndex: number; sectionIndex: number } | null>(null);
    const [showLeftSidebar, setShowLeftSidebar] = useState(true);
    const [showRightSidebar, setShowRightSidebar] = useState(true);

    const { saveCourse, savedCourses, deleteCourse } = useStudyContext();

    const chatContainerRef = useRef<HTMLDivElement>(null);
    const courseContentRef = useRef<HTMLDivElement>(null);
    const chatInputRef = useRef<HTMLInputElement>(null);

    // Load most recent course from local storage if no current course
    useEffect(() => {
        try {
            const localCourse = localStorage.getItem('ai-study-assistant-course');
            if (localCourse && !courseData) {
                const course: CourseData = JSON.parse(localCourse);
                setCourseData(course);
                startChatSession(course);
            }
        } catch (error) {
            console.error("Failed to load course from local storage", error);
        }
    }, []);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [chatMessages]);

    const handleGenerateCourse = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!topic.trim()) return;
        setIsLoading(true);
        setError(null);
        setCourseData(null);
        setChatMessages([]);
        setSelectionPopup(null);

        try {
            // Include programming language in the topic if selected
            const fullTopic = programmingLanguage 
                ? `${topic} (using ${programmingLanguage} programming language)` 
                : topic;
            const data = await generateCourse(fullTopic);
            setCourseData(data);
            startChatSession(data);
            localStorage.setItem('ai-study-assistant-course', JSON.stringify(data));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveCourse = () => {
        if (courseData) {
            saveCourse(courseData);
            alert(`"${courseData.title}" saved! Added to Subjects and Tasks.`);
        }
    };

    const handleTestConnection = async () => {
        setIsTesting(true);
        setTestStatus(null);
        setError(null);
        
        try {
            const result = await testConnection();
            setTestStatus(`✓ ${result}`);
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Connection test failed';
            setTestStatus(`✗ ${msg}`);
        } finally {
            setIsTesting(false);
        }
    };

    const handleContinueGeneration = async (type: 'new-modules' | 'expand-sections') => {
        if (!courseData) return;
        
        setIsContinuing(true);
        setError(null);
        
        try {
            const expandedCourse = await continueGeneration(courseData, type);
            setCourseData(expandedCourse);
            localStorage.setItem('ai-study-assistant-course', JSON.stringify(expandedCourse));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to continue generation');
        } finally {
            setIsContinuing(false);
        }
    };

    const loadSavedCourse = async (course: CourseData) => {
        setCourseData(course);
        startChatSession(course);
        
        // Load chat history from database
        if (course.id) {
            try {
                const history = await db.getChatHistory(course.id, userId);
                setChatMessages(history);
            } catch (error) {
                console.error('Failed to load chat history:', error);
                setChatMessages([]);
            }
        } else {
            setChatMessages([]);
        }
        
        localStorage.setItem('ai-study-assistant-course', JSON.stringify(course));
        setShowSavedCourses(false);
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userMessage.trim() || !courseData) return;
        
        const newUserMessage: ChatMessage = { sender: 'user', text: userMessage };
        setChatMessages(prev => [...prev, newUserMessage]);
        setUserMessage('');
        setIsChatLoading(true);

        // Save user message to database
        if (courseData.id) {
            try {
                await db.saveChatMessage(courseData.id, userId, 'user', userMessage);
            } catch (error) {
                console.error('Failed to save user message:', error);
            }
        }

        try {
            const aiResponse = await sendMessageToChat(userMessage);
            const newAiMessage: ChatMessage = { sender: 'ai', text: aiResponse };
            setChatMessages(prev => [...prev, newAiMessage]);
            
            // Save AI response to database
            if (courseData.id) {
                try {
                    await db.saveChatMessage(courseData.id, userId, 'ai', aiResponse);
                } catch (error) {
                    console.error('Failed to save AI message:', error);
                }
            }
        } catch (err) {
            const errorMessage: ChatMessage = { sender: 'ai', text: err instanceof Error ? err.message : 'An error occurred.' };
            setChatMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsChatLoading(false);
        }
    };

    const handleTextSelection = () => {
        const selection = window.getSelection();
        if (selection && selection.toString().trim().length > 5 && courseContentRef.current) {
            const text = selection.toString().trim();
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            const containerRect = courseContentRef.current.getBoundingClientRect();

            const x = rect.left - containerRect.left + rect.width / 2;
            const y = rect.top - containerRect.top + courseContentRef.current.scrollTop - 40;

            setSelectionPopup({ x, y, text });
        } else {
            setSelectionPopup(null);
        }
    };

    const handleAskAboutSelection = () => {
        if (!selectionPopup) return;
        const question = `Can you explain this part in more detail: "${selectionPopup.text}"`;
        setUserMessage(question);
        setSelectionPopup(null);
        chatInputRef.current?.focus();
    };

    const toggleModule = (moduleIndex: number) => {
        const newExpanded = new Set(expandedModules);
        if (newExpanded.has(moduleIndex)) {
            newExpanded.delete(moduleIndex);
        } else {
            newExpanded.add(moduleIndex);
        }
        setExpandedModules(newExpanded);
    };

    const selectSection = (moduleIndex: number, sectionIndex: number) => {
        setSelectedSection({ moduleIndex, sectionIndex });
    };

    const getPreviousSection = (moduleIndex: number, sectionIndex: number) => {
        if (sectionIndex > 0) {
            return { moduleIndex, sectionIndex: sectionIndex - 1 };
        } else if (moduleIndex > 0) {
            const prevModule = courseData!.modules[moduleIndex - 1];
            return { moduleIndex: moduleIndex - 1, sectionIndex: prevModule.sections.length - 1 };
        }
        return null;
    };

    const getNextSection = (moduleIndex: number, sectionIndex: number) => {
        const currentModule = courseData!.modules[moduleIndex];
        if (sectionIndex < currentModule.sections.length - 1) {
            return { moduleIndex, sectionIndex: sectionIndex + 1 };
        } else if (moduleIndex < courseData!.modules.length - 1) {
            return { moduleIndex: moduleIndex + 1, sectionIndex: 0 };
        }
        return null;
    };
    
    const WelcomeScreen = () => (
        <div className="text-center p-8">
            <SparklesIcon className="w-16 h-16 mx-auto text-blue-400 mb-4" />
            <h1 className="text-4xl font-bold text-white mb-2">AI Course Generator</h1>
            <p className="text-lg text-gray-400">Enter any topic to generate a complete, structured course in seconds.</p>
            
            {savedCourses.length > 0 && (
                <div className="mt-8">
                    <h2 className="text-xl font-semibold text-gray-300 mb-4">Your Saved Courses</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                        {savedCourses.map(course => (
                            <div key={course.id} className="bg-gray-700 p-4 rounded-lg flex justify-between items-center hover:bg-gray-600 transition-colors cursor-pointer" onClick={() => loadSavedCourse(course)}>
                                <span className="font-medium truncate mr-2">{course.title}</span>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); deleteCourse(course.id!); }}
                                    className="p-2 text-gray-400 hover:text-red-400"
                                >
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <div className="h-full flex flex-col p-6 space-y-6 relative">
             {/* Saved Courses Toggle/Overlay */}
             {showSavedCourses && (
                <div className="absolute inset-0 bg-gray-900/95 z-50 flex items-center justify-center p-12">
                    <div className="bg-gray-800 rounded-lg p-6 w-full max-w-3xl h-3/4 flex flex-col shadow-2xl border border-gray-700">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-white">Saved Courses</h2>
                            <button onClick={() => setShowSavedCourses(false)} className="text-gray-400 hover:text-white">Close</button>
                        </div>
                        <div className="overflow-y-auto space-y-3">
                            {savedCourses.length === 0 ? (
                                <p className="text-gray-500 text-center">No saved courses yet.</p>
                            ) : (
                                savedCourses.map(course => (
                                    <div key={course.id} className="bg-gray-700 p-4 rounded-lg flex justify-between items-center">
                                        <div className="cursor-pointer flex-grow" onClick={() => loadSavedCourse(course)}>
                                            <h3 className="font-bold text-lg">{course.title}</h3>
                                            <p className="text-sm text-gray-400">{course.modules.length} Modules</p>
                                        </div>
                                        <button onClick={() => deleteCourse(course.id!)} className="p-2 text-red-400 hover:bg-gray-600 rounded">
                                            <TrashIcon />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="flex-shrink-0 flex flex-col gap-4">
                 <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-200">Create & Learn</h2>
                    <div className="flex gap-3 items-center">
                        <button 
                            onClick={handleTestConnection}
                            disabled={isTesting}
                            className="text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                        >
                            {isTesting ? 'Testing...' : 'Test API'}
                        </button>
                        {savedCourses.length > 0 && (
                            <button 
                                onClick={() => setShowSavedCourses(true)} 
                                className="text-sm text-blue-400 hover:text-blue-300 flex items-center"
                            >
                                View Saved Courses ({savedCourses.length})
                            </button>
                        )}
                    </div>
                </div>
                {testStatus && (
                    <div className={`text-sm px-4 py-2 rounded-lg ${testStatus.startsWith('✓') ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                        {testStatus}
                    </div>
                )}
                <form onSubmit={handleGenerateCourse} className="flex flex-col gap-4">
                    <div className="flex gap-4">
                        <select
                            value={programmingLanguage}
                            onChange={(e) => setProgrammingLanguage(e.target.value)}
                            className="bg-gray-800 border border-gray-700 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-200 min-w-[180px]"
                            disabled={isLoading}
                        >
                            <option value="">General Course</option>
                            <option value="Python">Python</option>
                            <option value="JavaScript">JavaScript</option>
                            <option value="TypeScript">TypeScript</option>
                            <option value="Java">Java</option>
                            <option value="C++">C++</option>
                            <option value="C#">C#</option>
                            <option value="Go">Go</option>
                            <option value="Rust">Rust</option>
                            <option value="PHP">PHP</option>
                            <option value="Ruby">Ruby</option>
                            <option value="Swift">Swift</option>
                            <option value="Kotlin">Kotlin</option>
                            <option value="SQL">SQL</option>
                            <option value="R">R</option>
                            <option value="MATLAB">MATLAB</option>
                        </select>
                        <input
                            type="text"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="e.g., 'Web Development Basics' or 'Machine Learning'"
                            className="flex-grow bg-gray-800 border border-gray-700 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            disabled={isLoading}
                        />
                        <button
                            type="submit"
                            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center whitespace-nowrap"
                            disabled={isLoading || !topic.trim()}
                        >
                            {isLoading ? 'Generating...' : 'Generate Course'}
                        </button>
                    </div>
                    {programmingLanguage && (
                        <div className="text-sm text-gray-400 px-1">
                            <span className="text-blue-400">Language:</span> {programmingLanguage} • Course will include {programmingLanguage}-specific examples and code
                        </div>
                    )}
                </form>
            </div>

            <div className="flex-grow flex-1 bg-gray-800 rounded-lg overflow-hidden flex border border-gray-700">
                {isLoading && <div className="w-full flex items-center justify-center flex-col"><LoadingSpinner /><p className="mt-4 text-gray-400">Generating course structure...</p></div>}
                {error && <div className="w-full flex items-center justify-center text-red-400 p-4">{error}</div>}
                {!isLoading && !error && !courseData && <div className="w-full flex items-center justify-center"><WelcomeScreen /></div>}
                
                {courseData && (
                    <>
                        {/* Left Sidebar - File Tree + Videos */}
                        {showLeftSidebar && (
                            <div className="w-80 border-r border-gray-700 flex flex-col bg-gray-800/50">
                                {/* Close button */}
                                <div className="flex justify-end p-2 border-b border-gray-700">
                                    <button
                                        onClick={() => setShowLeftSidebar(false)}
                                        className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-gray-400 hover:text-white"
                                        title="Hide sidebar"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                                        </svg>
                                    </button>
                                </div>
                                {/* File Tree Navigation */}
                                <div className="flex-1 overflow-y-auto p-4">
                                <div className="mb-6">
                                    <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                        <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                        </svg>
                                        {courseData.title}
                                    </h2>
                                    
                                    {/* Course Modules as Tree */}
                                    <div className="space-y-1">
                                        {courseData.modules.map((module, moduleIndex) => (
                                            <div key={moduleIndex}>
                                                {/* Module Folder */}
                                                <button
                                                    onClick={() => toggleModule(moduleIndex)}
                                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-700/50 rounded-lg transition-colors text-left group"
                                                >
                                                    <svg 
                                                        className={`w-4 h-4 text-gray-400 transition-transform ${expandedModules.has(moduleIndex) ? 'rotate-90' : ''}`} 
                                                        fill="none" 
                                                        stroke="currentColor" 
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                    </svg>
                                                    <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                                                        <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                                                    </svg>
                                                    <span className="text-gray-200 group-hover:text-white font-medium truncate">
                                                        Module {moduleIndex + 1}
                                                    </span>
                                                </button>
                                                
                                                {/* Sections inside Module */}
                                                {expandedModules.has(moduleIndex) && (
                                                    <div className="ml-6 mt-1 space-y-1">
                                                        {module.sections.map((section, sectionIndex) => (
                                                            <button
                                                                key={sectionIndex}
                                                                onClick={() => selectSection(moduleIndex, sectionIndex)}
                                                                className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors text-left ${
                                                                    selectedSection?.moduleIndex === moduleIndex && selectedSection?.sectionIndex === sectionIndex
                                                                        ? 'bg-blue-600/20 text-blue-300'
                                                                        : 'hover:bg-gray-700/50 text-gray-300'
                                                                }`}
                                                            >
                                                                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                                </svg>
                                                                <span className="truncate text-xs">{section.heading}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Video Section */}
                                <div className="mt-8 pt-6 border-t border-gray-700">
                                    <h3 className="text-sm font-bold text-gray-400 mb-3 uppercase tracking-wide">Video Resources</h3>
                                    <div className="space-y-3">
                                        {(!courseData.videoSuggestions || courseData.videoSuggestions.length === 0) ? (
                                            <div className="bg-gray-900/50 rounded-lg border border-gray-700 p-4 text-center">
                                                <p className="text-sm text-gray-400">No video resources available for this course.</p>
                                            </div>
                                        ) : (
                                            courseData.videoSuggestions.map((video, index) => (
                                                <div key={index} className="bg-gray-900/50 rounded-lg overflow-hidden border border-gray-700 hover:border-blue-500/30 transition-all">
                                                    {video.videoId && video.videoId.length === 11 ? (
                                                    <>
                                                        <div className="aspect-video">
                                                            <iframe 
                                                                src={`https://www.youtube.com/embed/${video.videoId}`}
                                                                title={video.title}
                                                                frameBorder="0" 
                                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                                                allowFullScreen
                                                                className="w-full h-full"
                                                            />
                                                        </div>
                                                        <div className="p-2">
                                                            <p className="text-xs text-gray-300 truncate">{video.title}</p>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <a 
                                                        href={`https://www.youtube.com/results?search_query=${encodeURIComponent(video.query || video.title)}`} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="block p-4 hover:bg-gray-700/50 transition-colors group"
                                                    >
                                                        <div className="flex items-start gap-3">
                                                            <div className="flex-shrink-0 w-10 h-10 bg-red-600/20 rounded-lg flex items-center justify-center group-hover:bg-red-600/30 transition-colors">
                                                                <svg className="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                                                                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                                                                </svg>
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm text-gray-200 mb-1 line-clamp-2 group-hover:text-white transition-colors">{video.title}</p>
                                                                <div className="flex items-center gap-1 text-xs text-blue-400 group-hover:text-blue-300">
                                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                                    </svg>
                                                                    <span>Search on YouTube</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </a>
                                                )}
                                            </div>
                                        )))}
                                    </div>
                                </div>
                            </div>
                        </div>
                        )}

                        {/* Toggle button for left sidebar when hidden */}
                        {!showLeftSidebar && (
                            <button
                                onClick={() => setShowLeftSidebar(true)}
                                className="fixed left-4 top-1/2 -translate-y-1/2 z-50 p-3 bg-gray-800 hover:bg-gray-700 rounded-lg shadow-lg transition-colors border border-gray-600"
                                title="Show sidebar"
                            >
                                <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                                </svg>
                            </button>
                        )}

                        {/* Main Content Area */}
                        <div 
                            ref={courseContentRef}
                            onMouseUp={handleTextSelection}
                            className="relative flex-1 overflow-y-auto p-8 bg-gray-900"
                        >
                            {selectionPopup && (
                                <button
                                    onClick={handleAskAboutSelection}
                                    style={{ top: `${selectionPopup.y}px`, left: `${selectionPopup.x}px`, transform: 'translateX(-50%)' }}
                                    className="absolute z-10 bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-500 transition-transform duration-150 ease-in-out"
                                    aria-label="Ask about selected text"
                                >
                                    <SparklesIcon className="w-5 h-5" />
                                </button>
                            )}

                            <div className="flex justify-between items-start mb-6">
                                <h1 className="text-4xl font-bold mb-4 flex-grow text-white">{courseData.title}</h1>
                                <div className="flex gap-3 ml-4">
                                    <button 
                                        onClick={handleSaveCourse}
                                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-lg hover:shadow-green-500/20"
                                    >
                                        <SparklesIcon className="w-4 h-4" />
                                        Save & Track
                                    </button>
                                    {!isContinuing && (
                                        <div className="relative group">
                                            <button 
                                                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-lg hover:shadow-purple-500/20"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                                </svg>
                                                Continue
                                            </button>
                                            <div className="absolute top-full right-0 mt-2 w-56 bg-gray-800 rounded-lg shadow-xl border border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                                                <button
                                                    onClick={() => handleContinueGeneration('new-modules')}
                                                    className="w-full text-left px-4 py-3 hover:bg-gray-700 text-white text-sm transition-colors rounded-t-lg"
                                                >
                                                    <div className="font-semibold">Add New Modules</div>
                                                    <div className="text-xs text-gray-400 mt-1">Generate 3-4 advanced modules</div>
                                                </button>
                                                <button
                                                    onClick={() => handleContinueGeneration('expand-sections')}
                                                    className="w-full text-left px-4 py-3 hover:bg-gray-700 text-white text-sm transition-colors rounded-b-lg border-t border-gray-700"
                                                >
                                                    <div className="font-semibold">Expand Existing</div>
                                                    <div className="text-xs text-gray-400 mt-1">Add more sections to each module</div>
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    {isContinuing && (
                                        <div className="flex items-center gap-2 bg-purple-600 text-white px-5 py-2.5 rounded-lg text-sm">
                                            <LoadingSpinner />
                                            <span>Expanding...</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Display selected section or introduction */}
                            {selectedSection ? (
                                <div className="prose prose-invert prose-headings:text-blue-300 prose-h2:text-2xl prose-h3:text-xl prose-p:text-gray-300 prose-p:leading-relaxed max-w-none">
                                    <div className="mb-6">
                                        <div className="text-sm text-gray-500 mb-2">
                                            Module {selectedSection.moduleIndex + 1} / Section {selectedSection.sectionIndex + 1}
                                        </div>
                                        <h2 className="text-3xl font-bold text-blue-300 mb-2">
                                            {courseData.modules[selectedSection.moduleIndex].moduleTitle}
                                        </h2>
                                        <h3 className="text-xl font-semibold text-blue-200">
                                            {courseData.modules[selectedSection.moduleIndex].sections[selectedSection.sectionIndex].heading}
                                        </h3>
                                    </div>
                                    
                                    <div 
                                        className="text-gray-300 leading-relaxed"
                                        dangerouslySetInnerHTML={{ 
                                            __html: courseData.modules[selectedSection.moduleIndex].sections[selectedSection.sectionIndex].content 
                                        }} 
                                    />
                                    
                                    {courseData.modules[selectedSection.moduleIndex].sections[selectedSection.sectionIndex].codeSnippet && (
                                        <CodeBlock snippet={courseData.modules[selectedSection.moduleIndex].sections[selectedSection.sectionIndex].codeSnippet!} />
                                    )}

                                    {/* Section Resources */}
                                    {courseData.modules[selectedSection.moduleIndex].sections[selectedSection.sectionIndex].resources && 
                                     courseData.modules[selectedSection.moduleIndex].sections[selectedSection.sectionIndex].resources!.length > 0 && (
                                        <div className="mt-8 p-6 bg-gray-800/50 border border-gray-700 rounded-lg">
                                            <h4 className="text-lg font-semibold text-blue-300 mb-4 flex items-center gap-2">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                </svg>
                                                Learning Resources
                                            </h4>
                                            <div className="space-y-3">
                                                {courseData.modules[selectedSection.moduleIndex].sections[selectedSection.sectionIndex].resources!.map((resource, idx) => (
                                                    <a 
                                                        key={idx}
                                                        href={resource.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="block p-4 bg-gray-900/50 hover:bg-gray-900 border border-gray-700 hover:border-blue-500 rounded-lg transition-all group"
                                                    >
                                                        <div className="flex items-start gap-3">
                                                            <div className="mt-1">
                                                                {resource.type === 'video' && (
                                                                    <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 24 24">
                                                                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                                                                    </svg>
                                                                )}
                                                                {resource.type === 'article' && (
                                                                    <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                                    </svg>
                                                                )}
                                                                {resource.type === 'image' && (
                                                                    <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                                    </svg>
                                                                )}
                                                                {resource.type === 'documentation' && (
                                                                    <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                                                    </svg>
                                                                )}
                                                            </div>
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-sm font-medium text-blue-300 group-hover:text-blue-200">
                                                                        {resource.title}
                                                                    </span>
                                                                    <svg className="w-4 h-4 text-gray-500 group-hover:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                                    </svg>
                                                                </div>
                                                                {resource.description && (
                                                                    <p className="text-xs text-gray-400 mt-1">{resource.description}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Mark as Complete and Navigation buttons */}
                                    <div className="flex justify-between items-center mt-12 pt-6 border-t border-gray-700">
                                        <button
                                            onClick={() => {
                                                const prevSection = getPreviousSection(selectedSection.moduleIndex, selectedSection.sectionIndex);
                                                if (prevSection) selectSection(prevSection.moduleIndex, prevSection.sectionIndex);
                                            }}
                                            disabled={!getPreviousSection(selectedSection.moduleIndex, selectedSection.sectionIndex)}
                                            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed text-gray-300 rounded-lg transition-colors"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                            </svg>
                                            Previous
                                        </button>
                                        
                                        <button
                                            onClick={async () => {
                                                if (!courseData || !courseData.id) return;
                                                const totalSections = courseData.modules.reduce((acc, mod) => acc + mod.sections.length, 0);
                                                try {
                                                    await db.markSectionCompleted(
                                                        courseData.id,
                                                        userId,
                                                        selectedSection.moduleIndex,
                                                        selectedSection.sectionIndex,
                                                        totalSections
                                                    );
                                                    
                                                    // Move to next section
                                                    const nextSection = getNextSection(selectedSection.moduleIndex, selectedSection.sectionIndex);
                                                    if (nextSection) selectSection(nextSection.moduleIndex, nextSection.sectionIndex);
                                                } catch (error) {
                                                    console.error('Failed to mark section as complete:', error);
                                                }
                                            }}
                                            className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            Complete & Continue
                                        </button>

                                        <button
                                            onClick={() => {
                                                const nextSection = getNextSection(selectedSection.moduleIndex, selectedSection.sectionIndex);
                                                if (nextSection) selectSection(nextSection.moduleIndex, nextSection.sectionIndex);
                                            }}
                                            disabled={!getNextSection(selectedSection.moduleIndex, selectedSection.sectionIndex)}
                                            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed text-gray-300 rounded-lg transition-colors"
                                        >
                                            Next
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="prose prose-invert prose-headings:text-blue-300 prose-h1:text-3xl prose-p:text-gray-300 prose-p:leading-relaxed max-w-none">
                                    <div className="text-gray-300 leading-relaxed mb-8" dangerouslySetInnerHTML={{ __html: courseData.introduction }} />
                                    
                                    <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-6 mt-8">
                                        <p className="text-blue-200 text-center">
                                            👈 Select a section from the left sidebar to begin learning
                                        </p>
                                    </div>

                                    <h2 className="text-2xl font-semibold border-b border-gray-600 pb-2 mt-12 mb-6">Course References</h2>
                                    <div className="space-y-3">
                                        {courseData.references.map((ref, index) => (
                                            <div key={index} className="bg-gray-800/50 p-4 rounded-lg border border-gray-700 hover:border-blue-500/50 transition-colors">
                                                <a href={ref.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
                                                    {ref.title}
                                                </a>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right Sidebar - Chat */}
                        {showRightSidebar && (
                            <div className="w-1/3 border-l border-gray-700 flex flex-col bg-gray-800/50 backdrop-blur">
                                <div className="p-5 border-b border-gray-700 bg-gray-800 flex justify-between items-center">
                                    <div>
                                        <h3 className="text-lg font-semibold text-white">Interactive Assistant</h3>
                                        <p className="text-sm text-gray-400 mt-1">Ask follow-up questions about the course.</p>
                                    </div>
                                    <button
                                        onClick={() => setShowRightSidebar(false)}
                                        className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-gray-400 hover:text-white"
                                        title="Hide chat"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                                        </svg>
                                    </button>
                                </div>
                            <div ref={chatContainerRef} className="flex-grow p-5 space-y-4 overflow-y-auto">{" "}
                                {chatMessages.map((msg, index) => (
                                    <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`rounded-xl px-4 py-3 max-w-xs shadow-md ${msg.sender === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-100'}`}>
                                            {msg.text}
                                        </div>
                                    </div>
                                ))}
                                {isChatLoading && <div className="flex justify-start"><div className="rounded-xl px-4 py-3 bg-gray-700 text-gray-200 animate-pulse">Thinking...</div></div>}
                            </div>
                            <form onSubmit={handleSendMessage} className="p-5 border-t border-gray-700 flex items-center gap-3 bg-gray-800">
                                <input
                                    ref={chatInputRef}
                                    type="text"
                                    value={userMessage}
                                    onChange={(e) => setUserMessage(e.target.value)}
                                    placeholder="Ask a question..."
                                    className="flex-grow bg-gray-700 border-gray-600 rounded-full py-2.5 px-5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400"
                                    disabled={isChatLoading}
                                />
                                <button 
                                    type="submit" 
                                    className="bg-blue-600 p-3 rounded-full hover:bg-blue-700 disabled:bg-gray-600 transition-colors shadow-lg hover:shadow-blue-500/20" 
                                    disabled={!userMessage.trim() || isChatLoading}
                                    title="Send message"
                                    aria-label="Send message"
                                >
                                    <SendIcon className="w-5 h-5 text-white" />
                                </button>
                            </form>
                        </div>
                        )}
                        {!showRightSidebar && (
                            <button
                                onClick={() => setShowRightSidebar(true)}
                                className="fixed right-4 top-1/2 transform -translate-y-1/2 p-3 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 transition-all shadow-lg z-50"
                                title="Show chat"
                            >
                                <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                </svg>
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default CourseGenerator;
