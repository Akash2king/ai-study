
import React, { useState, useRef, useEffect } from 'react';
import { generateCourse, startChatSession, sendMessageToChat } from '../services/geminiService';
import { CourseData, ChatMessage, CodeSnippet } from '../types';
import LoadingSpinner from './LoadingSpinner';
import SparklesIcon from './icons/SparklesIcon';
import SendIcon from './icons/SendIcon';
import { useStudyContext } from '../contexts/StudyContext';
import TrashIcon from './icons/TrashIcon';
import ClipboardIcon from './icons/ClipboardIcon';

const CodeBlock: React.FC<{ snippet: CodeSnippet }> = ({ snippet }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(snippet.code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

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

const CourseGenerator: React.FC = () => {
    const [topic, setTopic] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [courseData, setCourseData] = useState<CourseData | null>(null);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [userMessage, setUserMessage] = useState('');
    const [isChatLoading, setIsChatLoading] = useState(false);
    const [selectionPopup, setSelectionPopup] = useState<{ x: number; y: number; text: string } | null>(null);
    const [showSavedCourses, setShowSavedCourses] = useState(false);

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
            const data = await generateCourse(topic);
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

    const loadSavedCourse = (course: CourseData) => {
        setCourseData(course);
        startChatSession(course);
        setChatMessages([]);
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

        try {
            const aiResponse = await sendMessageToChat(userMessage);
            const newAiMessage: ChatMessage = { sender: 'ai', text: aiResponse };
            setChatMessages(prev => [...prev, newAiMessage]);
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
                    {savedCourses.length > 0 && (
                        <button 
                            onClick={() => setShowSavedCourses(true)} 
                            className="text-sm text-blue-400 hover:text-blue-300 flex items-center"
                        >
                            View Saved Courses ({savedCourses.length})
                        </button>
                    )}
                </div>
                <form onSubmit={handleGenerateCourse} className="flex gap-4">
                    <input
                        type="text"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="e.g., 'Python for Beginners' or 'Advanced React Patterns'"
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
                </form>
            </div>

            <div className="flex-grow flex-1 bg-gray-800 rounded-lg overflow-hidden flex border border-gray-700">
                {isLoading && <div className="w-full flex items-center justify-center flex-col"><LoadingSpinner /><p className="mt-4 text-gray-400">Generating course structure...</p></div>}
                {error && <div className="w-full flex items-center justify-center text-red-400 p-4">{error}</div>}
                {!isLoading && !error && !courseData && <div className="w-full flex items-center justify-center"><WelcomeScreen /></div>}
                
                {courseData && (
                    <>
                        <div 
                            ref={courseContentRef}
                            onMouseUp={handleTextSelection}
                            className="relative w-2/3 overflow-y-auto p-8 prose prose-invert prose-headings:text-blue-300 prose-h2:text-2xl prose-h3:text-xl max-w-none"
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
                                <h1 className="text-4xl font-bold mb-4 flex-grow">{courseData.title}</h1>
                                <button 
                                    onClick={handleSaveCourse}
                                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors ml-4"
                                >
                                    <SparklesIcon className="w-4 h-4" />
                                    Save & Track
                                </button>
                            </div>
                            <div dangerouslySetInnerHTML={{ __html: courseData.introduction }} />
                            
                            {courseData.modules.map((module, moduleIndex) => (
                                <div key={moduleIndex} className="mt-10">
                                    <h2 className="font-bold border-b border-gray-600 pb-2 mb-4">{`Module ${moduleIndex + 1}: ${module.moduleTitle}`}</h2>
                                    {module.sections.map((section, sectionIndex) => (
                                        <div key={sectionIndex} className="mt-8">
                                            <h3 className="font-semibold">{section.heading}</h3>
                                            <div dangerouslySetInnerHTML={{ __html: section.content }} className="my-4" />
                                            {section.codeSnippet && <CodeBlock snippet={section.codeSnippet} />}
                                        </div>
                                    ))}
                                </div>
                            ))}
                            
                            <h2 className="text-2xl font-semibold border-b border-gray-600 pb-2 mt-12 mb-4">Video Lessons</h2>
                            <div className="space-y-6">
                                {courseData.videoSuggestions.map((video, index) => (
                                    <div key={index}>
                                        <h3 className="font-semibold text-lg mb-2">{video.title}</h3>
                                        {video.videoId ? (
                                             <div className="w-full aspect-video">
                                                <iframe 
                                                    src={`https://www.youtube.com/embed/${video.videoId}`}
                                                    title={video.title}
                                                    frameBorder="0" 
                                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                                    allowFullScreen
                                                    className="w-full h-full rounded-lg"
                                                ></iframe>
                                            </div>
                                        ) : (
                                            <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(video.query)}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                                                Search for "{video.title}" on YouTube
                                            </a>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <h2 className="text-2xl font-semibold border-b border-gray-600 pb-2 mt-12 mb-4">References</h2>
                             <ul className="list-disc pl-5 space-y-2">
                                {courseData.references.map((ref, index) => (
                                    <li key={index}>
                                        <a href={ref.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{ref.title}</a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="w-1/3 border-l border-gray-700 flex flex-col bg-gray-800">
                            <div className="p-4 border-b border-gray-700">
                                <h3 className="text-lg font-semibold">Interactive Assistant</h3>
                                <p className="text-sm text-gray-400">Ask follow-up questions about the course.</p>
                            </div>
                            <div ref={chatContainerRef} className="flex-grow p-4 space-y-4 overflow-y-auto">
                                {chatMessages.map((msg, index) => (
                                    <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`rounded-lg px-4 py-2 max-w-xs ${msg.sender === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-200'}`}>
                                            {msg.text}
                                        </div>
                                    </div>
                                ))}
                                {isChatLoading && <div className="flex justify-start"><div className="rounded-lg px-4 py-2 bg-gray-700 text-gray-200">...</div></div>}
                            </div>
                            <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-700 flex items-center gap-2">
                                <input
                                    ref={chatInputRef}
                                    type="text"
                                    value={userMessage}
                                    onChange={(e) => setUserMessage(e.target.value)}
                                    placeholder="Ask a question..."
                                    className="flex-grow bg-gray-700 border-gray-600 rounded-full py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    disabled={isChatLoading}
                                />
                                <button type="submit" className="bg-blue-600 p-2 rounded-full hover:bg-blue-700 disabled:bg-gray-600" disabled={!userMessage.trim() || isChatLoading}>
                                    <SendIcon className="w-5 h-5 text-white" />
                                </button>
                            </form>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default CourseGenerator;
